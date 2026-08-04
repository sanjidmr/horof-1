'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
 * STRICT RBAC — the single source of truth is the database:
 *   user_roles -> role_permissions (+ user_permissions overrides).
 * There is deliberately NO fallback that grants an internal user full
 * access based on profiles.role. Warehouse staff receive their access
 * through the seeded `warehouse_staff` role (see migration
 * 20260805000002_rbac_permission_matrix.sql).
 */
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isWarehouseStaff } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchPermissions = useCallback(async () => {
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
  }, [user, isAdmin, isWarehouseStaff, supabase]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const permSet = useMemo(() => new Set(permissions), [permissions]);
  const roleSet = useMemo(() => new Set(roles), [roles]);

  const hasPermission = useCallback((code: string) => permSet.has(code), [permSet]);
  const hasAnyPermission = useCallback((codes: string[]) => codes.some((c) => permSet.has(c)), [permSet]);
  const hasAllPermissions = useCallback((codes: string[]) => codes.every((c) => permSet.has(c)), [permSet]);
  const hasRole = useCallback((name: string) => roleSet.has(name), [roleSet]);
  const hasAnyRole = useCallback((names: string[]) => names.some((n) => roleSet.has(n)), [roleSet]);
  const isSuperAdmin = roleSet.has('super_admin') || roleSet.has('owner');

  return (
    <PermissionContext.Provider
      value={{
        permissions, roles, loading,
        hasPermission, hasAnyPermission, hasAllPermissions,
        hasRole, hasAnyRole, isSuperAdmin,
        refresh: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
