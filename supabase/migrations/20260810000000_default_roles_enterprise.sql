-- ============================================================
-- ENTERPRISE RBAC: ESSENTIAL DEFAULT ROLES + STRICT ENFORCEMENT
-- ============================================================
-- 1. Creates the essential default roles
--    (admin, warehouse_manager, accounts, viewer) with presets
-- 2. Marks the essential default roles as is_default
-- 3. Cleans up orphaned 'bundle_offers' permissions (feature removed)
-- 4. Ensures every internal profile has an RBAC role assignment
--    (so removing the legacy fallback below cannot lock anyone out)
-- 5. Hardens has_permission() - removes the legacy profile-role
--    fallback that implicitly granted ALL permissions to any
--    internal 'admin' / 'manager' / 'staff' profile. That fallback
--    was a privilege-escalation bypass: access must flow through
--    user_roles -> role_permissions only.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Essential default roles
-- ------------------------------------------------------------
INSERT INTO public.roles (name, description, is_system, priority, color, icon, is_default) VALUES
  ('admin',              'Administrator with full access to the admin panel', false, 95, '#1d4ed8', 'UserCog', true),
  ('warehouse_manager',  'Manages products, inventory, warehouses and fulfilment operations', false, 55, '#a16207', 'Warehouse', true),
  ('accounts',           'Handles payments, refunds, invoices and financial records', false, 45, '#059669', 'Calculator', true),
  ('viewer',             'Read-only access across the admin panel', false, 5, '#64748b', 'Eye', true)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Mark the essential default roles
-- ------------------------------------------------------------
UPDATE public.roles SET is_default = true
WHERE name IN (
  'super_admin', 'admin', 'warehouse_manager', 'warehouse_staff',
  'marketing_manager', 'customer_support', 'content_manager',
  'accounts', 'viewer'
);

-- ------------------------------------------------------------
-- 3. Clean up orphaned bundle_offers permissions
--    (the bundle-offer admin module was removed from the app)
-- ------------------------------------------------------------
DELETE FROM public.role_permissions
WHERE permission_id IN (SELECT id FROM public.permissions WHERE module = 'bundle_offers');

DELETE FROM public.permissions WHERE module = 'bundle_offers';

-- ------------------------------------------------------------
-- 4. Role permission presets for the new roles
-- ------------------------------------------------------------

-- admin -> EVERY permission (full operational access)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- warehouse_manager -> full product/inventory/fulfilment control
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'warehouse_manager'
  AND p.code IN (
    'dashboard.view', 'dashboard.export', 'analytics.view',
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.approve', 'products.export', 'products.import', 'products.print', 'products.manage_settings', 'products.manage_status',
    'brands.view', 'brands.create', 'brands.edit', 'brands.delete',
    'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
    'subcategories.view', 'subcategories.create', 'subcategories.edit', 'subcategories.delete',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.export', 'inventory.manage_status',
    'warehouses.view', 'warehouses.create', 'warehouses.edit', 'warehouses.delete', 'warehouses.assign', 'warehouses.manage_status',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.delete', 'purchase_orders.approve', 'purchase_orders.manage_status',
    'stock_movement.view', 'stock_movement.export',
    'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.approve', 'orders.reject', 'orders.assign', 'orders.export', 'orders.print', 'orders.manage_status', 'orders.manage_notifications',
    'order_requests.view', 'order_requests.create', 'order_requests.edit', 'order_requests.approve', 'order_requests.reject', 'order_requests.assign', 'order_requests.manage_status',
    'returns.view', 'returns.create', 'returns.edit', 'returns.approve', 'returns.reject', 'returns.manage_status', 'returns.print',
    'deliveries.view', 'deliveries.create', 'deliveries.edit', 'deliveries.manage_status',
    'customers.view', 'customers.edit',
    'reviews.view', 'reviews.edit',
    'media.view', 'media.upload',
    'reports.view', 'reports.export', 'reports.print',
    'notifications.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- accounts -> finance / payments / refunds / invoices
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'accounts'
  AND p.code IN (
    'dashboard.view', 'analytics.view',
    'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.export',
    'transactions.view', 'transactions.create', 'transactions.edit', 'transactions.export',
    'payments.view', 'payments.create', 'payments.edit', 'payments.manage_status', 'payments.export',
    'refunds.view', 'refunds.approve', 'refunds.reject', 'refunds.manage_status', 'refunds.export',
    'invoices.view', 'invoices.create', 'invoices.print', 'invoices.export',
    'customers.view', 'orders.view',
    'reports.view', 'reports.export', 'reports.print'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- viewer -> read-only across operational modules (no security/users/settings)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'viewer'
  AND p.code IN (
    'dashboard.view',
    'analytics.view',
    'products.view', 'brands.view', 'categories.view', 'subcategories.view',
    'inventory.view', 'warehouses.view', 'suppliers.view', 'purchase_orders.view', 'stock_movement.view',
    'orders.view', 'order_requests.view', 'returns.view', 'refunds.view',
    'customers.view',
    'reviews.view',
    'coupons.view', 'flash_sale.view', 'special_offer.view', 'popup_campaigns.view', 'email_campaigns.view', 'free_shipping.view',
    'site_visuals.view', 'services.view', 'faq.view',
    'shipping.view', 'deliveries.view',
    'payments.view', 'transactions.view', 'finance.view', 'invoices.view',
    'reports.view',
    'contact_messages.view', 'chat.view', 'support_tickets.view', 'design_requests.view',
    'notifications.view', 'media.view', 'blog.view', 'testimonials.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Ensure every internal profile has a role assignment
-- ------------------------------------------------------------
-- admin / super_admin profiles -> super_admin role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'super_admin'
WHERE p.user_type = 'internal'
  AND p.role::text IN ('admin', 'super_admin')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- manager profiles -> manager role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'manager'
WHERE p.user_type = 'internal'
  AND p.role::text = 'manager'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- staff profiles -> staff role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'staff'
WHERE p.user_type = 'internal'
  AND p.role::text = 'staff'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- warehouse_staff profiles -> warehouse_staff role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'warehouse_staff'
WHERE p.user_type = 'internal'
  AND (p.is_warehouse_staff = true OR p.role::text = 'warehouse_staff')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

-- any remaining internal profile with no roles at all -> viewer
-- (safe read-only default so nobody is silently locked out)
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'viewer'
WHERE p.user_type = 'internal'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Harden has_permission() - remove the legacy profile-role
--    fallback (privilege-escalation bypass)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(p_code TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- super_admin / owner bypass (RBAC roles only)
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

GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- ------------------------------------------------------------
-- 6b. Grant warehouse_staff the settings.view permission
--     so they can access /admin/warehouse/settings (own profile)
-- ------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'warehouse_staff'
  AND p.code = 'settings.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 7. Tighten RLS on the RBAC catalogue tables
--    SELECT was previously 'true' for any authenticated user
--    (customers could enumerate roles + the permission matrix).
--    Restrict reads to internal staff and RBAC managers.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles
  FOR SELECT TO authenticated
  USING (public.is_internal_user() OR public.has_rbac_management_role());

DROP POLICY IF EXISTS permissions_select ON public.permissions;
CREATE POLICY permissions_select ON public.permissions
  FOR SELECT TO authenticated
  USING (public.is_internal_user() OR public.has_rbac_management_role());

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO authenticated
  USING (public.is_internal_user() OR public.has_rbac_management_role());

COMMIT;
