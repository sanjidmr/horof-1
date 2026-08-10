-- ============================================================
-- SERVICE ROLE BYPASS FOR RBAC MANAGEMENT
--
-- The backend (Next.js server actions) uses the service-role key
-- for admin operations: creating warehouse staff, assigning staff
-- to warehouses, updating user profiles, etc.
--
-- PROBLEM:
--   has_rbac_management_role() reads auth.uid() from the request
--   JWT. The service role has NO uid (auth.uid() = NULL), so it
--   always returned false. As a result the
--   prevent_privilege_escalation BEFORE UPDATE trigger on profiles
--   BLOCKED every service-role profile UPDATE that touched
--   role / user_type / is_warehouse_staff / assigned_warehouse_id.
--   This broke:
--     - createWarehouseWithStaff / createWarehouseStaff profile
--       upserts (upgrading a 'customer' profile to 'warehouse_staff')
--     - assignStaffToWarehouse / removeStaffFromWarehouse
--     - updateUserProfile
--
-- FIX:
--   Treat the service role as an RBAC manager. The service role
--   already bypasses RLS entirely, so this does not open any new
--   surface - it only makes the trigger consistent with the fact
--   that the service role is the trusted backend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_rbac_management_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (auth.role() = 'service_role')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'owner')
    );
$$;

-- ============================================================
-- FIX update_warehouse_staff_count DOUBLE-INCREMENT
--
-- The original trigger double-counted staff when an UPDATE changed
-- BOTH assigned_warehouse_id (null -> X) AND is_warehouse_staff
-- (false -> true) at the same time - exactly what the profile
-- upsert in createWarehouseWithStaff / createWarehouseStaff does.
-- The two IF blocks were not mutually exclusive.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_warehouse_staff_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_warehouse_id IS NOT NULL AND NEW.is_warehouse_staff = true THEN
      UPDATE public.warehouses
      SET staff_count = staff_count + 1
      WHERE id = NEW.assigned_warehouse_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Case 1: warehouse reassignment (handles flag+assignment changing together)
    IF OLD.assigned_warehouse_id IS DISTINCT FROM NEW.assigned_warehouse_id THEN
      IF OLD.assigned_warehouse_id IS NOT NULL AND OLD.is_warehouse_staff = true THEN
        UPDATE public.warehouses
        SET staff_count = GREATEST(0, staff_count - 1)
        WHERE id = OLD.assigned_warehouse_id;
      END IF;
      IF NEW.assigned_warehouse_id IS NOT NULL AND NEW.is_warehouse_staff = true THEN
        UPDATE public.warehouses
        SET staff_count = staff_count + 1
        WHERE id = NEW.assigned_warehouse_id;
      END IF;
    -- Case 2: is_warehouse_staff flag toggled without reassignment
    ELSIF OLD.is_warehouse_staff IS DISTINCT FROM NEW.is_warehouse_staff THEN
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

-- Re-apply the trigger so it points at the corrected function
DROP TRIGGER IF EXISTS trg_update_warehouse_staff_count ON public.profiles;
CREATE TRIGGER trg_update_warehouse_staff_count
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_warehouse_staff_count();

-- ============================================================
-- DEFENSIVE: ensure warehouses.staff_count exists and is correct
-- (idempotent - safe even if a previous migration added it)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warehouses' AND column_name = 'staff_count'
  ) THEN
    ALTER TABLE public.warehouses ADD COLUMN staff_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Backfill so existing warehouses have an accurate count
UPDATE public.warehouses w
SET staff_count = (
  SELECT COUNT(*)
  FROM public.profiles p
  WHERE p.assigned_warehouse_id = w.id
    AND p.is_warehouse_staff = true
)
WHERE w.staff_count <> (
  SELECT COUNT(*)
  FROM public.profiles p
  WHERE p.assigned_warehouse_id = w.id
    AND p.is_warehouse_staff = true
);


