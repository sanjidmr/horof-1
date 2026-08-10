-- ============================================================
-- FIX: Admin panel redirecting to /forbidden (Access Denied)
--
-- PROBLEM:
--   The middleware calls has_permission() RPC for every admin
--   route. If the user's user_roles entry is missing (e.g. the
--   role-assignment migration wasn't applied, or the user was
--   created after it ran), the RPC returns false and the user
--   is redirected to /admin/forbidden.
--
-- FIX:
--   1. Update has_permission() to also check the profiles table
--      as a fallback. A user with profile.role = admin /
--      super_admin / manager / staff (and user_type = 'internal')
--      is treated as having ALL permissions.
--   2. Ensure every existing internal admin profile has a
--      super_admin role assignment in user_roles.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Update has_permission() to fall back to profiles table
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(p_code TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- super_admin / owner bypass (RBAC roles)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'owner')
  )
  OR EXISTS (
    -- role-based grant
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.code = p_code
      AND rp.granted = true
  )
  OR EXISTS (
    -- per-user override grant
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid()
      AND p.code = p_code
      AND up.granted = true
  )
  OR EXISTS (
    -- FALLBACK: legacy profile-based admin check.
    -- Users with profile.role = admin / super_admin / manager /
    -- staff and user_type = 'internal' are treated as having
    -- ALL permissions, even if their user_roles entry is missing.
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role)
  );
$$;

-- ------------------------------------------------------------
-- 2. Ensure every existing internal admin profile has a
--    super_admin role assignment (so the RBAC system is
--    consistent going forward)
-- ------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'super_admin'
WHERE p.user_type = 'internal'
  AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- ------------------------------------------------------------
-- 3. Also ensure manager / staff profiles have their roles
-- ------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'manager'
WHERE p.user_type = 'internal'
  AND p.role = 'manager'::public.user_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'staff'
WHERE p.user_type = 'internal'
  AND p.role = 'staff'::public.user_role
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- ------------------------------------------------------------
-- 4. Grant execute on the updated function
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;