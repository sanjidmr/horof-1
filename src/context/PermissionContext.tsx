'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolvePermissionCandidates } from '@/lib/auth/permissions';

interface PermissionContextValue {
  permissions: string[];
  roles: string[];
  loading: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  hasRole: (name: string) => boolean;
  hasAnyRole: (names: string[]) => boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  roles: [],
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  hasRole: () => false,
  hasAnyRole: () => false,
  isSuperAdmin: false,
  refresh: async () => {},
});

/**
 * Resolves the caller's effective permission codes.
 *
 * RBAC — the primary source of truth is the database:
 *   user_roles -> role_permissions (+ user_permissions overrides).
 *
 * There is intentionally NO profile-role fallback (e.g. "profile.role is
 * admin so grant every permission"). Granting access must flow exclusively
 * through user_roles -> role_permissions. This mirrors the hardened
 * has_permission() RPC and the middleware, so the frontend can never show
 * more access than the backend actually grants. Internal profiles are
 * guaranteed a role assignment by migration 20260810000000.
 */
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isWarehouseStaff, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchPermissions = useCallback(async () => {
    // The auth session has not resolved yet. Keep `loading` as true so
    // RBAC consumers (e.g. the client-side admin guard) never see an empty
    // permission set and wrongly redirect to /admin/forbidden on a fresh
    // page load / new tab. This races was previously causing the packing
    // slip page to redirect to "Access Denied" right after rendering.
    if (authLoading) {
      return;
    }

    if (!user || (!isAdmin && !isWarehouseStaff)) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role:role_id(id, name)')
        .eq('user_id', user.id);

      const roleNames = (userRoles || []).map((ur: any) => ur.role?.name).filter(Boolean) as string[];
      setRoles(roleNames);

      // super_admin and owner are unrestricted.
      if (roleNames.includes('super_admin') || roleNames.includes('owner')) {
        const { data: allPerms } = await supabase.from('permissions').select('code');
        setPermissions((allPerms || []).map((p: any) => p.code as string));
        setLoading(false);
        return;
      }

      const roleIds = (userRoles || []).map((ur: any) => ur.role?.id).filter(Boolean) as string[];
      const codes = new Set<string>();

      if (roleIds.length > 0) {
        const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission:permission_id(code)')
        .eq('granted', true)
        .in('role_id', roleIds);
        (rolePerms || []).forEach((rp: any) => {
          if (rp.permission?.code) codes.add(rp.permission.code);
        });
      }

      // Per-user granted overrides.
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('permission:permission_id(code)')
        .eq('user_id', user.id)
        .eq('granted', true);

      (userPerms || []).forEach((up: any) => {
        if (up.permission?.code) codes.add(up.permission.code);
      });

      setPermissions(Array.from(codes));
    } catch (err) {
      console.warn('Permission fetch failed:', err);
      setPermissions([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isWarehouseStaff, supabase, authLoading]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const permSet = useMemo(() => new Set(permissions), [permissions]);
  const roleSet = useMemo(() => new Set(roles), [roles]);

  const hasPermission = useCallback((code: string) => {
    const candidates = resolvePermissionCandidates(code);
    return candidates.some((candidate) => permSet.has(candidate));
  }, [permSet]);

  const hasAnyPermission = useCallback((codes: string[]) => codes.some((c) => hasPermission(c)), [hasPermission]);
  const hasAllPermissions = useCallback((codes: string[]) => codes.every((c) => hasPermission(c)), [hasPermission]);
  const hasRole = useCallback((name: string) => roleSet.has(name), [roleSet]);
  const hasAnyRole = useCallback((names: string[]) => names.some((n) => roleSet.has(n)), [roleSet]);
  const isSuperAdmin = roleSet.has('super_admin') || roleSet.has('owner');

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions, roles, loading,
      hasPermission, hasAnyPermission, hasAllPermissions,
      hasRole, hasAnyRole, isSuperAdmin,
      refresh: fetchPermissions,
    }),
    [permissions, roles, loading, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, isSuperAdmin, fetchPermissions],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
