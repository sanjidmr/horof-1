// ============================================================
// SINGLE SOURCE OF TRUTH FOR PERMISSIONS
// ============================================================
// Every permission in the system is defined here as module x action.
// The matching database seed lives in:
//   supabase/migrations/20260814000000_final_permission_matrix.sql
// (historical seed: 20260805000002_rbac_permission_matrix.sql)
// Keeping this file and the seed migration in sync is mandatory.
//
// Permission code format: `${module}.${action}`
// e.g. products.delete, orders.manage, accounts.view
//
// MODULES = only real admin modules that exist in the app.
//   Banned modules (brands, suppliers, refunds, media library, blog,
//   testimonials, shipping zones & couriers, invoices, payments) and
//   every import/export permission are NOT part of this matrix. Pages
//   that still exist for those modules are mapped to the `system.disabled`
//   sentinel in ADMIN_ROUTE_PERMISSIONS so only super_admin/owner can
//   reach them.
//
// ACTIONS = view / edit / delete / manage. Each must work independently:
//   view   = page visible
//   edit   = create + modify records, accept/reject/approve items
//   delete = destroy records
//   manage = administrative control (settings, assignments, status)
// ============================================================

export const PERMISSION_ACTIONS = ['view', 'edit', 'delete', 'manage'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionModule {
  code: string;
  label: string;
  actions: PermissionAction[];
}

// ------------------------------------------------------------
// MODULE x ACTION MATRIX
// ------------------------------------------------------------
export const PERMISSION_MODULES: PermissionModule[] = [
  { code: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { code: 'analytics', label: 'Analytics', actions: ['view'] },
  { code: 'accounts', label: 'Accounts', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'categories', label: 'Categories', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'products', label: 'Products', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'orders', label: 'Orders', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'order_requests', label: 'Order Requests', actions: ['view', 'edit', 'delete'] },
  { code: 'design_requests', label: 'Design Requests', actions: ['view', 'edit', 'delete'] },
  { code: 'warehouse', label: 'Warehouse', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'customers', label: 'Customers', actions: ['view', 'delete', 'manage'] },
  { code: 'reviews', label: 'Reviews', actions: ['view', 'edit', 'delete'] },
  { code: 'reports', label: 'Reports', actions: ['view'] },
  { code: 'inventory', label: 'Inventory', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'messages', label: 'Messages', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'support', label: 'Support', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'marketing', label: 'Marketing', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'offer_campaign', label: 'Offer & Campaign', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'users', label: 'Users', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'security_center', label: 'Security Center', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'display_pages', label: 'Display Pages', actions: ['view', 'edit', 'delete', 'manage'] },
  { code: 'settings_center', label: 'Settings Center', actions: ['view', 'edit', 'delete', 'manage'] },
];

// ------------------------------------------------------------
// DERIVED DATA
// ------------------------------------------------------------

export const ALL_PERMISSION_CODES: string[] = PERMISSION_MODULES.flatMap((m) =>
  m.actions.map((a) => `${m.code}.${a}` as string)
);

export function permissionCode(moduleCode: string, action: PermissionAction): string {
  return `${moduleCode}.${action}`;
}

const MODULE_MAP = new Map(PERMISSION_MODULES.map((m) => [m.code, m]));

export function getModule(code: string): PermissionModule | undefined {
  const dot = code.lastIndexOf('.');
  if (dot === -1) return undefined;
  return MODULE_MAP.get(code.slice(0, dot));
}

export function permissionName(code: string): string {
  const dot = code.lastIndexOf('.');
  if (dot === -1) return code.replace(/_/g, ' ');
  const moduleCode = code.slice(0, dot);
  const action = code.slice(dot + 1);
  const moduleLabel = MODULE_MAP.get(moduleCode)?.label ?? moduleCode.replace(/_/g, ' ');
  const actionLabel = action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return `${moduleLabel} — ${actionLabel}`;
}

// Human-friendly labels for the action column headers in the UI.
export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
  manage: 'Manage',
};

// ------------------------------------------------------------
// LEGACY CODES REMAPPED TO THE NEW MATRIX
// Used only as a lookup aid when migrating callsites / old DB rows.
// Every entry maps an old code to the equivalent new matrix code(s).
// ------------------------------------------------------------
export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  // add/create -> edit (create is an edit-level action)
  'products.add': ['products.edit'],
  'products.create': ['products.edit'],
  'categories.add': ['categories.edit'],
  'categories.create': ['categories.edit'],
  'subcategories.create': ['categories.edit'],
  'subcategories.edit': ['categories.edit'],
  'subcategories.delete': ['categories.delete'],
  'users.add': ['users.edit'],
  'users.create': ['users.edit'],
  'users.suspend': ['users.manage'],
  'users.manage_status': ['users.manage'],
  'users.manage_settings': ['users.manage'],
  'users.assign': ['users.manage'],
  'users.manage_roles': ['users.manage'],
  'warehouse.add': ['warehouse.edit'],
  'warehouses.create': ['warehouse.edit'],
  'warehouses.edit': ['warehouse.edit'],
  'warehouses.delete': ['warehouse.delete'],
  'warehouses.view': ['warehouse.view'],
  'warehouses.assign': ['warehouse.manage'],
  'inventory.create': ['inventory.manage'],
  'inventory.adjust': ['inventory.manage'],
  'inventory.transfers': ['inventory.manage'],
  'orders.create': ['orders.manage'],
  'orders.approve': ['orders.manage'],
  'orders.assign': ['orders.manage'],
  'orders.manage_status': ['orders.manage'],
  'orders.manage_notifications': ['orders.manage'],
  // order requests
  'order_requests.create': ['order_requests.edit'],
  'order_requests.accept': ['order_requests.edit'],
  'order_requests.reject': ['order_requests.edit'],
  'order_requests.approve': ['order_requests.edit'],
  'order_requests.assign': ['order_requests.edit'],
  'order_requests.manage_status': ['order_requests.edit'],
  // customers
  'customers.edit': ['customers.manage'],
  'customers.ban': ['customers.manage'],
  'customers.manage': ['customers.manage'],
  // reviews
  'reviews.approve': ['reviews.edit'],
  'reviews.reject': ['reviews.edit'],
  // marketing / offers / display pages
  'marketing.coupons': ['offer_campaign.view'],
  'marketing.campaigns': ['offer_campaign.view'],
  'marketing.flash_sale': ['offer_campaign.view'],
  'marketing.special_offer': ['offer_campaign.view'],
  'marketing.popups': ['offer_campaign.view'],
  'marketing.email_campaigns': ['offer_campaign.view'],
  'coupons.view': ['offer_campaign.view'],
  'coupons.create': ['offer_campaign.edit'],
  'coupons.edit': ['offer_campaign.edit'],
  'coupons.delete': ['offer_campaign.delete'],
  'coupons.manage_status': ['offer_campaign.manage'],
  'free_shipping.view': ['offer_campaign.view'],
  'popup_campaigns.view': ['offer_campaign.view'],
  'flash_sale.view': ['offer_campaign.view'],
  'special_offer.view': ['offer_campaign.view'],
  'email_campaigns.view': ['offer_campaign.view'],
  'email_campaigns.create': ['offer_campaign.edit'],
  'offers_campaigns.view': ['offer_campaign.view'],
  'marketing.content': ['display_pages.view'],
  'marketing.site_visuals': ['display_pages.view'],
  'marketing.services': ['display_pages.view'],
  'marketing.faq': ['display_pages.view'],
  'site_visuals.view': ['display_pages.view'],
  'services.view': ['display_pages.view'],
  'faq.view': ['display_pages.view'],
  'about_page.view': ['display_pages.view'],
  'seo.view': ['marketing.view'],
  'social_media.view': ['marketing.view'],
  'meta_pixel.view': ['marketing.view'],
  'stock_movement.view': ['inventory.view'],
  'contact_messages.view': ['messages.view'],
  'support_tickets.view': ['support.view'],
  // finance -> accounts
  'finance.view': ['accounts.view'],
  'payments.view': ['accounts.view'],
  'payments.manage_status': ['orders.manage'],
  'payments.refund': ['accounts.manage'],
  'refunds.view': ['accounts.view'],
  'refunds.process': ['accounts.manage'],
  'refunds.manage_status': ['orders.manage'],
  'invoices.view': ['accounts.view'],
  'invoices.print': ['orders.view'],
  // settings
  'settings.view': ['settings_center.view'],
  'settings.manage': ['settings_center.manage'],
  'settings.manage_settings': ['settings_center.manage'],
  // security center
  'security.view': ['security_center.view'],
  'security.add': ['security_center.edit'],
  'security.edit': ['security_center.edit'],
  'security.delete': ['security_center.delete'],
  'security.manage': ['security_center.manage'],
  'security.manage_settings': ['security_center.manage'],
  'roles.create': ['security_center.edit'],
  'roles.view': ['security_center.view'],
  'roles.edit': ['security_center.edit'],
  'roles.delete': ['security_center.delete'],
  'roles.assign': ['security_center.manage'],
  'permissions.view': ['security_center.view'],
  'permissions.manage_settings': ['security_center.manage'],
  'audit_logs.view': ['security_center.view'],
  'login_history.view': ['security_center.view'],
  'backup.view': ['security_center.view'],
  'backup.create': ['security_center.manage'],
  'backup.manage_settings': ['security_center.manage'],
  // deliveries / returns -> orders
  'deliveries.view': ['orders.view'],
  'deliveries.create': ['orders.edit'],
  'deliveries.edit': ['orders.edit'],
  'deliveries.manage_status': ['orders.manage'],
  'returns.view': ['orders.view'],
  'returns.create': ['orders.edit'],
  'returns.edit': ['orders.edit'],
  'returns.approve': ['orders.manage'],
  'returns.reject': ['orders.manage'],
  'returns.manage_status': ['orders.manage'],
  // reports
  'reports.sales': ['reports.view'],
  'reports.products': ['reports.view'],
  'reports.customers': ['reports.view'],
  'reports.finance': ['reports.view'],
  'reports.inventory': ['reports.view'],
  'reports.marketing': ['reports.view'],
};

export function resolvePermissionCandidates(code: string): string[] {
  const variants = new Set<string>();
  const add = (value?: string | null) => {
    if (value && value.trim()) variants.add(value.trim());
  };

  const normalized = code?.trim() || '';
  if (!normalized) return [];

  add(normalized);

  for (const [legacy, targets] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
    if (legacy === normalized) {
      targets.forEach(add);
    }
  }

  return Array.from(variants);
}

// ------------------------------------------------------------
// ROUTE -> REQUIRED PERMISSION MAP
// Used by the middleware / forbidden gate so every admin page is
// protected regardless of which UI rendered the link.
//
// Banned-but-existing scaffold pages (brands, returns, payments,
// shipping, ...) map to the `system.disabled` sentinel. The sentinel
// is not a real permission and can never be granted, so every
// non-super-admin is denied at the middleware layer and redirected
// to /admin/forbidden. super_admin / owner pass via the has_permission()
// bypass in the RPC.
// ------------------------------------------------------------
export const ADMIN_ROUTE_PERMISSIONS: Record<string, string> = {
  // ---- real modules ----
  '/admin/dashboard': 'dashboard.view',
  '/admin/analytics': 'analytics.view',
  '/admin/accounting': 'accounts.view',
  '/admin/categories': 'categories.view',
  '/admin/products': 'products.view',
  '/admin/products/new': 'products.edit',
  '/admin/orders': 'orders.view',
  '/admin/order-requests': 'order_requests.view',
  '/admin/design-requests': 'design_requests.view',
  '/admin/warehouse': 'warehouse.view',
  '/admin/warehouse/orders': 'orders.view',
  '/admin/warehouse/products': 'products.view',
  '/admin/warehouse/activity': 'inventory.view',
  '/admin/warehouse/staff': 'warehouse.view',
  '/admin/warehouse/settings': 'settings_center.view',
  '/admin/customers': 'customers.view',
  '/admin/reviews': 'reviews.view',
  '/admin/messages': 'messages.view',
  '/admin/users': 'users.view',
  '/admin/security': 'security_center.view',
  '/admin/security/roles': 'security_center.view',
  '/admin/marketing/settings': 'marketing.view',
  '/admin/marketing/seo': 'marketing.view',
  '/admin/marketing/social-media': 'marketing.view',
  '/admin/marketing/meta-pixel': 'marketing.view',
  '/admin/marketing/coupons': 'offer_campaign.view',
  '/admin/marketing/free-shipping': 'offer_campaign.view',
  '/admin/marketing/popup-campaigns': 'offer_campaign.view',
  '/admin/marketing/flash-sale': 'offer_campaign.view',
  '/admin/marketing/special-offer': 'offer_campaign.view',
  '/admin/marketing/email-campaigns': 'offer_campaign.view',
  '/admin/marketing/site-images': 'display_pages.view',
  '/admin/marketing/services': 'display_pages.view',
  '/admin/marketing/faq': 'display_pages.view',
  '/admin/inventory': 'inventory.view',
  '/admin/inventory/products': 'inventory.view',
  '/admin/inventory/warehouses': 'warehouse.view',
  '/admin/inventory/transfers': 'inventory.view',
  '/admin/inventory/stock-movements': 'inventory.view',
  '/admin/coupons': 'offer_campaign.view',
  '/admin/settings': 'settings_center.view',
  '/admin/settings/general': 'settings_center.view',
  '/admin/settings/theme': 'settings_center.view',
  '/admin/settings/banners': 'settings_center.view',
  '/admin/settings/about': 'display_pages.view',
  '/admin/settings/social': 'settings_center.view',
  '/admin/settings/shipping': 'settings_center.view',
  '/admin/settings/seo': 'marketing.view',
  '/admin/settings/security': 'security_center.view',
  '/admin/settings/notifications': 'settings_center.view',
  '/admin/settings/legal-pages': 'display_pages.view',
  '/admin/settings/homepage': 'display_pages.view',
  '/admin/settings/email': 'settings_center.view',
  '/admin/support': 'support.view',
  '/admin/support/tickets': 'support.view',
  '/admin/support/messages': 'messages.view',
  '/admin/reports': 'reports.view',
  '/admin/reports/sales': 'reports.view',
  '/admin/reports/profit-loss': 'reports.view',
  '/admin/reports/products': 'reports.view',
  '/admin/reports/payments': 'reports.view',
  '/admin/reports/orders': 'reports.view',
  '/admin/reports/inventory': 'reports.view',
  '/admin/reports/expenses': 'reports.view',
  '/admin/reports/dashboard': 'reports.view',
  '/admin/reports/customers': 'reports.view',

  // ---- banned scaffold pages (dead modules) -> super-admin only ----
  '/admin/products/brands': 'system.disabled',
  '/admin/returns': 'system.disabled',
  '/admin/payments': 'system.disabled',
  '/admin/payments/settings': 'system.disabled',
  '/admin/payments/refunds': 'system.disabled',
  '/admin/shipping/zones': 'system.disabled',
  '/admin/shipping/couriers': 'system.disabled',
};

/**
 * Find the required permission for a given admin pathname (longest prefix match).
 */
export function permissionForPath(pathname: string): string | null {
  let best: { len: number; perm: string } | null = null;
  for (const [route, perm] of Object.entries(ADMIN_ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      if (!best || route.length > best.len) best = { len: route.length, perm };
    }
  }
  return best?.perm ?? null;
}
