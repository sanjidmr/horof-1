-- ============================================================================
-- WAREHOUSE + STAFF PROVISIONING — PRODUCTION REBUILD
--
-- ROOT CAUSE:
--   auth.admin.createUser() returns HTTP 500 when the on_auth_user_created
--   trigger (handle_new_user) throws inside GoTrue's auth.users INSERT
--   transaction. The trigger's profile INSERT aborts the transaction on a
--   UNIQUE violation of idx_profiles_email_unique when an ORPHAN profile
--   (leftover from a deleted / soft-deleted auth user) already owns the email
--   under a different id — the old `ON CONFLICT (id)` clause only catches
--   primary-key collisions, never the email index. GoTrue's 500 is then masked
--   by supabase-js as "{}" (5xx short-circuits before the response body is read).
--
-- FIX:
--   1. handle_new_user is now metadata-aware AND NEVER-THROWING: it creates the
--      correct profile (internal warehouse staff when the metadata says so) and
--      swallows any conflict/constraint problem so GoTrue can never 500 on it.
--      The provisioning service explicitly creates/repairs the profile right
--      afterwards, so a skipped profile sync is always repaired.
--   2. update_warehouse_staff_count is SECURITY DEFINER + search_path pinned so
--      it no longer depends on the caller's RLS context, and it can never abort
--      a profile write (logs a notice on failure instead).
--   3. staff_count backfill is idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. handle_new_user — metadata-aware, conflict-safe, never aborts GoTrue
-- ---------------------------------------------------------------------------
-- Defense: handle_new_user casts to 'warehouse_staff'::public.user_role, which
-- is added by earlier migrations. Guarding here keeps the trigger valid even if
-- this migration is ever applied to a schema where those ran partially.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'warehouse_staff'
  ) THEN
    NULL;
  ELSE
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse_staff';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_role public.user_role;
  v_type text;
  v_is_staff boolean;
  v_wh uuid;
BEGIN
  -- This trigger runs INSIDE GoTrue's auth.users INSERT transaction. It MUST
  -- never throw: any failure here aborts the transaction and GoTrue returns
  -- HTTP 500 to the admin create-user call. All failure cases are caught and
  -- repaired by the provisioning service (purge orphan profiles + ensureProfile).
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  v_role := CASE
    WHEN COALESCE(v_meta ->> 'role', '') = 'warehouse_staff' THEN 'warehouse_staff'::public.user_role
    ELSE 'customer'::public.user_role
  END;
  v_type := CASE
    WHEN COALESCE(v_meta ->> 'user_type', '') = 'internal' THEN 'internal'
    ELSE 'customer'
  END;
  BEGIN
    v_is_staff := COALESCE((v_meta ->> 'is_warehouse_staff')::boolean, false);
  EXCEPTION WHEN others THEN
    v_is_staff := false;
  END;
  BEGIN
    v_wh := NULLIF(v_meta ->> 'assigned_warehouse_id', '')::uuid;
  EXCEPTION WHEN others THEN
    v_wh := NULL;
  END;

  BEGIN
    INSERT INTO public.profiles (
      id, email, full_name, phone, role, user_type, is_warehouse_staff, assigned_warehouse_id
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NULLIF(v_meta ->> 'full_name', ''), ''),
      NULLIF(v_meta ->> 'phone', ''),
      v_role,
      v_type,
      v_is_staff,
      v_wh
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email;
  EXCEPTION WHEN others THEN
    -- Swallow: GoTrue must never 500 because of profile sync. The service
    -- creates/repairs the profile explicitly after createUser.
    RAISE NOTICE 'handle_new_user: profile sync skipped for % (%): %',
      NEW.id, NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Re-point the trigger at the fixed function (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. update_warehouse_staff_count — SECURITY DEFINER, search_path pinned,
--    never-throwing (logs a notice instead of aborting the profile write).
--
--    Delta model (each branch is independent — a REASSIGNMENT decrements the
--    OLD warehouse AND increments the NEW one):
--      +1 to NEW.wh   when NEW is a counted member (staff + wh) and was NOT
--                     already counted in NEW.wh before this write.
--      -1 from OLD.wh when OLD was a counted member and is NOT still counted
--                     in OLD.wh after this write.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_warehouse_staff_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_wh uuid;
  v_new_wh uuid;
  v_old_staff boolean;
  v_new_staff boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_wh := OLD.assigned_warehouse_id;
    v_old_staff := (OLD.is_warehouse_staff = true);
    v_new_wh := NULL;
    v_new_staff := false;
  ELSE
    v_old_wh := OLD.assigned_warehouse_id;
    v_old_staff := (OLD.is_warehouse_staff = true);
    v_new_wh := NEW.assigned_warehouse_id;
    v_new_staff := (NEW.is_warehouse_staff = true);
  END IF;

  -- +1: arriving as a counted member in a warehouse where they were not
  --     already counted (fresh insert, flag-on, or (re)assignment).
  IF v_new_wh IS NOT NULL AND v_new_staff
     AND NOT (v_old_wh IS NOT NULL AND v_old_staff AND v_old_wh = v_new_wh) THEN
    BEGIN
      UPDATE public.warehouses
        SET staff_count = GREATEST(0, COALESCE(staff_count, 0) + 1)
        WHERE id = v_new_wh;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'update_warehouse_staff_count: increment skipped for wh %: %', v_new_wh, SQLERRM;
    END;
  END IF;

  -- -1: leaving a warehouse as a counted member (delete, flag-off,
  --     de-assignment, or reassignment away).
  IF v_old_wh IS NOT NULL AND v_old_staff
     AND NOT (v_new_wh IS NOT NULL AND v_new_staff AND v_new_wh = v_old_wh) THEN
    BEGIN
      UPDATE public.warehouses
        SET staff_count = GREATEST(0, COALESCE(staff_count, 0) - 1)
        WHERE id = v_old_wh;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'update_warehouse_staff_count: decrement skipped for wh %: %', v_old_wh, SQLERRM;
    END;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_warehouse_staff_count ON public.profiles;
CREATE TRIGGER trg_update_warehouse_staff_count
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_warehouse_staff_count();

-- ---------------------------------------------------------------------------
-- 3. Idempotent staff_count backfill (repairs any drift)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. Defense: ensure the warehouse_staff role exists so role assignment can
--    never fail with ROLE_NOT_FOUND on a fresh project.
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (name, description, priority)
SELECT 'warehouse_staff', 'Warehouse staff member', 40
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE name = 'warehouse_staff'
);

-- ---------------------------------------------------------------------------
-- 5. Grant execution on the functions used by RLS / provisioning paths
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.update_warehouse_staff_count() TO postgres;
