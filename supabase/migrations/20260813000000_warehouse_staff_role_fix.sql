-- ============================================================
-- WAREHOUSE STAFF ROLE & PERMISSION FIX
--
-- PROBLEM:
--   1. The `warehouse_staff` role does NOT exist in the `roles`
--      table. The RBAC system (has_permission(), PermissionContext,
--      middleware) cannot recognize warehouse staff, causing
--      Access Denied and broken login redirects.
--   2. The `has_permission()` function does not recognize
--      warehouse_staff as a valid internal role.
--   3. Warehouse staff need specific permissions to access
--      their dashboard, orders, products, and settings.
--
-- FIX:
--   1. Ensure the `warehouse_staff` role exists in `roles`.
--   2. Grant the warehouse_staff role the necessary permissions.
--   3. Update `has_permission()` to recognize warehouse_staff
--      as having the warehouse-scoped permissions.
--   4. Ensure existing warehouse staff profiles get the role.
-- ============================================================

BEGIN;

-- -------------------------------------------------------------------
-- 1. ENSURE warehouse_staff ROLE EXISTS
-- -------------------------------------------------------------------
INSERT INTO public.roles (name, description, is_system, priority)
VALUES (
  'warehouse_staff',
  'Warehouse staff with access to their assigned warehouse dashboard, orders, products, and settings',
  true,
  5
)
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------------
-- 2. GRANT PERMISSIONS TO warehouse_staff ROLE
-- -------------------------------------------------------------------
-- Ensure the required permission codes exist first
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('dashboard.view', 'View Dashboard', 'Access admin dashboard', 'dashboard', ARRAY['view']),
  ('orders.view', 'View Orders', 'View order list and details', 'orders', ARRAY['view']),
  ('orders.manage_status', 'Manage Order Status', 'Change order status', 'orders', ARRAY['edit']),
  ('inventory.view', 'View Inventory', 'View inventory data', 'inventory', ARRAY['view']),
  ('products.view', 'View Products', 'View product list and details', 'products', ARRAY['view']),
  ('products.edit', 'Edit Products', 'Modify products', 'products', ARRAY['edit']),
  ('settings.view', 'View Settings', 'View site settings', 'settings', ARRAY['view'])
ON CONFLICT (code) DO NOTHING;

-- Grant the permissions to warehouse_staff role
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'warehouse_staff'
  AND p.code IN (
    'dashboard.view',
    'orders.view',
    'orders.manage_status',
    'inventory.view',
    'products.view',
    'products.edit',
    'settings.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- -------------------------------------------------------------------
-- 3. UPDATE has_permission() TO RECOGNIZE WAREHOUSE STAFF
-- -------------------------------------------------------------------
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
  )
  OR EXISTS (
    -- WAREHOUSE STAFF: warehouse staff are granted the warehouse
    -- scoped permissions (dashboard.view, orders.view, orders.manage_status,
    -- inventory.view, products.view, products.edit, settings.view)
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND p.is_warehouse_staff = true
      AND p_code IN (
        'dashboard.view',
        'orders.view',
        'orders.manage_status',
        'inventory.view',
        'products.view',
        'products.edit',
        'settings.view'
      )
  );
$$;

-- -------------------------------------------------------------------
-- 4. ENSURE EXISTING WAREHOUSE STAFF HAVE THE ROLE
-- -------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'warehouse_staff'
WHERE p.is_warehouse_staff = true
  AND p.user_type = 'internal'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role_id = r.id
  );

-- -------------------------------------------------------------------
-- 5. GRANT EXECUTE ON UPDATED FUNCTION
-- -------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

COMMIT;