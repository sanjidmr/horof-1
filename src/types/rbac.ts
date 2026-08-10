// ============================================================
// ENTERPRISE RBAC TYPES
// ============================================================

export type UserType = 'customer' | 'internal';
export type UserRoleName = 'super_admin' | 'owner' | 'manager' | 'inventory_manager' | 'sales_manager' | 'marketing_manager' | 'customer_support' | 'content_manager' | 'finance_manager' | 'staff' | 'warehouse_staff' | 'customer';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  priority: number;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  actions: string[];
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
  permission?: Permission;
  role?: Role;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
  role?: Role;
  user?: UserProfile;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  permission?: Permission;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: 'admin' | 'customer' | 'super_admin' | 'staff' | 'warehouse_staff' | 'manager';
  user_type: UserType;
  is_banned: boolean;
  is_warehouse_staff: boolean;
  assigned_warehouse_id: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminUser extends UserProfile {
  user_roles?: UserRole[];
  user_permissions?: UserPermission[];
}

export interface CustomerProfile extends UserProfile {
  orders_count?: number;
  total_spent?: number;
  last_order_at?: string | null;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  country: string | null;
  city: string | null;
  is_active: boolean;
  last_active_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
  user?: UserProfile;
}

export interface LoginHistory {
  id: string;
  user_id: string | null;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  location: string | null;
  status: 'success' | 'failed' | 'locked';
  failure_reason: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  title: string;
  message: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  is_resolved: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Backup {
  id: string;
  name: string;
  type: string;
  status: string;
  size_bytes: number;
  file_path: string | null;
  file_url: string | null;
  checksum: string | null;
  is_encrypted: boolean;
  includes: string[];
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface FraudEvent {
  id: string;
  event_type: string;
  risk_score: number;
  details: Record<string, any>;
  ip_address: string | null;
  user_id: string | null;
  email: string | null;
  order_id: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface BlacklistItem {
  id: string;
  type: string;
  value: string;
  reason: string | null;
  risk_score: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

// ============================================================
// MODULE → PERMISSION MAPPING
// ============================================================

export const ADMIN_MODULES = [
  { id: 'dashboard', label: 'Dashboard', permission: 'dashboard.view', href: '/admin/dashboard' },
  { id: 'analytics', label: 'Analytics', permission: 'analytics.view', href: '/admin/analytics' },
  { id: 'accounts', label: 'Accounts', permission: 'accounts.view', href: '/admin/accounts' },
  { id: 'categories', label: 'Categories', permission: 'categories.view', href: '/admin/categories' },
  { id: 'products', label: 'Products', permission: 'products.view', href: '/admin/products' },
  { id: 'orders', label: 'Orders', permission: 'orders.view', href: '/admin/orders' },
  { id: 'order_requests', label: 'Order Requests', permission: 'order_requests.view', href: '/admin/order-requests' },
  { id: 'design_requests', label: 'Design Requests', permission: 'design_requests.view', href: '/admin/design-requests' },
  { id: 'warehouse', label: 'Warehouse', permission: 'warehouse.view', href: '/admin/warehouse' },
  { id: 'customers', label: 'Customers', permission: 'customers.view', href: '/admin/customers' },
  { id: 'reviews', label: 'Reviews', permission: 'reviews.view', href: '/admin/reviews' },
  { id: 'reports', label: 'Reports', permission: 'reports.view', href: '/admin/reports/dashboard' },
  { id: 'inventory', label: 'Inventory', permission: 'inventory.view', href: '/admin/inventory' },
  { id: 'messages', label: 'Messages', permission: 'messages.view', href: '/admin/messages' },
  { id: 'support', label: 'Support', permission: 'support.view', href: '/admin/support' },
  { id: 'marketing', label: 'Marketing', permission: 'marketing.view', href: '/admin/marketing' },
  { id: 'offer_campaign', label: 'Offer & Campaign', permission: 'offer_campaign.view', href: '/admin/marketing/coupons' },
  { id: 'users', label: 'Users', permission: 'users.view', href: '/admin/users' },
  { id: 'security_center', label: 'Security Center', permission: 'security_center.view', href: '/admin/security' },
  { id: 'display_pages', label: 'Display Pages', permission: 'display_pages.view', href: '/admin/display-pages' },
  { id: 'settings_center', label: 'Settings Center', permission: 'settings_center.view', href: '/admin/settings' },
] as const;

export type AdminModuleId = typeof ADMIN_MODULES[number]['id'];