'use client';

import { usePermissions } from '@/context/PermissionContext';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, loading } = usePermissions();

  if (loading) return null;

  let allowed = true;

  if (permission) {
    allowed = allowed && hasPermission(permission);
  }

  if (permissions && permissions.length > 0) {
    allowed = allowed && (requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions));
  }

  if (role) {
    allowed = allowed && hasRole(role);
  }

  if (roles && roles.length > 0) {
    allowed = allowed && hasAnyRole(roles);
  }

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return <>{children}</>;
}

export function DenyButton({ permission, children, ...props }: { permission?: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;
  if (permission && !hasPermission(permission)) return null;

  return <button {...props}>{children}</button>;
}

export function AccessDenied({ message }: { message?: string }) {
  const { isAdmin, isWarehouseStaff } = useAuth();
  const dashboardHref = isWarehouseStaff ? '/admin/warehouse/orders' : (isAdmin ? '/admin/dashboard' : '/customer/dashboard');
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-slate-900">Access Denied</h1>
          <p className="text-slate-500 text-sm">
            {message || "You don't have permission to access this page. Contact your administrator to request access."}
          </p>
        </div>
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a4731] text-white rounded-xl text-sm font-bold hover:bg-[#0e2f20] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
