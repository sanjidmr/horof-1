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

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchPermissions = useCallback(async () => {
    if (!user || !isAdmin) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const [permRes, rolesRes] = await Promise.all([
        supabase.rpc('get_user_permissions', { p_user_id: user.id }).maybeSingle(),
        supabase.from('user_roles').select('role:role_id(name)').eq('user_id', user.id),
      ]);

      if (permRes.data && Array.isArray(permRes.data) && permRes.data.length > 0) {
        const granted = permRes.data
          .filter((p: any) => p.granted)
          .map((p: any) => p.permission_code as string);
        setPermissions(granted);
      } else if (permRes.error || !permRes.data || (Array.isArray(permRes.data) && permRes.data.length === 0)) {
        // RPC failed or returned empty — migration not run or no user_roles assigned
        // Fallback: admin users get ALL permissions for backward compatibility
        const { data: allPerms } = await supabase.from('permissions').select('code');
        if (allPerms && allPerms.length > 0) {
          setPermissions(allPerms.map((p: any) => p.code));
        } else {
          setPermissions([]);
        }
      }

      if (rolesRes.data && rolesRes.data.length > 0) {
        const roleNames = rolesRes.data.map((ur: any) => ur.role?.name).filter(Boolean) as string[];
        setRoles(roleNames);
      } else {
        // No user_roles — fallback to treating admin as super_admin
        setRoles(['super_admin']);
      }
    } catch (err) {
      // RPC doesn't exist yet or other error — grant all permissions to admin
      console.warn('Permission fetch failed, granting full access to admin:', err);
      try {
        const { data: allPerms } = await supabase.from('permissions').select('code');
        if (allPerms && allPerms.length > 0) {
          setPermissions(allPerms.map((p: any) => p.code));
        }
      } catch {}
      setRoles(['super_admin']);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, supabase]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const permSet = useMemo(() => new Set(permissions), [permissions]);
  const roleSet = useMemo(() => new Set(roles), [roles]);

  const hasPermission = useCallback((code: string) => permSet.has(code), [permSet]);
  const hasAnyPermission = useCallback((codes: string[]) => codes.some(c => permSet.has(c)), [permSet]);
  const hasAllPermissions = useCallback((codes: string[]) => codes.every(c => permSet.has(c)), [permSet]);
  const hasRole = useCallback((name: string) => roleSet.has(name), [roleSet]);
  const hasAnyRole = useCallback((names: string[]) => names.some(n => roleSet.has(n)), [roleSet]);
  const isSuperAdmin = roleSet.has('super_admin') || roleSet.has('owner');

  return (
    <PermissionContext.Provider value={{
      permissions, roles, loading,
      hasPermission, hasAnyPermission, hasAllPermissions,
      hasRole, hasAnyRole, isSuperAdmin,
      refresh: fetchPermissions,
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
