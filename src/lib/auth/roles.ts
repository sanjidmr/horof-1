export const INTERNAL_ADMIN_ROLES = ['admin', 'super_admin', 'manager'] as const;

export const SETTINGS_ADMIN_ROLES = ['admin', 'super_admin'] as const;

export function isInternalAdminRole(role?: string | null | unknown): boolean {
  return typeof role === 'string' && (INTERNAL_ADMIN_ROLES as readonly string[]).includes(role);
}

export function isSettingsAdminRole(role?: string | null | unknown): boolean {
  return typeof role === 'string' && (SETTINGS_ADMIN_ROLES as readonly string[]).includes(role);
}
