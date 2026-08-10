import { User } from '@supabase/supabase-js';

/**
 * Determines the redirect URL after authentication based on user role.
 *
 * - Admin / Super Admin → /admin/dashboard
 * - Warehouse Staff → /admin/warehouse/orders
 * - Customer → `next` param if provided (e.g. /checkout), otherwise home page (/)
 *
 * The `next` param is ONLY honored for customers. Admin/staff are always
 * sent to their respective dashboards for security.
 */
export function getRoleBasedRedirect(
  authUser: User | null | undefined,
  explicitNext?: string | null
): string {
  const meta = authUser?.user_metadata || {};
  const appMeta = authUser?.app_metadata || {};

  // Warehouse staff detection — auth metadata only (no DB dependency)
  const isWarehouseStaff =
    meta.is_warehouse_staff === true ||
    appMeta.is_warehouse_staff === true ||
    meta.role === 'warehouse_staff' ||
    appMeta.role === 'warehouse_staff';
  if (isWarehouseStaff) {
    return '/admin/warehouse';
  }

  // Admin / Super Admin detection
  const isAdmin =
    meta.role === 'admin' ||
    appMeta.role === 'admin' ||
    meta.role === 'super_admin' ||
    appMeta.role === 'super_admin';
  if (isAdmin) {
    return '/admin/dashboard';
  }

  // Customer — honor explicit next param for post-login flows (e.g. checkout)
  if (explicitNext && explicitNext.startsWith('/')) {
    return explicitNext;
  }

  return '/';
}

/**
 * Safely resolves a redirect target.
 * Returns the given redirect if it's a valid internal path, otherwise '/'.
 */
export function safeRedirectPath(redirect: string | null | undefined): string {
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }
  return '/';
}