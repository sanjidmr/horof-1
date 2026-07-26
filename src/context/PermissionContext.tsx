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

      if (roleNames.includes('super_admin') || roleNames.includes('owner')) {
        const { data: allPerms } = await supabase.from('permissions').select('code');
        setPermissions((allPerms || []).map((p: any) => p.code as string));
        setLoading(false);
        return;
      }

      const roleIds = (userRoles || []).map((ur: any) => ur.role?.id).filter(Boolean);
      if (roleIds.length > 0) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission:permission_id(code)')
          .eq('granted', true)
          .in('role_id', roleIds);

        const codes = (rolePerms || []).map((rp: any) => rp.permission?.code).filter(Boolean) as string[];
        setPermissions(codes);
      } else if (isWarehouseStaff) {
        setPermissions([
          'dashboard.view',
          'inventory.view',
          'orders.view',
          'orders.edit',
          'products.view',
          'products.edit',
          'warehouse.view',
          'warehouse.manage',
        ]);
      } else if (isAdmin) {
        const { data: allPerms } = await supabase.from('permissions').select('code');
        setPermissions((allPerms || []).map((p: any) => p.code as string));
        setRoles(['super_admin']);
      } else {
        setPermissions([]);
      }
    } catch (err) {
      console.warn('Permission fetch failed:', err);
      if (isWarehouseStaff) {
        setPermissions([
          'dashboard.view',
          'inventory.view',
          'orders.view',
          'orders.edit',
          'products.view',
          'products.edit',
          'warehouse.view',
          'warehouse.manage',
        ]);
        setRoles(['warehouse_staff']);
      } else if (isAdmin) {
        setPermissions([
          'dashboard.view', 'orders.view', 'orders.edit', 'orders.create',
          'orders.delete', 'orders.manage_status', 'orders.manage_refunds', 'orders.export', 'orders.approve', 'orders.print',
          'products.view', 'products.create', 'products.edit', 'products.delete',
          'products.export', 'products.import', 'products.archive', 'products.duplicate', 'products.settings',
          'categories.view', 'categories.manage',
          'brands.view', 'brands.manage',
          'customers.view', 'customers.manage', 'customers.ban', 'customers.delete', 'customers.export',
          'inventory.view', 'inventory.manage', 'inventory.transfers', 'inventory.export', 'inventory.adjust',
          'warehouse.view', 'warehouse.manage',
          'suppliers.view', 'suppliers.manage',
          'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.edit', 'purchase_orders.approve',
          'stock_movement.view', 'stock_movement.export',
          'reports.view', 'reports.export', 'reports.sales', 'reports.products',
          'reports.customers', 'reports.finance', 'reports.inventory', 'reports.marketing',
          'analytics.view', 'analytics.manage',
          'marketing.coupons', 'marketing.campaigns', 'marketing.content', 'marketing.bundles',
          'marketing.flash_sale', 'marketing.special_offer', 'marketing.popups',
          'marketing.email_campaigns', 'marketing.site_visuals', 'marketing.services', 'marketing.faq',
          'users.view', 'users.manage', 'users.roles', 'users.create', 'users.edit',
          'users.delete', 'users.suspend', 'users.manage_roles', 'users.manage_permissions',
          'users.reset_password', 'users.force_logout',
          'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.clone',
          'permissions.view', 'permissions.manage',
          'settings.view', 'settings.manage', 'settings.general', 'settings.theme',
          'settings.homepage', 'settings.banners',
          'security.view', 'security.manage', 'security.backup', 'security.fraud',
          'security.audit_logs', 'security.login_history', 'security.sessions',
          'support.chat', 'support.tickets',
          'contact_messages.view', 'contact_messages.manage',
          'finance.view', 'finance.manage',
          'seo.view', 'seo.manage',
          'notifications.view', 'notifications.manage',
          'blog.view', 'blog.manage',
          'faq.view', 'faq.manage',
          'testimonials.view', 'testimonials.manage',
          'reviews.view', 'reviews.manage',
          'media.view', 'media.upload', 'media.delete',
          'invoices.view', 'invoices.create', 'invoices.print', 'invoices.export',
          'refunds.view', 'refunds.approve', 'refunds.reject', 'refunds.process',
          'returns.view', 'returns.manage',
          'delivery.view', 'delivery.manage',
          'shipping.view', 'shipping.manage',
          'payments.view', 'payments.manage', 'payments.refund',
          'backup.view', 'backup.create', 'backup.restore', 'backup.delete', 'backup.schedule',
          'system_logs.view', 'system_logs.manage',
          'activity_logs.view',
        ]);
        setRoles(['super_admin']);
      } else {
        setPermissions([]);
        setRoles([]);
      }
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
