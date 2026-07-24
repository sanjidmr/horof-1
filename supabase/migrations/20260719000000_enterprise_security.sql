-- Enterprise Security System: RBAC, Audit, Backup, Fraud Protection
-- 2026-07-19

-- ============================================================
-- PART 1: FIX EXISTING SECURITY ISSUES
-- ============================================================

-- Fix order_requests RLS (was world-readable + world-writable)
DROP POLICY IF EXISTS "order_requests_select_policy" ON public.order_requests;
DROP POLICY IF EXISTS "order_requests_insert_policy" ON public.order_requests;

CREATE POLICY "order_requests_select_own_or_admin" ON public.order_requests
  FOR SELECT USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "order_requests_insert_authenticated" ON public.order_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Fix notifications RLS (was all authenticated users full CRUD)
DROP POLICY IF EXISTS "Admin can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can delete notifications" ON public.notifications;

CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "notifications_update_admin" ON public.notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "notifications_delete_admin" ON public.notifications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PART 2: AUDIT LOG SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- PART 3: ENTERPRISE RBAC SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON public.roles FOR SELECT USING (true);
CREATE POLICY "roles_insert_admin" ON public.roles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "roles_update_admin" ON public.roles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "roles_delete_admin" ON public.roles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "permissions_select" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "permissions_insert_admin" ON public.permissions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "permissions_update_admin" ON public.permissions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "permissions_delete_admin" ON public.permissions FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "role_permissions_insert_admin" ON public.role_permissions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "role_permissions_update_admin" ON public.role_permissions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "role_permissions_delete_admin" ON public.role_permissions FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "user_roles_insert_admin" ON public.user_roles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_roles_update_admin" ON public.user_roles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PART 4: LOGIN HISTORY & SESSION TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON public.login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_status ON public.login_history(status);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON public.login_history(created_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_history_select_admin" ON public.login_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "login_history_insert" ON public.login_history
  FOR INSERT WITH CHECK (true);

-- Account lock tracking
CREATE TABLE IF NOT EXISTS public.account_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT,
  failed_attempts INTEGER DEFAULT 1,
  locked_until TIMESTAMPTZ,
  is_permanently_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_locks_user ON public.account_locks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_locks_ip ON public.account_locks(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_locks_locked ON public.account_locks(locked_until) WHERE locked_until IS NOT NULL;

ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_locks_select_admin" ON public.account_locks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "account_locks_insert_admin" ON public.account_locks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "account_locks_update_admin" ON public.account_locks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PART 5: BACKUP & RECOVERY SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'database', 'files', 'media', 'manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'verified')),
  size_bytes BIGINT DEFAULT 0,
  file_path TEXT,
  file_url TEXT,
  checksum TEXT,
  is_encrypted BOOLEAN DEFAULT true,
  includes TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_type ON public.backups(type);
CREATE INDEX IF NOT EXISTS idx_backups_created ON public.backups(created_at DESC);

-- Backup schedule configuration
CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('full', 'database', 'files', 'media')),
  frequency TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  time_of_day TIME DEFAULT '02:00',
  day_of_week INTEGER DEFAULT 0,
  day_of_month INTEGER DEFAULT 1,
  retention_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backup restore history
CREATE TABLE IF NOT EXISTS public.restore_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id UUID NOT NULL REFERENCES public.backups(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  restore_type TEXT NOT NULL CHECK (restore_type IN ('full', 'partial')),
  items_restored TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  restored_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backups_select_admin" ON public.backups FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backups_insert_admin" ON public.backups FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backups_update_admin" ON public.backups FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backups_delete_admin" ON public.backups FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "backup_schedules_select_admin" ON public.backup_schedules FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backup_schedules_insert_admin" ON public.backup_schedules FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backup_schedules_update_admin" ON public.backup_schedules FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "backup_schedules_delete_admin" ON public.backup_schedules FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "restore_history_select_admin" ON public.restore_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "restore_history_insert_admin" ON public.restore_history FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PART 6: FRAUD PROTECTION SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fraud_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ip', 'email', 'domain', 'phone', 'card', 'device')),
  value TEXT NOT NULL,
  reason TEXT,
  risk_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, value)
);

CREATE TABLE IF NOT EXISTS public.fraud_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ip', 'email', 'domain', 'phone')),
  value TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, value)
);

CREATE TABLE IF NOT EXISTS public.fraud_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'suspicious_login', 'multiple_failed_logins', 'fake_account', 'fake_order',
    'high_risk_order', 'duplicate_order', 'suspicious_payment', 'spam_detected',
    'bot_detected', 'ip_blacklisted', 'email_blacklisted', 'chargeback',
    'account_takeover', 'device_fingerprint_mismatch', 'velocity_check'
  )),
  risk_score INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_events_type ON public.fraud_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fraud_events_ip ON public.fraud_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_fraud_events_user ON public.fraud_events(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_events_risk ON public.fraud_events(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_events_created ON public.fraud_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_events_resolved ON public.fraud_events(is_resolved);

-- Risk scoring rules
CREATE TABLE IF NOT EXISTS public.fraud_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'login_velocity', 'order_velocity', 'ip_geography_mismatch', 'email_domain',
    'multiple_accounts_ip', 'payment_failure_rate', 'high_value_order',
    'new_account_order', 'shipping_billing_mismatch', 'quantity_anomaly'
  )),
  score_threshold INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fraud_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_blacklist_select_admin" ON public.fraud_blacklist FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_blacklist_insert_admin" ON public.fraud_blacklist FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_blacklist_update_admin" ON public.fraud_blacklist FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_blacklist_delete_admin" ON public.fraud_blacklist FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "fraud_whitelist_select_admin" ON public.fraud_whitelist FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_whitelist_insert_admin" ON public.fraud_whitelist FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_whitelist_delete_admin" ON public.fraud_whitelist FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "fraud_events_select_admin" ON public.fraud_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_events_insert_admin" ON public.fraud_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_events_update_admin" ON public.fraud_events FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "fraud_rules_select_admin" ON public.fraud_rules FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_rules_insert_admin" ON public.fraud_rules FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "fraud_rules_update_admin" ON public.fraud_rules FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- PART 7: RATE LIMITING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_select_admin" ON public.rate_limits FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "rate_limits_insert_system" ON public.rate_limits FOR INSERT WITH CHECK (true);
CREATE POLICY "rate_limits_update_system" ON public.rate_limits FOR UPDATE USING (true);

-- ============================================================
-- PART 8: SECURITY EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ssl_expiring', 'ssl_expired', 'backup_failed', 'backup_completed',
    'restore_started', 'restore_completed', 'restore_failed',
    'fraud_alert', 'brute_force', 'suspicious_activity',
    'role_changed', 'permission_changed', 'user_promoted',
    'user_demoted', 'user_banned', 'user_unbanned',
    'settings_changed', 'security_settings_changed',
    'login_from_new_device', 'login_from_new_location'
  )),
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  is_resolved BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_select_admin" ON public.security_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "security_events_insert_system" ON public.security_events FOR INSERT WITH CHECK (true);

-- ============================================================
-- PART 9: SEED DATA - Default Roles
-- ============================================================

INSERT INTO public.roles (name, description, is_system, priority) VALUES
  ('super_admin', 'Full system access with all permissions', true, 100),
  ('owner', 'Business owner with full administrative access', true, 90),
  ('manager', 'General manager with broad operational access', true, 80),
  ('inventory_manager', 'Manages products, stock, and warehouses', true, 70),
  ('sales_manager', 'Manages orders, customers, and pricing', true, 60),
  ('marketing_manager', 'Manages campaigns, coupons, and promotions', true, 50),
  ('customer_support', 'Handles customer inquiries, tickets, and chats', true, 40),
  ('content_manager', 'Manages site content, categories, and media', true, 30),
  ('finance_manager', 'Manages payments, refunds, and financial reports', true, 20),
  ('staff', 'Basic staff with limited access', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Seed permissions
INSERT INTO public.permissions (code, name, description, module, actions) VALUES
  ('dashboard.view', 'View Dashboard', 'Access admin dashboard', 'dashboard', ARRAY['view']),
  ('orders.view', 'View Orders', 'View order list and details', 'orders', ARRAY['view']),
  ('orders.create', 'Create Orders', 'Create new orders', 'orders', ARRAY['create']),
  ('orders.edit', 'Edit Orders', 'Modify existing orders', 'orders', ARRAY['edit']),
  ('orders.delete', 'Delete Orders', 'Delete orders', 'orders', ARRAY['delete']),
  ('orders.manage_status', 'Manage Order Status', 'Change order status', 'orders', ARRAY['edit']),
  ('orders.manage_refunds', 'Manage Refunds', 'Process refunds', 'orders', ARRAY['edit']),
  ('products.view', 'View Products', 'View product list and details', 'products', ARRAY['view']),
  ('products.create', 'Create Products', 'Add new products', 'products', ARRAY['create']),
  ('products.edit', 'Edit Products', 'Modify products', 'products', ARRAY['edit']),
  ('products.delete', 'Delete Products', 'Delete products', 'products', ARRAY['delete']),
  ('categories.view', 'View Categories', 'View categories', 'categories', ARRAY['view']),
  ('categories.manage', 'Manage Categories', 'Create, edit, delete categories', 'categories', ARRAY['create','edit','delete']),
  ('customers.view', 'View Customers', 'View customer list and details', 'customers', ARRAY['view']),
  ('customers.manage', 'Manage Customers', 'Edit customer details', 'customers', ARRAY['edit']),
  ('customers.ban', 'Ban Customers', 'Ban/unban customers', 'customers', ARRAY['edit']),
  ('inventory.view', 'View Inventory', 'View inventory data', 'inventory', ARRAY['view']),
  ('inventory.manage', 'Manage Inventory', 'Manage stock, warehouses, suppliers', 'inventory', ARRAY['create','edit','delete']),
  ('inventory.transfers', 'Manage Transfers', 'Manage stock transfers', 'inventory', ARRAY['create','edit']),
  ('marketing.coupons', 'Manage Coupons', 'Create and manage coupons', 'marketing', ARRAY['create','edit','delete']),
  ('marketing.campaigns', 'Manage Campaigns', 'Manage email and popup campaigns', 'marketing', ARRAY['create','edit','delete']),
  ('marketing.content', 'Manage Content', 'Manage site visuals and services', 'marketing', ARRAY['create','edit','delete']),
  ('marketing.flash_sale', 'Manage Flash Sales', 'Manage flash sale offers', 'marketing', ARRAY['create','edit','delete']),
  ('reports.view', 'View Reports', 'View analytics and reports', 'reports', ARRAY['view']),
  ('reports.export', 'Export Reports', 'Export report data', 'reports', ARRAY['view']),
  ('settings.view', 'View Settings', 'View site settings', 'settings', ARRAY['view']),
  ('settings.manage', 'Manage Settings', 'Modify site settings', 'settings', ARRAY['edit']),
  ('support.chat', 'Manage Chat', 'Handle live chat conversations', 'support', ARRAY['view','create','edit']),
  ('support.tickets', 'Manage Tickets', 'Handle support tickets', 'support', ARRAY['view','create','edit']),
  ('users.view', 'View Users', 'View admin users list', 'users', ARRAY['view']),
  ('users.manage', 'Manage Users', 'Invite and manage admin users', 'users', ARRAY['create','edit','delete']),
  ('users.roles', 'Manage Roles', 'Assign and manage roles', 'users', ARRAY['create','edit','delete']),
  ('security.view', 'View Security', 'View security dashboard', 'security', ARRAY['view']),
  ('security.manage', 'Manage Security', 'Configure security settings', 'security', ARRAY['edit']),
  ('security.backup', 'Manage Backups', 'Create and restore backups', 'security', ARRAY['create','edit','delete']),
  ('security.fraud', 'Manage Fraud', 'Manage fraud rules and blacklists', 'security', ARRAY['view','create','edit','delete']),
  ('finance.view', 'View Finance', 'View financial data', 'finance', ARRAY['view']),
  ('finance.manage', 'Manage Finance', 'Manage payments and financial settings', 'finance', ARRAY['create','edit','delete'])
ON CONFLICT (code) DO NOTHING;

-- Assign all permissions to super_admin and owner
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name IN ('super_admin', 'owner')
ON CONFLICT DO NOTHING;

-- Assign specific permissions to manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'manager'
AND p.code NOT IN ('users.manage', 'users.roles', 'security.manage', 'settings.manage', 'finance.manage')
AND p.code NOT LIKE 'users.%'
AND p.code NOT LIKE 'security.%'
ON CONFLICT DO NOTHING;

-- Assign permissions to inventory_manager
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'inventory_manager'
AND p.code IN ('dashboard.view', 'products.view', 'products.create', 'products.edit', 'categories.view', 'categories.manage', 'inventory.view', 'inventory.manage', 'inventory.transfers', 'reports.view')
ON CONFLICT DO NOTHING;

-- Assign permissions to customer_support
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'customer_support'
AND p.code IN ('dashboard.view', 'orders.view', 'customers.view', 'support.chat', 'support.tickets')
ON CONFLICT DO NOTHING;

-- Migrate existing admin profiles to super_admin role
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p, public.roles r
WHERE p.role = 'admin' AND r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 10: AUDIT LOG FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_ip TEXT;
  v_ua TEXT;
  v_log_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  SELECT email, role::text INTO v_user_email, v_user_role
  FROM public.profiles WHERE id = v_user_id;
  
  -- In production, extract from request headers or connection
  v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  v_ua := current_setting('request.headers', true)::json->>'user-agent';
  
  INSERT INTO public.audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, description, metadata, severity, ip_address, user_agent)
  VALUES (v_user_id, v_user_email, v_user_role, p_action, p_entity_type, p_entity_id, p_description, p_metadata, p_severity, v_ip, v_ua)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- PART 11: ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_history;
