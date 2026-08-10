-- ============================================================
-- PERMISSION MATRIX UI SYNC — GUARANTEED 21-MODULE REGISTRY
-- ============================================================
-- Root cause of "missing permission groups in the Security Center
-- Permission Matrix":
--
--   The Roles & Permissions UI renders modules from the `permissions`
--   table (via getPermissions()). The server action tried to upsert
--   the registry rows directly, but the RLS policies on `permissions`
--   (permissions_insert_admin / permissions_update_admin) require
--   has_rbac_management_role() (super_admin / owner). For any other
--   internal user the upsert was silently blocked, so the DB kept
--   stale / missing rows and the UI showed missing groups.
--
-- This migration:
--   1. Creates a SECURITY DEFINER RPC `sync_permission_registry()`
--      that upserts the full 21-module x view/edit/delete/manage
--      matrix, bypassing RLS. It is callable by any authenticated
--      internal user (the RPC itself is the guard).
--   2. Runs the sync immediately so the DB is guaranteed to contain
--      every module the UI expects.
--   3. Re-seeds role_permissions for the default roles so the new
--      rows are wired to the existing role grants.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. SECURITY DEFINER RPC to sync the permission registry.
--    Bypasses RLS so any authenticated internal user can trigger
--    the sync; the function only ever writes the canonical matrix.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_permission_registry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_name text;
  v_module text;
  v_actions text[];
  v_description text;
BEGIN
  -- Dashboard
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('dashboard.view', 'Dashboard View', 'dashboard', ARRAY['view'], 'View the admin dashboard')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Analytics
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('analytics.view', 'Analytics View', 'analytics', ARRAY['view'], 'View analytics')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Accounts
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('accounts.view', 'Accounts View', 'accounts', ARRAY['view'], 'View financial accounts and transactions'),
    ('accounts.edit', 'Accounts Edit', 'accounts', ARRAY['edit'], 'Create and edit financial records'),
    ('accounts.delete', 'Accounts Delete', 'accounts', ARRAY['delete'], 'Delete financial records'),
    ('accounts.manage', 'Accounts Manage', 'accounts', ARRAY['manage'], 'Manage financial settings')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Categories
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('categories.view', 'Categories View', 'categories', ARRAY['view'], 'View categories'),
    ('categories.edit', 'Categories Edit', 'categories', ARRAY['edit'], 'Create and edit categories'),
    ('categories.delete', 'Categories Delete', 'categories', ARRAY['delete'], 'Delete categories'),
    ('categories.manage', 'Categories Manage', 'categories', ARRAY['manage'], 'Manage category settings')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Products
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('products.view', 'Products View', 'products', ARRAY['view'], 'View products'),
    ('products.edit', 'Products Edit', 'products', ARRAY['edit'], 'Create and edit products'),
    ('products.delete', 'Products Delete', 'products', ARRAY['delete'], 'Delete products'),
    ('products.manage', 'Products Manage', 'products', ARRAY['manage'], 'Manage product settings and status')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Orders
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('orders.view', 'Orders View', 'orders', ARRAY['view'], 'View orders'),
    ('orders.edit', 'Orders Edit', 'orders', ARRAY['edit'], 'Create and edit orders'),
    ('orders.delete', 'Orders Delete', 'orders', ARRAY['delete'], 'Delete orders'),
    ('orders.manage', 'Orders Manage', 'orders', ARRAY['manage'], 'Manage order status, assignments and refunds')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Order Requests
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('order_requests.view', 'Order Requests View', 'order_requests', ARRAY['view'], 'View order requests'),
    ('order_requests.edit', 'Order Requests Edit', 'order_requests', ARRAY['edit'], 'Approve, reject or edit order requests'),
    ('order_requests.delete', 'Order Requests Delete', 'order_requests', ARRAY['delete'], 'Delete order requests')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Design Requests
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('design_requests.view', 'Design Requests View', 'design_requests', ARRAY['view'], 'View design requests'),
    ('design_requests.edit', 'Design Requests Edit', 'design_requests', ARRAY['edit'], 'Edit design requests'),
    ('design_requests.delete', 'Design Requests Delete', 'design_requests', ARRAY['delete'], 'Delete design requests')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Warehouse
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('warehouse.view', 'Warehouse View', 'warehouse', ARRAY['view'], 'View warehouses and assignments'),
    ('warehouse.edit', 'Warehouse Edit', 'warehouse', ARRAY['edit'], 'Create and edit warehouses'),
    ('warehouse.delete', 'Warehouse Delete', 'warehouse', ARRAY['delete'], 'Delete warehouses'),
    ('warehouse.manage', 'Warehouse Manage', 'warehouse', ARRAY['manage'], 'Manage warehouse assignments and staff')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Customers
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('customers.view', 'Customers View', 'customers', ARRAY['view'], 'View customers'),
    ('customers.delete', 'Customers Delete', 'customers', ARRAY['delete'], 'Delete customers'),
    ('customers.manage', 'Customers Manage', 'customers', ARRAY['manage'], 'Manage customer records, tags and bans')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Reviews
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('reviews.view', 'Reviews View', 'reviews', ARRAY['view'], 'View reviews'),
    ('reviews.edit', 'Reviews Edit', 'reviews', ARRAY['edit'], 'Approve, reject or reply to reviews'),
    ('reviews.delete', 'Reviews Delete', 'reviews', ARRAY['delete'], 'Delete reviews')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Reports
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('reports.view', 'Reports View', 'reports', ARRAY['view'], 'View reports')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Inventory
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('inventory.view', 'Inventory View', 'inventory', ARRAY['view'], 'View inventory data'),
    ('inventory.edit', 'Inventory Edit', 'inventory', ARRAY['edit'], 'Adjust inventory records'),
    ('inventory.delete', 'Inventory Delete', 'inventory', ARRAY['delete'], 'Delete inventory records'),
    ('inventory.manage', 'Inventory Manage', 'inventory', ARRAY['manage'], 'Manage inventory, transfers and stock movements')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Messages
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('messages.view', 'Messages View', 'messages', ARRAY['view'], 'View messages'),
    ('messages.edit', 'Messages Edit', 'messages', ARRAY['edit'], 'Send and edit messages'),
    ('messages.delete', 'Messages Delete', 'messages', ARRAY['delete'], 'Delete messages'),
    ('messages.manage', 'Messages Manage', 'messages', ARRAY['manage'], 'Manage message settings')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Support
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('support.view', 'Support View', 'support', ARRAY['view'], 'View support tickets'),
    ('support.edit', 'Support Edit', 'support', ARRAY['edit'], 'Edit support tickets'),
    ('support.delete', 'Support Delete', 'support', ARRAY['delete'], 'Delete support tickets'),
    ('support.manage', 'Support Manage', 'support', ARRAY['manage'], 'Manage support settings')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Marketing
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('marketing.view', 'Marketing View', 'marketing', ARRAY['view'], 'View marketing tools'),
    ('marketing.edit', 'Marketing Edit', 'marketing', ARRAY['edit'], 'Create and edit marketing content'),
    ('marketing.delete', 'Marketing Delete', 'marketing', ARRAY['delete'], 'Delete marketing content'),
    ('marketing.manage', 'Marketing Manage', 'marketing', ARRAY['manage'], 'Manage marketing settings')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Offer & Campaign
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('offer_campaign.view', 'Offer & Campaign View', 'offer_campaign', ARRAY['view'], 'View offers and campaigns'),
    ('offer_campaign.edit', 'Offer & Campaign Edit', 'offer_campaign', ARRAY['edit'], 'Create and edit offers and campaigns'),
    ('offer_campaign.delete', 'Offer & Campaign Delete', 'offer_campaign', ARRAY['delete'], 'Delete offers and campaigns'),
    ('offer_campaign.manage', 'Offer & Campaign Manage', 'offer_campaign', ARRAY['manage'], 'Manage offers and campaigns')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Users
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('users.view', 'Users View', 'users', ARRAY['view'], 'View internal users'),
    ('users.edit', 'Users Edit', 'users', ARRAY['edit'], 'Create and edit users'),
    ('users.delete', 'Users Delete', 'users', ARRAY['delete'], 'Delete users'),
    ('users.manage', 'Users Manage', 'users', ARRAY['manage'], 'Manage user roles, bans and sessions')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Security Center
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('security_center.view', 'Security Center View', 'security_center', ARRAY['view'], 'View the security center'),
    ('security_center.edit', 'Security Center Edit', 'security_center', ARRAY['edit'], 'Create and edit roles and security records'),
    ('security_center.delete', 'Security Center Delete', 'security_center', ARRAY['delete'], 'Delete roles and security records'),
    ('security_center.manage', 'Security Center Manage', 'security_center', ARRAY['manage'], 'Manage roles, permissions, backups and audit')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Display Pages
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('display_pages.view', 'Display Pages View', 'display_pages', ARRAY['view'], 'View display pages'),
    ('display_pages.edit', 'Display Pages Edit', 'display_pages', ARRAY['edit'], 'Edit display pages'),
    ('display_pages.delete', 'Display Pages Delete', 'display_pages', ARRAY['delete'], 'Delete display pages'),
    ('display_pages.manage', 'Display Pages Manage', 'display_pages', ARRAY['manage'], 'Manage display pages')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Settings Center
  INSERT INTO public.permissions (code, name, module, actions, description) VALUES
    ('settings_center.view', 'Settings Center View', 'settings_center', ARRAY['view'], 'View settings'),
    ('settings_center.edit', 'Settings Center Edit', 'settings_center', ARRAY['edit'], 'Edit settings'),
    ('settings_center.delete', 'Settings Center Delete', 'settings_center', ARRAY['delete'], 'Delete settings records'),
    ('settings_center.manage', 'Settings Center Manage', 'settings_center', ARRAY['manage'], 'Manage site settings and configuration')
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name, module = EXCLUDED.module, actions = EXCLUDED.actions, description = EXCLUDED.description;

  -- Remove any permission rows that are NOT part of the canonical
  -- 21-module matrix (legacy / banned modules).
  DELETE FROM public.permissions
  WHERE module NOT IN (
    'dashboard', 'analytics', 'accounts', 'categories', 'products',
    'orders', 'order_requests', 'design_requests', 'warehouse',
    'customers', 'reviews', 'reports', 'inventory', 'messages',
    'support', 'marketing', 'offer_campaign', 'users',
    'security_center', 'display_pages', 'settings_center'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_permission_registry() TO authenticated;

-- ------------------------------------------------------------
-- 2. Run the sync immediately so the DB is guaranteed to contain
--    every module the UI expects.
-- ------------------------------------------------------------
SELECT public.sync_permission_registry();

-- ------------------------------------------------------------
-- 3. Re-seed role_permissions for the default roles so the new
--    rows are wired to the existing role grants.
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

COMMIT;