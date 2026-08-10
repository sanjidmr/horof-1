-- ============================================================
-- FINAL PERMISSION MATRIX — 21 MODULES x view/edit/delete/manage
-- ============================================================
-- Keep in sync with src/lib/auth/permissions.ts (PERMISSION_MODULES).
--
-- This migration:
--   1. Purges every legacy / banned permission code
--      (brands, suppliers, refunds, media, blog, testimonials,
--      shipping, invoices, payments, deliveries, returns, and every
--      export / import / add / accept / reject / send action).
--   2. Seeds the strict 21-module matrix with the exact action sets
--      defined in permissions.ts.
--   3. Re-seeds role_permissions for the default roles
--      (admin = everything; warehouse_staff = warehouse scope;
--       warehouse_manager / accounts / viewer = curated sets).
--   4. HARDENS has_permission(): removes the legacy profile-role
--      fallback (a privilege-escalation bypass). Access flows ONLY
--      through user_roles -> role_permissions + user_permissions.
--      super_admin / owner keep their RPC bypass.
--   5. Ensures every internal profile has a role assignment.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Purge old permission linkage + rows
-- ------------------------------------------------------------
DELETE FROM public.user_permissions;
DELETE FROM public.role_permissions;
DELETE FROM public.permissions;

-- ------------------------------------------------------------
-- 2. Seed the strict 21-module matrix
--    (module column MUST equal the module code used in
--    PERMISSION_MODULES so the Roles & Permissions UI groups correctly)
-- ------------------------------------------------------------
INSERT INTO public.permissions (code, name, module, actions, description) VALUES
  ('dashboard.view',              'Dashboard View',              'dashboard',       ARRAY['view'], 'View the admin dashboard'),
  ('analytics.view',              'Analytics View',              'analytics',       ARRAY['view'], 'View analytics'),
  ('accounts.view',               'Accounts View',               'accounts',        ARRAY['view'], 'View financial accounts and transactions'),
  ('accounts.edit',               'Accounts Edit',               'accounts',        ARRAY['edit'], 'Create and edit financial records'),
  ('accounts.delete',             'Accounts Delete',             'accounts',        ARRAY['delete'], 'Delete financial records'),
  ('accounts.manage',             'Accounts Manage',             'accounts',        ARRAY['manage'], 'Manage financial settings'),
  ('categories.view',             'Categories View',             'categories',      ARRAY['view'], 'View categories'),
  ('categories.edit',             'Categories Edit',             'categories',      ARRAY['edit'], 'Create and edit categories'),
  ('categories.delete',           'Categories Delete',           'categories',      ARRAY['delete'], 'Delete categories'),
  ('categories.manage',           'Categories Manage',           'categories',      ARRAY['manage'], 'Manage category settings'),
  ('products.view',               'Products View',               'products',        ARRAY['view'], 'View products'),
  ('products.edit',               'Products Edit',               'products',        ARRAY['edit'], 'Create and edit products'),
  ('products.delete',             'Products Delete',             'products',        ARRAY['delete'], 'Delete products'),
  ('products.manage',             'Products Manage',             'products',        ARRAY['manage'], 'Manage product settings and status'),
  ('orders.view',                 'Orders View',                 'orders',          ARRAY['view'], 'View orders'),
  ('orders.edit',                 'Orders Edit',                 'orders',          ARRAY['edit'], 'Create and edit orders'),
  ('orders.delete',               'Orders Delete',               'orders',          ARRAY['delete'], 'Delete orders'),
  ('orders.manage',               'Orders Manage',               'orders',          ARRAY['manage'], 'Manage order status, assignments and refunds'),
  ('order_requests.view',         'Order Requests View',         'order_requests',  ARRAY['view'], 'View order requests'),
  ('order_requests.edit',         'Order Requests Edit',         'order_requests',  ARRAY['edit'], 'Approve, reject or edit order requests'),
  ('order_requests.delete',       'Order Requests Delete',       'order_requests',  ARRAY['delete'], 'Delete order requests'),
  ('design_requests.view',        'Design Requests View',        'design_requests', ARRAY['view'], 'View design requests'),
  ('design_requests.edit',        'Design Requests Edit',        'design_requests', ARRAY['edit'], 'Edit design requests'),
  ('design_requests.delete',      'Design Requests Delete',      'design_requests', ARRAY['delete'], 'Delete design requests'),
  ('warehouse.view',              'Warehouse View',              'warehouse',       ARRAY['view'], 'View warehouses and assignments'),
  ('warehouse.edit',              'Warehouse Edit',              'warehouse',       ARRAY['edit'], 'Create and edit warehouses'),
  ('warehouse.delete',            'Warehouse Delete',            'warehouse',       ARRAY['delete'], 'Delete warehouses'),
  ('warehouse.manage',            'Warehouse Manage',            'warehouse',       ARRAY['manage'], 'Manage warehouse assignments and staff'),
  ('customers.view',              'Customers View',              'customers',       ARRAY['view'], 'View customers'),
  ('customers.delete',            'Customers Delete',            'customers',       ARRAY['delete'], 'Delete customers'),
  ('customers.manage',            'Customers Manage',            'customers',       ARRAY['manage'], 'Manage customer records, tags and bans'),
  ('reviews.view',                'Reviews View',                'reviews',         ARRAY['view'], 'View reviews'),
  ('reviews.edit',                'Reviews Edit',                'reviews',         ARRAY['edit'], 'Approve, reject or reply to reviews'),
  ('reviews.delete',              'Reviews Delete',              'reviews',         ARRAY['delete'], 'Delete reviews'),
  ('reports.view',                'Reports View',                'reports',         ARRAY['view'], 'View reports'),
  ('inventory.view',              'Inventory View',              'inventory',       ARRAY['view'], 'View inventory data'),
  ('inventory.edit',              'Inventory Edit',              'inventory',       ARRAY['edit'], 'Adjust inventory records'),
  ('inventory.delete',            'Inventory Delete',            'inventory',       ARRAY['delete'], 'Delete inventory records'),
  ('inventory.manage',            'Inventory Manage',            'inventory',       ARRAY['manage'], 'Manage inventory, transfers and stock movements'),
  ('messages.view',               'Messages View',               'messages',        ARRAY['view'], 'View messages'),
  ('messages.edit',               'Messages Edit',               'messages',        ARRAY['edit'], 'Send and edit messages'),
  ('messages.delete',             'Messages Delete',             'messages',        ARRAY['delete'], 'Delete messages'),
  ('messages.manage',             'Messages Manage',             'messages',        ARRAY['manage'], 'Manage message settings'),
  ('support.view',                'Support View',                'support',         ARRAY['view'], 'View support tickets'),
  ('support.edit',                'Support Edit',                'support',         ARRAY['edit'], 'Edit support tickets'),
  ('support.delete',              'Support Delete',              'support',         ARRAY['delete'], 'Delete support tickets'),
  ('support.manage',              'Support Manage',              'support',         ARRAY['manage'], 'Manage support settings'),
  ('marketing.view',              'Marketing View',              'marketing',       ARRAY['view'], 'View marketing tools'),
  ('marketing.edit',              'Marketing Edit',              'marketing',       ARRAY['edit'], 'Create and edit marketing content'),
  ('marketing.delete',            'Marketing Delete',            'marketing',       ARRAY['delete'], 'Delete marketing content'),
  ('marketing.manage',            'Marketing Manage',            'marketing',       ARRAY['manage'], 'Manage marketing settings'),
  ('offer_campaign.view',         'Offer & Campaign View',       'offer_campaign',  ARRAY['view'], 'View offers and campaigns'),
  ('offer_campaign.edit',         'Offer & Campaign Edit',       'offer_campaign',  ARRAY['edit'], 'Create and edit offers and campaigns'),
  ('offer_campaign.delete',       'Offer & Campaign Delete',     'offer_campaign',  ARRAY['delete'], 'Delete offers and campaigns'),
  ('offer_campaign.manage',       'Offer & Campaign Manage',     'offer_campaign',  ARRAY['manage'], 'Manage offers and campaigns'),
  ('users.view',                  'Users View',                  'users',           ARRAY['view'], 'View internal users'),
  ('users.edit',                  'Users Edit',                  'users',           ARRAY['edit'], 'Create and edit users'),
  ('users.delete',                'Users Delete',                'users',           ARRAY['delete'], 'Delete users'),
  ('users.manage',                'Users Manage',                'users',           ARRAY['manage'], 'Manage user roles, bans and sessions'),
  ('security_center.view',        'Security Center View',        'security_center', ARRAY['view'], 'View the security center'),
  ('security_center.edit',        'Security Center Edit',        'security_center', ARRAY['edit'], 'Create and edit roles and security records'),
  ('security_center.delete',      'Security Center Delete',      'security_center', ARRAY['delete'], 'Delete roles and security records'),
  ('security_center.manage',      'Security Center Manage',      'security_center', ARRAY['manage'], 'Manage roles, permissions, backups and audit'),
  ('display_pages.view',          'Display Pages View',          'display_pages',   ARRAY['view'], 'View display pages'),
  ('display_pages.edit',          'Display Pages Edit',          'display_pages',   ARRAY['edit'], 'Edit display pages'),
  ('display_pages.delete',        'Display Pages Delete',        'display_pages',   ARRAY['delete'], 'Delete display pages'),
  ('display_pages.manage',        'Display Pages Manage',        'display_pages',   ARRAY['manage'], 'Manage display pages'),
  ('settings_center.view',        'Settings Center View',        'settings_center', ARRAY['view'], 'View settings'),
  ('settings_center.edit',        'Settings Center Edit',        'settings_center', ARRAY['edit'], 'Edit settings'),
  ('settings_center.delete',      'Settings Center Delete',      'settings_center', ARRAY['delete'], 'Delete settings records'),
  ('settings_center.manage',      'Settings Center Manage',      'settings_center', ARRAY['manage'], 'Manage site settings and configuration');

-- ------------------------------------------------------------
-- 3. Re-seed role_permissions for the default roles
-- ------------------------------------------------------------

-- admin -> EVERY permission (full operational access)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- warehouse_staff -> warehouse-scoped access
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'warehouse_staff'
  AND p.code IN (
    'dashboard.view',
    'orders.view', 'orders.manage',
    'inventory.view', 'inventory.edit', 'inventory.manage',
    'products.view', 'products.edit',
    'settings_center.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- warehouse_manager -> full product / inventory / fulfilment control
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'warehouse_manager'
  AND p.code IN (
    'dashboard.view', 'analytics.view',
    'products.view', 'products.edit', 'products.delete', 'products.manage',
    'categories.view', 'categories.edit', 'categories.delete',
    'inventory.view', 'inventory.edit', 'inventory.delete', 'inventory.manage',
    'warehouse.view', 'warehouse.edit', 'warehouse.delete', 'warehouse.manage',
    'orders.view', 'orders.edit', 'orders.delete', 'orders.manage',
    'order_requests.view', 'order_requests.edit',
    'design_requests.view', 'design_requests.edit',
    'customers.view',
    'reviews.view',
    'reports.view',
    'messages.view',
    'support.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- accounts -> finance / orders / customers (read + edit financials)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'accounts'
  AND p.code IN (
    'dashboard.view', 'analytics.view',
    'accounts.view', 'accounts.edit', 'accounts.delete', 'accounts.manage',
    'orders.view', 'orders.edit', 'orders.delete', 'orders.manage',
    'customers.view',
    'reports.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- viewer -> read-only across operational modules (no security/users/settings)
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'viewer'
  AND p.code IN (
    'dashboard.view', 'analytics.view',
    'accounts.view',
    'categories.view',
    'products.view',
    'orders.view',
    'order_requests.view',
    'design_requests.view',
    'warehouse.view',
    'customers.view',
    'reviews.view',
    'reports.view',
    'inventory.view',
    'messages.view',
    'support.view',
    'marketing.view',
    'offer_campaign.view',
    'display_pages.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------
-- 4. HARDEN has_permission() — remove the legacy profile-role
--    fallback (privilege-escalation bypass). Access flows ONLY
--    through user_roles -> role_permissions and user_permissions.
--    super_admin / owner retain the unrestricted RPC bypass.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(p_code TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'owner')
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.code = p_code
      AND rp.granted = true
  )
  OR EXISTS (
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
-- 5. Ensure every internal profile has a role assignment
--    (so removing the legacy fallback cannot lock anyone out)
-- ------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'super_admin'
WHERE p.user_type = 'internal'
  AND p.role::text IN ('admin', 'super_admin')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'manager'
WHERE p.user_type = 'internal'
  AND p.role::text = 'manager'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'staff'
WHERE p.user_type = 'internal'
  AND p.role::text = 'staff'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'warehouse_staff'
WHERE p.user_type = 'internal'
  AND (p.is_warehouse_staff = true OR p.role::text = 'warehouse_staff')
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id);

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = 'viewer'
WHERE p.user_type = 'internal'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;
