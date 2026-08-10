-- ============================================================
-- WAREHOUSE STAFF CREATION FIX
-- Ensures atomic creation, proper constraints, and data integrity
-- ============================================================

-- -------------------------------------------------------------------
-- 1. ENSURE PROFILES.EMAIL HAS UNIQUE CONSTRAINT
-- -------------------------------------------------------------------
-- This prevents duplicate emails at the database level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass 
    AND conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 2. ENSURE PROFILES.USER_TYPE CHECK CONSTRAINT
-- -------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'profiles'::regclass 
    AND conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
      CHECK (user_type IN ('internal', 'customer'));
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 3. ENSURE PROFILES.ROLE CHECK CONSTRAINT
-- -------------------------------------------------------------------
-- Add warehouse_staff to the role enum if not exists
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse_staff';
EXCEPTION WHEN others THEN NULL;
END $$;

-- -------------------------------------------------------------------
-- 4. ENSURE warehouses.staff_count COLUMN EXISTS (for performance)
-- -------------------------------------------------------------------
-- This allows quick staff count without COUNT query
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouses' AND column_name = 'staff_count'
  ) THEN
    ALTER TABLE public.warehouses ADD COLUMN staff_count integer NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_warehouses_staff_count ON public.warehouses(staff_count);
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 5. CREATE TRIGGER TO AUTO-UPDATE staff_count
-- -------------------------------------------------------------------
-- This keeps the staff_count in sync with actual profile assignments
CREATE OR REPLACE FUNCTION public.update_warehouse_staff_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update staff_count for the warehouse
  IF TG_OP = 'INSERT' THEN
    -- New staff member added
    IF NEW.assigned_warehouse_id IS NOT NULL AND NEW.is_warehouse_staff = true THEN
      UPDATE public.warehouses 
      SET staff_count = staff_count + 1 
      WHERE id = NEW.assigned_warehouse_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Staff member updated
    IF OLD.assigned_warehouse_id IS DISTINCT FROM NEW.assigned_warehouse_id THEN
      -- Decrement old warehouse count
      IF OLD.assigned_warehouse_id IS NOT NULL AND OLD.is_warehouse_staff = true THEN
        UPDATE public.warehouses 
        SET staff_count = GREATEST(0, staff_count - 1) 
        WHERE id = OLD.assigned_warehouse_id;
      END IF;
      -- Increment new warehouse count
      IF NEW.assigned_warehouse_id IS NOT NULL AND NEW.is_warehouse_staff = true THEN
        UPDATE public.warehouses 
        SET staff_count = staff_count + 1 
        WHERE id = NEW.assigned_warehouse_id;
      END IF;
    END IF;
    -- Handle is_warehouse_staff flag change
    IF OLD.is_warehouse_staff IS DISTINCT FROM NEW.is_warehouse_staff THEN
      IF NEW.is_warehouse_staff = true AND NEW.assigned_warehouse_id IS NOT NULL THEN
        UPDATE public.warehouses 
        SET staff_count = staff_count + 1 
        WHERE id = NEW.assigned_warehouse_id;
      ELSIF OLD.is_warehouse_staff = true AND OLD.assigned_warehouse_id IS NOT NULL THEN
        UPDATE public.warehouses 
        SET staff_count = GREATEST(0, staff_count - 1) 
        WHERE id = OLD.assigned_warehouse_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Staff member removed
    IF OLD.assigned_warehouse_id IS NOT NULL AND OLD.is_warehouse_staff = true THEN
      UPDATE public.warehouses 
      SET staff_count = GREATEST(0, staff_count - 1) 
      WHERE id = OLD.assigned_warehouse_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_warehouse_staff_count ON public.profiles;

-- Create trigger
CREATE TRIGGER trg_update_warehouse_staff_count
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_warehouse_staff_count();

-- -------------------------------------------------------------------
-- 6. INITIALIZE staff_count FOR EXISTING WAREHOUSES
-- -------------------------------------------------------------------
-- Backfill the staff_count column with actual counts
UPDATE public.warehouses w
SET staff_count = COALESCE(staff_count, 0) + (
  SELECT COUNT(*)
  FROM public.profiles p
  WHERE p.assigned_warehouse_id = w.id
    AND p.is_warehouse_staff = true
);

-- -------------------------------------------------------------------
-- 7. ENSURE FOREIGN KEY CASCADE BEHAVIOR
-- -------------------------------------------------------------------
-- When a warehouse is deleted, set assigned_warehouse_id to NULL for staff
-- (instead of failing due to FK constraint)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' 
    AND constraint_name LIKE '%assigned_warehouse_id%'
    AND delete_rule = 'RESTRICT'
  ) THEN
    -- Drop and recreate with SET NULL
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_assigned_warehouse_id_fkey;
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_assigned_warehouse_id_fkey 
      FOREIGN KEY (assigned_warehouse_id) 
      REFERENCES public.warehouses(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 8. ADD HELPER FUNCTION FOR STAFF COUNT
-- -------------------------------------------------------------------
-- This provides a quick way to get staff count without complex queries
CREATE OR REPLACE FUNCTION public.get_warehouse_staff_count(wh_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.profiles
  WHERE assigned_warehouse_id = wh_id
    AND is_warehouse_staff = true;
$$;

-- -------------------------------------------------------------------
-- 9. LOGGING FOR DEBUGGING
-- -------------------------------------------------------------------
COMMENT ON TABLE public.warehouses IS 'Warehouse master data with auto-maintained staff_count';
COMMENT ON COLUMN public.warehouses.staff_count IS 'Auto-maintained count of warehouse staff members';
COMMENT ON FUNCTION public.update_warehouse_staff_count() IS 'Auto-updates warehouses.staff_count when profiles change';
COMMENT ON FUNCTION public.get_warehouse_staff_count(uuid) IS 'Returns current staff count for a warehouse';