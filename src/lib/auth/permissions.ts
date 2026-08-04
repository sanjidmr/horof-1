// ============================================================
// SINGLE SOURCE OF TRUTH FOR PERMISSIONS
// ============================================================
// Every permission in the system is defined here as module x action.
// The matching database seed lives in:
//   supabase/migrations/20260805000002_rbac_permission_matrix.sql
// Keeping this file and that migration in sync is mandatory.
//
// Permission code format: `${module}.${action}`
// e.g. products.delete, orders.approve, refunds.view
// ============================================================

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'reject',
  'assign',
  'export',
  'import',
  'print',
  'download',
  'upload',
  'manage_settings',
  'manage_status',
  'manage_notifications',
  'manage_reports',
] as const;

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
  { code: 'dashboard', label: 'Dashboard', actions: ['view', 'export'] },
  { code: 'analytics', label: 'Analytics', actions: ['view', 'export', 'manage_settings'] },
  {
    code: 'products', label: 'Products',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import', 'print', 'manage_settings', 'manage_status'],
  },
  { code: 'brands', label: 'Brands', actions: ['view', 'create', 'edit', 'delete'] },
  { code: 'categories', label: 'Categories', actions: ['view', 'create', 'edit', 'delete'] },
  { code: 'subcategories', label: 'Subcategories', actions: ['view', 'create', 'edit', 'delete'] },
  {
    code: 'inventory', label: 'Inventory & Stock',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage_status'],
  },
  {
    code: 'warehouses', label: 'Warehouses',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'manage_status'],
  },
  { code: 'suppliers', label: 'Suppliers', actions: ['view', 'create', 'edit', 'delete'] },
  {
    code: 'purchase_orders', label: 'Purchase Orders',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'manage_status'],
  },
  { code: 'stock_movement', label: 'Stock Movements', actions: ['view', 'export'] },
  {
    code: 'orders', label: 'Orders',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'print', 'manage_status', 'manage_notifications'],
  },
  {
    code: 'order_requests', label: 'Order Requests',
    actions: ['view', 'create', 'edit', 'approve', 'reject', 'assign', 'manage_status'],
  },
  {
    code: 'returns', label: 'Returns',
    actions: ['view', 'create', 'edit', 'approve', 'reject', 'manage_status', 'print'],
  },
  {
    code: 'refunds', label: 'Refunds',
    actions: ['view', 'approve', 'reject', 'manage_status', 'export'],
  },
  {
    code: 'customers', label: 'Customers',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage_status'],
  },
  {
    code: 'users', label: 'Users',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'export', 'manage_settings', 'manage_status'],
  },
  {
    code: 'roles', label: 'Roles',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'manage_settings'],
  },
  { code: 'permissions', label: 'Permissions', actions: ['view', 'manage_settings'] },
  {
    code: 'security', label: 'Security Center',
    actions: ['view', 'edit', 'export', 'manage_settings'],
  },
  { code: 'audit_logs', label: 'Audit Logs', actions: ['view', 'export'] },
  { code: 'login_history', label: 'Login History', actions: ['view', 'export'] },
  { code: 'sessions', label: 'Sessions', actions: ['view', 'manage_status'] },
  {
    code: 'backup', label: 'Backup & Recovery',
    actions: ['view', 'create', 'delete', 'manage_settings'],
  },
  {
    code: 'notifications', label: 'Notifications',
    actions: ['view', 'create', 'edit', 'delete', 'manage_settings', 'export'],
  },
  {
    code: 'contact_messages', label: 'Contact Messages',
    actions: ['view', 'edit', 'delete', 'export', 'manage_status'],
  },
  {
    code: 'chat', label: 'Support Chat',
    actions: ['view', 'create', 'edit', 'assign', 'manage_status'],
  },
  {
    code: 'support_tickets', label: 'Support Tickets',
    actions: ['view', 'create', 'edit', 'approve', 'reject', 'assign', 'manage_status'],
  },
  {
    code: 'design_requests', label: 'Design Requests',
    actions: ['view', 'create', 'edit', 'approve', 'reject', 'assign', 'manage_status'],
  },
  {
    code: 'reviews', label: 'Reviews',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'manage_status'],
  },
  {
    code: 'coupons', label: 'Coupons',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage_status'],
  },
  {
    code: 'flash_sale', label: 'Flash Sale',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'special_offer', label: 'Special Offer',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'popup_campaigns', label: 'Popup Campaigns',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'email_campaigns', label: 'Email Campaigns',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage_status'],
  },
  {
    code: 'bundle_offers', label: 'Bundle Offers',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'free_shipping', label: 'Free Shipping',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'site_visuals', label: 'Site Visuals',
    actions: ['view', 'create', 'edit', 'delete', 'upload', 'manage_status'],
  },
  { code: 'services', label: 'Our Services', actions: ['view', 'create', 'edit', 'delete'] },
  { code: 'faq', label: 'FAQ', actions: ['view', 'create', 'edit', 'delete', 'manage_status'] },
  { code: 'seo', label: 'SEO & Redirects', actions: ['view', 'edit', 'manage_settings'] },
  {
    code: 'marketing_settings', label: 'Marketing Settings',
    actions: ['view', 'edit', 'manage_settings'],
  },
  {
    code: 'settings', label: 'Settings Center',
    actions: ['view', 'edit', 'manage_settings'],
  },
  {
    code: 'legal_pages', label: 'Legal Pages',
    actions: ['view', 'create', 'edit', 'delete', 'manage_settings'],
  },
  {
    code: 'about_page', label: 'About Page',
    actions: ['view', 'create', 'edit', 'delete', 'manage_settings'],
  },
  {
    code: 'media', label: 'Media Library',
    actions: ['view', 'upload', 'delete', 'manage_settings'],
  },
  {
    code: 'blog', label: 'Blog',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'testimonials', label: 'Testimonials',
    actions: ['view', 'create', 'edit', 'delete', 'manage_status'],
  },
  {
    code: 'invoices', label: 'Invoices',
    actions: ['view', 'create', 'print', 'export'],
  },
  {
    code: 'shipping', label: 'Shipping Zones & Couriers',
    actions: ['view', 'create', 'edit', 'delete', 'manage_settings'],
  },
  {
    code: 'deliveries', label: 'Deliveries',
    actions: ['view', 'create', 'edit', 'manage_status'],
  },
  {
    code: 'payments', label: 'Payments',
    actions: ['view', 'create', 'edit', 'manage_status', 'export'],
  },
  {
    code: 'transactions', label: 'Transactions',
    actions: ['view', 'create', 'edit', 'export'],
  },
  {
    code: 'finance', label: 'Finance & Expenses',
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage_settings'],
  },
  {
    code: 'reports', label: 'Reports',
    actions: ['view', 'export', 'print', 'manage_reports'],
  },
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
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  assign: 'Assign',
  export: 'Export',
  import: 'Import',
  print: 'Print',
  download: 'Download',
  upload: 'Upload',
  manage_settings: 'Settings',
  manage_status: 'Status',
  manage_notifications: 'Notifications',
  manage_reports: 'Reports',
};

// ------------------------------------------------------------
// LEGACY CODES REMAPPED TO THE NEW MATRIX
// Used only as a lookup aid when migrating callsites. Not applied
// at runtime unless a query still references an old code.
// ------------------------------------------------------------
export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'categories.manage': ['categories.create', 'categories.edit', 'categories.delete'],
  'brands.manage': ['brands.create', 'brands.edit', 'brands.delete'],
  'customers.ban': ['customers.edit'],
  'customers.manage': ['customers.edit'],
  'inventory.manage': ['inventory.create', 'inventory.edit', 'inventory.delete'],
  'inventory.adjust': ['inventory.edit'],
  'inventory.transfers': ['inventory.edit'],
  'marketing.coupons': ['coupons.create', 'coupons.edit', 'coupons.delete'],
  'marketing.campaigns': ['email_campaigns.create', 'email_campaigns.edit', 'email_campaigns.delete'],
  'marketing.content': ['site_visuals.create', 'site_visuals.edit', 'site_visuals.delete'],
  'marketing.flash_sale': ['flash_sale.create', 'flash_sale.edit', 'flash_sale.delete'],
  'marketing.bundles': ['bundle_offers.create', 'bundle_offers.edit', 'bundle_offers.delete'],
  'marketing.special_offer': ['special_offer.create', 'special_offer.edit', 'special_offer.delete'],
  'marketing.popups': ['popup_campaigns.create', 'popup_campaigns.edit', 'popup_campaigns.delete'],
  'marketing.email_campaigns': ['email_campaigns.create', 'email_campaigns.edit', 'email_campaigns.delete'],
  'marketing.site_visuals': ['site_visuals.create', 'site_visuals.edit', 'site_visuals.delete'],
  'marketing.services': ['services.create', 'services.edit', 'services.delete'],
  'marketing.faq': ['faq.create', 'faq.edit', 'faq.delete'],
  'users.manage': ['users.create', 'users.edit', 'users.delete'],
  'users.roles': ['users.assign'],
  'users.suspend': ['users.manage_status'],
  'users.manage_roles': ['users.assign'],
  'users.manage_permissions': ['users.manage_settings'],
  'roles.clone': ['roles.create'],
  'permissions.manage': ['permissions.manage_settings'],
  'security.manage': ['security.edit'],
  'security.backup': ['backup.create', 'backup.delete', 'backup.manage_settings'],
  'security.fraud': ['security.edit'],
  'finance.manage': ['finance.edit'],
  'settings.manage': ['settings.edit'],
  'support.chat': ['chat.view', 'chat.create', 'chat.edit'],
  'support.tickets': ['support_tickets.view', 'support_tickets.create', 'support_tickets.edit'],
  'reports.sales': ['reports.view', 'reports.export'],
  'reports.products': ['reports.view', 'reports.export'],
  'reports.customers': ['reports.view', 'reports.export'],
  'reports.finance': ['reports.view', 'reports.export'],
  'reports.inventory': ['reports.view', 'reports.export'],
  'reports.marketing': ['reports.view', 'reports.export'],
  'warehouse.manage': ['warehouses.assign', 'warehouses.manage_status'],
  'users.force_logout': ['users.manage_status'],
  'users.reset_password': ['users.manage_settings'],
  'backup.schedule': ['backup.manage_settings'],
  'backup.restore': ['backup.manage_settings'],
  'reports.export': ['reports.export'],
  'reports.print': ['reports.print'],
  'invoices.print': ['invoices.print'],
  'payments.refund': ['refunds.manage_status'],
  'refunds.process': ['refunds.manage_status'],
};

// ------------------------------------------------------------
// ROUTE -> REQUIRED PERMISSION MAP
// Used by the middleware / forbidden gate so every admin page is
// protected regardless of which UI rendered the link.
// ------------------------------------------------------------
export const ADMIN_ROUTE_PERMISSIONS: Record<string, string> = {
  '/admin/dashboard': 'dashboard.view',
  '/admin/analytics': 'analytics.view',
  '/admin/accounting': 'finance.view',
  '/admin/categories': 'categories.view',
  '/admin/products': 'products.view',
  '/admin/products/new': 'products.create',
  '/admin/products/brands': 'brands.view',
  '/admin/returns': 'returns.view',
  '/admin/orders': 'orders.view',
  '/admin/order-requests': 'order_requests.view',
  '/admin/design-requests': 'design_requests.view',
  '/admin/warehouse': 'inventory.view',
  '/admin/warehouse/orders': 'orders.view',
  '/admin/warehouse/products': 'products.view',
  '/admin/warehouse/activity': 'inventory.view',
  '/admin/customers': 'customers.view',
  '/admin/reviews': 'reviews.view',
  '/admin/messages': 'contact_messages.view',
  '/admin/users': 'users.view',
  '/admin/security': 'security.view',
  '/admin/marketing/settings': 'marketing_settings.view',
  '/admin/marketing/seo': 'seo.view',
  '/admin/marketing/coupons': 'coupons.view',
  '/admin/marketing/free-shipping': 'free_shipping.view',
  '/admin/marketing/popup-campaigns': 'popup_campaigns.view',
  '/admin/marketing/flash-sale': 'flash_sale.view',
  '/admin/marketing/special-offer': 'special_offer.view',
  '/admin/marketing/email-campaigns': 'email_campaigns.view',
  '/admin/marketing/bundle-offers': 'bundle_offers.view',
  '/admin/marketing/site-images': 'site_visuals.view',
  '/admin/marketing/services': 'services.view',
  '/admin/marketing/faq': 'faq.view',
  '/admin/marketing/pixel': 'marketing_settings.view',
  '/admin/marketing/analytics': 'marketing_settings.view',
  '/admin/inventory': 'inventory.view',
  '/admin/inventory/products': 'inventory.view',
  '/admin/inventory/warehouses': 'warehouses.view',
  '/admin/inventory/transfers': 'inventory.view',
  '/admin/inventory/stock-movements': 'stock_movement.view',
  '/admin/shipping/zones': 'shipping.view',
  '/admin/shipping/couriers': 'shipping.view',
  '/admin/settings': 'settings.view',
  '/admin/settings/general': 'settings.view',
  '/admin/settings/theme': 'settings.view',
  '/admin/settings/banners': 'settings.view',
  '/admin/settings/about': 'about_page.view',
  '/admin/settings/social': 'settings.view',
  '/admin/settings/shipping': 'settings.view',
  '/admin/settings/seo': 'seo.view',
  '/admin/settings/security': 'security.view',
  '/admin/settings/notifications': 'settings.view',
  '/admin/settings/legal-pages': 'legal_pages.view',
  '/admin/settings/homepage': 'settings.view',
  '/admin/settings/email': 'settings.view',
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
  '/admin/payments': 'payments.view',
  '/admin/payments/settings': 'payments.view',
  '/admin/payments/refunds': 'refunds.view',
  '/admin/support': 'support_tickets.view',
  '/admin/support/tickets': 'support_tickets.view',
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