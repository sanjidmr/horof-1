-- Enterprise RBAC Enhancement - Phase 2
-- Extends existing security system with per-user permissions, sessions, enhanced roles

-- ============================================================
-- PART 1: ENHANCE ROLES TABLE
-- ============================================================

DO $$ BEGIN
  ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#1a4731';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Shield';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- PART 2: PER-USER PERMISSION OVERRIDES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON public.user_permissions(permission_id);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_permissions_select_admin" ON public.user_permissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_permissions_insert_admin" ON public.user_permissions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_permissions_update_admin" ON public.user_permissions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_permissions_delete_admin" ON public.user_permissions
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PART 3: USER SESSIONS TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT,
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  country TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sessions_select_admin" ON public.user_sessions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_sessions_select_own" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_sessions_insert_system" ON public.user_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "user_sessions_update_admin" ON public.user_sessions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_sessions_delete_admin" ON public.user_sessions
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PART 4: COMPREHENSIVE PERMISSIONS FOR ALL MODULES
-- ============================================================

-- Dashboard
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('dashboard.view', 'View Dashboard', 'Access admin dashboard', 'dashboard', ARRAY['view']),
  ('dashboard.manage', 'Manage Dashboard', 'Configure dashboard widgets', 'dashboard', ARRAY['view', 'edit'])
ON CONFLICT (code) DO NOTHING;

-- Orders
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('orders.view', 'View Orders', 'View order list and details', 'orders', ARRAY['view']),
  ('orders.create', 'Create Orders', 'Create new orders manually', 'orders', ARRAY['create']),
  ('orders.edit', 'Edit Orders', 'Modify existing orders', 'orders', ARRAY['edit']),
  ('orders.delete', 'Delete Orders', 'Delete orders', 'orders', ARRAY['delete']),
  ('orders.export', 'Export Orders', 'Export order data', 'orders', ARRAY['view']),
  ('orders.approve', 'Approve Orders', 'Approve pending orders', 'orders', ARRAY['edit']),
  ('orders.print', 'Print Orders', 'Print order details/invoices', 'orders', ARRAY['view']),
  ('orders.manage_status', 'Manage Order Status', 'Change order status', 'orders', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Products
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('products.view', 'View Products', 'View product list and details', 'products', ARRAY['view']),
  ('products.create', 'Create Products', 'Add new products', 'products', ARRAY['create']),
  ('products.edit', 'Edit Products', 'Modify products', 'products', ARRAY['edit']),
  ('products.delete', 'Delete Products', 'Delete products', 'products', ARRAY['delete']),
  ('products.export', 'Export Products', 'Export product data', 'products', ARRAY['view']),
  ('products.import', 'Import Products', 'Import products from CSV', 'products', ARRAY['create']),
  ('products.archive', 'Archive Products', 'Archive/unarchive products', 'products', ARRAY['edit']),
  ('products.duplicate', 'Duplicate Products', 'Clone products', 'products', ARRAY['create']),
  ('products.settings', 'Product Settings', 'Manage product settings', 'products', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Categories
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('categories.view', 'View Categories', 'View categories', 'categories', ARRAY['view']),
  ('categories.manage', 'Manage Categories', 'Create, edit, delete categories', 'categories', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Brands
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('brands.view', 'View Brands', 'View brands', 'brands', ARRAY['view']),
  ('brands.manage', 'Manage Brands', 'Create, edit, delete brands', 'brands', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Customers
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('customers.view', 'View Customers', 'View customer list and details', 'customers', ARRAY['view']),
  ('customers.manage', 'Manage Customers', 'Edit customer details', 'customers', ARRAY['edit']),
  ('customers.delete', 'Delete Customers', 'Delete customer accounts', 'customers', ARRAY['delete']),
  ('customers.export', 'Export Customers', 'Export customer data', 'customers', ARRAY['view']),
  ('customers.ban', 'Ban Customers', 'Ban/unban customers', 'customers', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Users (Admin users)
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('users.view', 'View Users', 'View admin users list', 'users', ARRAY['view']),
  ('users.create', 'Create Users', 'Create new admin users', 'users', ARRAY['create']),
  ('users.edit', 'Edit Users', 'Edit admin user profiles', 'users', ARRAY['edit']),
  ('users.delete', 'Delete Users', 'Delete admin users', 'users', ARRAY['delete']),
  ('users.suspend', 'Suspend Users', 'Suspend admin user accounts', 'users', ARRAY['edit']),
  ('users.manage_roles', 'Manage User Roles', 'Assign and remove roles', 'users', ARRAY['edit']),
  ('users.manage_permissions', 'Manage User Permissions', 'Override per-user permissions', 'users', ARRAY['edit']),
  ('users.reset_password', 'Reset Password', 'Force password reset for users', 'users', ARRAY['edit']),
  ('users.force_logout', 'Force Logout', 'Terminate user sessions', 'users', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Roles
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('roles.view', 'View Roles', 'View role list', 'roles', ARRAY['view']),
  ('roles.create', 'Create Roles', 'Create new roles', 'roles', ARRAY['create']),
  ('roles.edit', 'Edit Roles', 'Edit role details and permissions', 'roles', ARRAY['edit']),
  ('roles.delete', 'Delete Roles', 'Delete custom roles', 'roles', ARRAY['delete']),
  ('roles.clone', 'Clone Roles', 'Duplicate existing roles', 'roles', ARRAY['create'])
ON CONFLICT (code) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('permissions.view', 'View Permissions', 'View permission matrix', 'permissions', ARRAY['view']),
  ('permissions.manage', 'Manage Permissions', 'Configure permission assignments', 'permissions', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Inventory
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('inventory.view', 'View Inventory', 'View inventory data', 'inventory', ARRAY['view']),
  ('inventory.manage', 'Manage Inventory', 'Manage stock levels', 'inventory', ARRAY['create', 'edit', 'delete']),
  ('inventory.transfers', 'Manage Transfers', 'Manage stock transfers', 'inventory', ARRAY['create', 'edit']),
  ('inventory.export', 'Export Inventory', 'Export inventory data', 'inventory', ARRAY['view']),
  ('inventory.adjust', 'Adjust Stock', 'Manually adjust stock levels', 'inventory', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Warehouse
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('warehouse.view', 'View Warehouses', 'View warehouse list', 'warehouse', ARRAY['view']),
  ('warehouse.manage', 'Manage Warehouses', 'Create, edit, delete warehouses', 'warehouse', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Suppliers
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('suppliers.view', 'View Suppliers', 'View supplier list', 'suppliers', ARRAY['view']),
  ('suppliers.manage', 'Manage Suppliers', 'Create, edit, delete suppliers', 'suppliers', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Purchase Orders
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('purchase_orders.view', 'View Purchase Orders', 'View purchase orders', 'purchase_orders', ARRAY['view']),
  ('purchase_orders.create', 'Create Purchase Orders', 'Create purchase orders', 'purchase_orders', ARRAY['create']),
  ('purchase_orders.edit', 'Edit Purchase Orders', 'Edit purchase orders', 'purchase_orders', ARRAY['edit']),
  ('purchase_orders.approve', 'Approve Purchase Orders', 'Approve purchase orders', 'purchase_orders', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Stock Movement
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('stock_movement.view', 'View Stock Movements', 'View stock movement history', 'stock_movement', ARRAY['view']),
  ('stock_movement.export', 'Export Stock Movements', 'Export stock movement data', 'stock_movement', ARRAY['view'])
ON CONFLICT (code) DO NOTHING;

-- Reports
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('reports.view', 'View Reports', 'View analytics and reports', 'reports', ARRAY['view']),
  ('reports.export', 'Export Reports', 'Export report data', 'reports', ARRAY['view']),
  ('reports.sales', 'Sales Reports', 'View sales reports', 'reports', ARRAY['view']),
  ('reports.products', 'Product Reports', 'View product reports', 'reports', ARRAY['view']),
  ('reports.customers', 'Customer Reports', 'View customer reports', 'reports', ARRAY['view']),
  ('reports.finance', 'Finance Reports', 'View financial reports', 'reports', ARRAY['view']),
  ('reports.inventory', 'Inventory Reports', 'View inventory reports', 'reports', ARRAY['view']),
  ('reports.marketing', 'Marketing Reports', 'View marketing reports', 'reports', ARRAY['view'])
ON CONFLICT (code) DO NOTHING;

-- Analytics
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('analytics.view', 'View Analytics', 'View website analytics', 'analytics', ARRAY['view']),
  ('analytics.manage', 'Manage Analytics', 'Configure analytics settings', 'analytics', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Marketing
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('marketing.coupons', 'Manage Coupons', 'Create and manage coupons', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.bundles', 'Manage Bundle Offers', 'Manage bundle offers', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.flash_sale', 'Manage Flash Sales', 'Manage flash sale offers', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.special_offer', 'Manage Special Offers', 'Manage special offers', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.popups', 'Manage Popups', 'Manage popup campaigns', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.email_campaigns', 'Manage Email Campaigns', 'Create and send email campaigns', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.site_visuals', 'Manage Site Visuals', 'Manage site images and content', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.services', 'Manage Services', 'Manage service pages', 'marketing', ARRAY['create', 'edit', 'delete']),
  ('marketing.faq', 'Manage FAQ', 'Manage FAQ content', 'marketing', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Notifications
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('notifications.view', 'View Notifications', 'View notifications', 'notifications', ARRAY['view']),
  ('notifications.manage', 'Manage Notifications', 'Create and manage notifications', 'notifications', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Blog
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('blog.view', 'View Blog', 'View blog posts', 'blog', ARRAY['view']),
  ('blog.manage', 'Manage Blog', 'Create, edit, delete blog posts', 'blog', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- FAQ
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('faq.view', 'View FAQ', 'View FAQ entries', 'faq', ARRAY['view']),
  ('faq.manage', 'Manage FAQ', 'Create, edit, delete FAQ entries', 'faq', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Testimonials
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('testimonials.view', 'View Testimonials', 'View testimonials', 'testimonials', ARRAY['view']),
  ('testimonials.manage', 'Manage Testimonials', 'Manage testimonials', 'testimonials', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Contact Messages
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('contact_messages.view', 'View Contact Messages', 'View contact messages', 'contact_messages', ARRAY['view']),
  ('contact_messages.manage', 'Manage Contact Messages', 'Reply and manage messages', 'contact_messages', ARRAY['edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Reviews
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('reviews.view', 'View Reviews', 'View product reviews', 'reviews', ARRAY['view']),
  ('reviews.manage', 'Manage Reviews', 'Approve, reject, delete reviews', 'reviews', ARRAY['edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Media Library
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('media.view', 'View Media', 'View media library', 'media', ARRAY['view']),
  ('media.upload', 'Upload Media', 'Upload files to media library', 'media', ARRAY['create']),
  ('media.delete', 'Delete Media', 'Delete media files', 'media', ARRAY['delete'])
ON CONFLICT (code) DO NOTHING;

-- Invoices
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('invoices.view', 'View Invoices', 'View invoices', 'invoices', ARRAY['view']),
  ('invoices.create', 'Create Invoices', 'Create invoices', 'invoices', ARRAY['create']),
  ('invoices.print', 'Print Invoices', 'Print invoices', 'invoices', ARRAY['view']),
  ('invoices.export', 'Export Invoices', 'Export invoice data', 'invoices', ARRAY['view'])
ON CONFLICT (code) DO NOTHING;

-- Refunds
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('refunds.view', 'View Refunds', 'View refund requests', 'refunds', ARRAY['view']),
  ('refunds.approve', 'Approve Refunds', 'Approve refund requests', 'refunds', ARRAY['edit']),
  ('refunds.reject', 'Reject Refunds', 'Reject refund requests', 'refunds', ARRAY['edit']),
  ('refunds.process', 'Process Refunds', 'Process approved refunds', 'refunds', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Returns
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('returns.view', 'View Returns', 'View return requests', 'returns', ARRAY['view']),
  ('returns.manage', 'Manage Returns', 'Approve/reject/process returns', 'returns', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Delivery
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('delivery.view', 'View Delivery', 'View delivery status', 'delivery', ARRAY['view']),
  ('delivery.manage', 'Manage Delivery', 'Manage delivery assignments', 'delivery', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Shipping
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('shipping.view', 'View Shipping', 'View shipping zones and couriers', 'shipping', ARRAY['view']),
  ('shipping.manage', 'Manage Shipping', 'Manage shipping configuration', 'shipping', ARRAY['create', 'edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Payments
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('payments.view', 'View Payments', 'View payment records', 'payments', ARRAY['view']),
  ('payments.manage', 'Manage Payments', 'Manage payment settings', 'payments', ARRAY['edit']),
  ('payments.refund', 'Process Payment Refunds', 'Process payment refunds', 'payments', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- SEO
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('seo.view', 'View SEO', 'View SEO settings', 'seo', ARRAY['view']),
  ('seo.manage', 'Manage SEO', 'Manage SEO settings', 'seo', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Settings
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('settings.view', 'View Settings', 'View site settings', 'settings', ARRAY['view']),
  ('settings.manage', 'Manage Settings', 'Modify site settings', 'settings', ARRAY['edit']),
  ('settings.general', 'General Settings', 'Manage general settings', 'settings', ARRAY['edit']),
  ('settings.theme', 'Theme Settings', 'Manage theme settings', 'settings', ARRAY['edit']),
  ('settings.homepage', 'Homepage Settings', 'Manage homepage content', 'settings', ARRAY['edit']),
  ('settings.banners', 'Banner Settings', 'Manage banners', 'settings', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Backup
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('backup.view', 'View Backups', 'View backup history', 'backup', ARRAY['view']),
  ('backup.create', 'Create Backups', 'Create system backups', 'backup', ARRAY['create']),
  ('backup.restore', 'Restore Backups', 'Restore from backups', 'backup', ARRAY['edit']),
  ('backup.delete', 'Delete Backups', 'Delete old backups', 'backup', ARRAY['delete']),
  ('backup.schedule', 'Schedule Backups', 'Configure backup schedules', 'backup', ARRAY['edit'])
ON CONFLICT (code) DO NOTHING;

-- Security
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('security.view', 'View Security', 'View security dashboard', 'security', ARRAY['view']),
  ('security.manage', 'Manage Security', 'Configure security settings', 'security', ARRAY['edit']),
  ('security.audit_logs', 'View Audit Logs', 'View audit trail', 'security', ARRAY['view']),
  ('security.login_history', 'View Login History', 'View login attempts', 'security', ARRAY['view']),
  ('security.fraud', 'Manage Fraud', 'Manage fraud rules and blacklists', 'security', ARRAY['view', 'create', 'edit', 'delete']),
  ('security.sessions', 'Manage Sessions', 'View and terminate sessions', 'security', ARRAY['view', 'edit'])
ON CONFLICT (code) DO NOTHING;

-- System Logs
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('system_logs.view', 'View System Logs', 'View system activity logs', 'system_logs', ARRAY['view']),
  ('system_logs.manage', 'Manage System Logs', 'Clear and manage system logs', 'system_logs', ARRAY['edit', 'delete'])
ON CONFLICT (code) DO NOTHING;

-- Activity Logs
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('activity_logs.view', 'View Activity Logs', 'View user activity logs', 'activity_logs', ARRAY['view'])
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PART 5: RE-ASSIGN ALL PERMISSIONS TO SUPER_ADMIN & OWNER
-- ============================================================

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('super_admin', 'owner')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 6: FUNCTION TO CHECK USER PERMISSIONS (RESPECTS OVERRIDES)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_has_role_perm BOOLEAN := false;
  v_has_user_perm BOOLEAN := null;
  v_user_role TEXT;
BEGIN
  -- Check if user is super admin via profiles.role
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  IF v_user_role = 'admin' THEN
    -- Check if they have super_admin or owner role
    IF EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id AND r.name IN ('super_admin', 'owner')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Check role-based permission
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
    AND p.code = p_permission_code
    AND rp.granted = true
  ) INTO v_has_role_perm;

  -- Check per-user permission override
  SELECT up.granted INTO v_has_user_perm
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id
  AND p.code = p_permission_code;

  -- Per-user override takes precedence
  IF v_has_user_perm IS NOT NULL THEN
    RETURN v_has_user_perm;
  END IF;

  RETURN v_has_role_perm;
END;
$$;

-- ============================================================
-- PART 7: FUNCTION TO GET ALL USER PERMISSIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_code TEXT, granted BOOLEAN, source TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Role-based permissions
  SELECT DISTINCT
    p.code as permission_code,
    rp.granted,
    'role' as source
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id

  UNION

  -- Per-user overrides (these take precedence)
  SELECT
    p.code as permission_code,
    up.granted,
    'user' as source
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id;
$$;

-- ============================================================
-- PART 8: AUTO-ASSIGN SUPER_ADMIN TO FIRST ADMIN USER
-- ============================================================

INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p, public.roles r
WHERE p.role = 'admin' AND r.name = 'super_admin'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role_id = r.id
);
