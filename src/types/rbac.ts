// ============================================================
// ENTERPRISE RBAC TYPES
// ============================================================

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
  role: 'admin' | 'customer';
  is_banned: boolean;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AdminUser extends UserProfile {
  user_roles?: UserRole[];
  user_permissions?: UserPermission[];
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
  { id: 'orders', label: 'Orders', permission: 'orders.view', href: '/admin/orders' },
  { id: 'order_requests', label: 'Order Requests', permission: 'orders.view', href: '/admin/order-requests' },
  { id: 'products', label: 'Products', permission: 'products.view', href: '/admin/products' },
  { id: 'categories', label: 'Categories', permission: 'categories.view', href: '/admin/categories' },
  { id: 'brands', label: 'Brands', permission: 'brands.view', href: '/admin/products/brands' },
  { id: 'customers', label: 'Customers', permission: 'customers.view', href: '/admin/customers' },
  { id: 'users', label: 'Users', permission: 'users.view', href: '/admin/users' },
  { id: 'roles', label: 'Roles & Permissions', permission: 'roles.view', href: '/admin/security?tab=roles' },
  { id: 'inventory', label: 'Inventory', permission: 'inventory.view', href: '/admin/inventory' },
  { id: 'warehouse', label: 'Warehouses', permission: 'warehouse.view', href: '/admin/inventory/warehouses' },
  { id: 'suppliers', label: 'Suppliers', permission: 'suppliers.view', href: '/admin/inventory/suppliers' },
  { id: 'purchase_orders', label: 'Purchase Orders', permission: 'purchase_orders.view', href: '/admin/inventory/purchase-orders' },
  { id: 'stock_movement', label: 'Stock Movements', permission: 'stock_movement.view', href: '/admin/inventory/stock-movements' },
  { id: 'reports', label: 'Reports', permission: 'reports.view', href: '/admin/reports/dashboard' },
  { id: 'analytics', label: 'Analytics', permission: 'analytics.view', href: '/admin/reports/analytics' },
  { id: 'marketing', label: 'Marketing', permission: 'marketing.coupons', href: '/admin/marketing/coupons' },
  { id: 'coupons', label: 'Coupons', permission: 'marketing.coupons', href: '/admin/marketing/coupons' },
  { id: 'bundles', label: 'Bundle Offers', permission: 'marketing.bundles', href: '/admin/marketing/bundle-offers' },
  { id: 'flash_sale', label: 'Flash Sale', permission: 'marketing.flash_sale', href: '/admin/marketing/flash-sale' },
  { id: 'special_offer', label: 'Special Offer', permission: 'marketing.special_offer', href: '/admin/marketing/special-offer' },
  { id: 'popups', label: 'Popup Campaigns', permission: 'marketing.popups', href: '/admin/marketing/popup-campaigns' },
  { id: 'email_campaigns', label: 'Email Campaigns', permission: 'marketing.email_campaigns', href: '/admin/marketing/email-campaigns' },
  { id: 'site_visuals', label: 'Site Visuals', permission: 'marketing.site_visuals', href: '/admin/marketing/site-images' },
  { id: 'services', label: 'Our Services', permission: 'marketing.services', href: '/admin/marketing/services' },
  { id: 'faq', label: 'FAQ', permission: 'marketing.faq', href: '/admin/marketing/faq' },
  { id: 'messages', label: 'Messages', permission: 'contact_messages.view', href: '/admin/messages' },
  { id: 'support', label: 'Support', permission: 'security.view', href: '/admin/support' },
  { id: 'security', label: 'Security Center', permission: 'security.view', href: '/admin/security' },
  { id: 'settings', label: 'Settings', permission: 'settings.view', href: '/admin/settings' },
] as const;

export type AdminModuleId = typeof ADMIN_MODULES[number]['id'];
