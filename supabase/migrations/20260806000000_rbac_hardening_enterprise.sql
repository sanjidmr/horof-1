-- ============================================================
-- ENTERPRISE RBAC HARDENING
-- Closes privilege escalation vectors in the RBAC system.
--
-- CRITICAL FIXES:
-- 1. profiles_update RLS allowed ANY internal user to self-promote
--    (UPDATE profiles SET role='super_admin', user_type='internal'
--     WHERE id = auth.uid())  ->  unauthorized privilege escalation
-- 2. user_roles / role_permissions / user_permissions INSERT/UPDATE/DELETE
--    allowed ANY internal user (incl. warehouse_staff) to grant
--    themselves or others super_admin -> direct DB bypass
-- 3. roles / permissions management allowed any internal user
-- 4. Added prevent_self_privilege_escalation trigger for defense-in-depth
-- 5. Added has_permission() SECURITY DEFINER function (fast indexed check)
-- 6. RLS policies now use has_rbac_management_role() for write access,
--    NOT loose is_internal_user() checks
-- ============================================================

-- ============================================================
-- 1. HELPER: is user assigned to an RBAC management role?
--    (super_admin or owner). SECURITY DEFINER so it bypasses RLS
--    and is safe to call inside policies.
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_rbac_management_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'owner')
  );
$$;

-- ============================================================
-- 2. HELPER: fast permission check (used by middleware + actions
--    via RPC and available for future RLS tightening)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_permission(p_code TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- super_admin / owner bypass
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
  );
$$;

-- ============================================================
-- 3. PROTECT profiles.role / user_type / is_warehouse_staff
--    from self-promotion. This is THE critical escalation fix.
-- ============================================================

-- Drop the permissive update policy
DROP POLICY IF EXISTS profiles_update ON public.profiles;

-- Only allow users to update their OWN non-sensitive fields.
-- Sensitive fields (role, user_type, is_warehouse_staff,
-- assigned_warehouse_id) are STRIPPED by the trigger below and
-- can ONLY be changed by an RBAC management role through
-- dedicated RPC functions.
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.has_rbac_management_role()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.has_rbac_management_role()
  );

-- Defense-in-depth: block sensitive column changes at the trigger
-- level unless the actor holds an RBAC management role.
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_rbac_manager boolean;
BEGIN
  v_is_rbac_manager := public.has_rbac_management_role();

  -- Non-managers can NEVER change these columns (including their own row)
  IF NOT v_is_rbac_manager THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Not authorized to change role';
    END IF;
    IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
      RAISE EXCEPTION 'Not authorized to change user_type';
    END IF;
    IF NEW.is_warehouse_staff IS DISTINCT FROM OLD.is_warehouse_staff THEN
      RAISE EXCEPTION 'Not authorized to change is_warehouse_staff';
    END IF;
    IF NEW.assigned_warehouse_id IS DISTINCT FROM OLD.assigned_warehouse_id THEN
      RAISE EXCEPTION 'Not authorized to change assigned_warehouse_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ============================================================
-- 4. HARDEN user_roles RLS
--    Write access ONLY for RBAC management roles.
--    Users may still SELECT their own role assignments.
-- ============================================================
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;

CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_rbac_management_role()
  );

CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_rbac_management_role());

CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_rbac_management_role());

CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_rbac_management_role());

-- ============================================================
-- 5. HARDEN role_permissions RLS
-- ============================================================
DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_admin ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_update_admin ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_admin ON public.role_permissions;

CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY role_permissions_insert_admin ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_rbac_management_role());

CREATE POLICY role_permissions_update_admin ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.has_rbac_management_role());

CREATE POLICY role_permissions_delete_admin ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_rbac_management_role());

-- ============================================================
-- 6. HARDEN user_permissions RLS (per-user overrides)
-- ============================================================
DROP POLICY IF EXISTS user_permissions_select_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_insert_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_update_admin ON public.user_permissions;
DROP POLICY IF EXISTS user_permissions_delete_admin ON public.user_permissions;

CREATE POLICY user_permissions_select_admin ON public.user_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_rbac_management_role()
  );

CREATE POLICY user_permissions_insert_admin ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_rbac_management_role());

CREATE POLICY user_permissions_update_admin ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (public.has_rbac_management_role());

CREATE POLICY user_permissions_delete_admin ON public.user_permissions
  FOR DELETE TO authenticated
  USING (public.has_rbac_management_role());

-- ============================================================
-- 7. HARDEN roles RLS
-- ============================================================
DROP POLICY IF EXISTS roles_select ON public.roles;
DROP POLICY IF EXISTS roles_insert_admin ON public.roles;
DROP POLICY IF EXISTS roles_update_admin ON public.roles;
DROP POLICY IF EXISTS roles_delete_admin ON public.roles;

CREATE POLICY roles_select ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY roles_insert_admin ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_rbac_management_role());

CREATE POLICY roles_update_admin ON public.roles
  FOR UPDATE TO authenticated
  USING (public.has_rbac_management_role());

CREATE POLICY roles_delete_admin ON public.roles
  FOR DELETE TO authenticated
  USING (public.has_rbac_management_role());

-- ============================================================
-- 8. HARDEN permissions RLS
-- ============================================================
DROP POLICY IF EXISTS permissions_select ON public.permissions;
DROP POLICY IF EXISTS permissions_insert_admin ON public.permissions;
DROP POLICY IF EXISTS permissions_update_admin ON public.permissions;
DROP POLICY IF EXISTS permissions_delete_admin ON public.permissions;

CREATE POLICY permissions_select ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY permissions_insert_admin ON public.permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_rbac_management_role());

CREATE POLICY permissions_update_admin ON public.permissions
  FOR UPDATE TO authenticated
  USING (public.has_rbac_management_role());

CREATE POLICY permissions_delete_admin ON public.permissions
  FOR DELETE TO authenticated
  USING (public.has_rbac_management_role());

-- ============================================================
-- 9. SAFE RPC FOR ROLE ASSIGNMENT (bypasses RLS for managers,
--    enforces "cannot assign self to higher role", logs audit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_role_to_user(
  p_target_user_id UUID,
  p_role_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_roles text[];
  v_actor_is_super boolean;
  v_target_is_super boolean;
  v_actor_priority int;
  v_role_priority int;
BEGIN
  -- Actor must be RBAC manager
  IF NOT public.has_rbac_management_role() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  -- Gather actor roles
  SELECT ARRAY_AGG(r.name) INTO v_actor_roles
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  v_actor_is_super := 'super_admin' = ANY(v_actor_roles);

  -- Target already super? Only super_admin can touch.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_target_user_id AND r.name = 'super_admin'
  ) INTO v_target_is_super;

  IF v_target_is_super AND NOT v_actor_is_super THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot modify a Super Admin');
  END IF;

  -- Prevent assigning a role with priority >= actor's max priority
  -- unless actor is super_admin. Prevents "owner assigns another owner"
  -- and lower-priority managers granting higher privileges.
  SELECT MAX(priority) INTO v_actor_priority
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  SELECT priority INTO v_role_priority
  FROM public.roles WHERE id = p_role_id;

  IF NOT v_actor_is_super AND v_role_priority >= v_actor_priority THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot assign a role with equal or higher priority than your own');
  END IF;

  -- Prevent self-assignment of new roles (no self-escalation)
  IF p_target_user_id = auth.uid() AND NOT v_actor_is_super THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot assign roles to yourself');
  END IF;

  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (p_target_user_id, p_role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Audit log
  PERFORM public.log_audit(
    'role_assigned',
    'user_roles',
    p_target_user_id::text,
    'Role assigned to user',
    jsonb_build_object('role_id', p_role_id, 'by', auth.uid()),
    'info'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- 10. SAFE RPC FOR ROLE REMOVAL
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_role_from_user(
  p_target_user_id UUID,
  p_role_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_roles text[];
  v_actor_is_super boolean;
  v_target_role_name text;
BEGIN
  IF NOT public.has_rbac_management_role() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT ARRAY_AGG(r.name) INTO v_actor_roles
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  v_actor_is_super := 'super_admin' = ANY(v_actor_roles);

  SELECT r.name INTO v_target_role_name
  FROM public.roles r WHERE r.id = p_role_id;

  -- Cannot create a system without a super_admin
  IF v_target_role_name = 'super_admin' THEN
    IF NOT v_actor_is_super THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admin can remove Super Admin');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE r.name = 'super_admin' AND ur.user_id <> p_target_user_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Cannot remove the last Super Admin');
    END IF;
  END IF;

  -- Prevent removing own super_admin (lockout protection)
  IF p_target_user_id = auth.uid() AND v_target_role_name = 'super_admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot remove your own Super Admin role');
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_target_user_id AND role_id = p_role_id;

  PERFORM public.log_audit(
    'role_removed',
    'user_roles',
    p_target_user_id::text,
    'Role removed from user',
    jsonb_build_object('role_id', p_role_id, 'by', auth.uid()),
    'info'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- 11. SAFE RPC FOR PROFILE ROLE / USER_TYPE PROMOTION
--     (replaces direct UPDATE on profiles sensitive columns)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_role_type(
  p_target_user_id UUID,
  p_role public.user_role,
  p_user_type text DEFAULT 'internal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_roles text[];
  v_actor_is_super boolean;
BEGIN
  IF NOT public.has_rbac_management_role() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT ARRAY_AGG(r.name) INTO v_actor_roles
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid();

  v_actor_is_super := 'super_admin' = ANY(v_actor_roles);

  -- Only super_admin can grant super_admin
  IF p_role = 'super_admin'::public.user_role AND NOT v_actor_is_super THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admin can promote to Super Admin');
  END IF;

  -- Cannot change own role
  IF p_target_user_id = auth.uid() AND NOT v_actor_is_super THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot change your own role');
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      user_type = p_user_type
  WHERE id = p_target_user_id;

  PERFORM public.log_audit(
    'user_role_changed',
    'profiles',
    p_target_user_id::text,
    'User role/type changed',
    jsonb_build_object('role', p_role::text, 'user_type', p_user_type, 'by', auth.uid()),
    'warning'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- 12. GRANT EXECUTE on security-definer functions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.has_rbac_management_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_role_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_role_from_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role_type(uuid, public.user_role, text) TO authenticated;

-- ============================================================
-- 13. SECURITY EVENT for RLS policy changes
-- ============================================================
INSERT INTO public.security_events (event_type, title, message, severity)
VALUES (
  'security_settings_changed',
  'RBAC hardening applied',
  'Enterprise RBAC hardening migration executed: privilege escalation vectors closed, safe role-assignment RPCs added, self-promotion blocked.',
  'info'
)
ON CONFLICT DO NOTHING;