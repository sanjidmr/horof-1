'use client';

import type { ReactNode } from 'react';
import { AdminSidebar, SidebarContent } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminPageTransition } from '@/components/admin/AdminPageTransition';
import { Sheet, SheetContent } from '@/components/shadcn/sheet';
import { useAdminSidebar } from '@/stores/admin-sidebar-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { permissionForPath, LEGACY_PERMISSION_ALIASES } from '@/lib/auth/permissions';
import { usePermissions } from '@/context/PermissionContext';

const WAREHOUSE_ALLOWED = ['/admin/warehouse', '/admin/warehouse/orders', '/admin/warehouse/products', '/admin/warehouse/activity', '/admin/warehouse/settings'];

export default function AdminLayoutClient({
  children,
  user,
  profile,
}: {
  children: ReactNode;
  user: any;
  profile: any;
}) {
  const mobileOpen = useAdminSidebar((s) => s.mobileOpen);
  const setMobileOpen = useAdminSidebar((s) => s.setMobileOpen);
  const router = useRouter();
  const pathname = usePathname();
  const { hasAnyPermission, loading: permLoading, isSuperAdmin } = usePermissions();

  // Use the merged profile from server layout (already combines auth metadata + DB)
  const isWarehouseStaff = profile?.is_warehouse_staff === true || profile?.role === 'warehouse_staff';
  const isAdmin = ['admin', 'super_admin', 'manager', 'staff'].includes(profile?.role);

  useEffect(() => {
    if (isWarehouseStaff && !isAdmin) {
      const isAllowed = WAREHOUSE_ALLOWED.some(prefix => pathname.startsWith(prefix));
      if (!isAllowed) {
        toast.error('Access denied — warehouse staff only');
        router.push('/admin/warehouse/orders');
      }
    }
  }, [pathname, isWarehouseStaff, isAdmin, router]);

  // Per-route RBAC guard: mirrors the middleware so navigation can never
  // silently bypass a page-level permission. Renders nothing for the
  // fragment while permissions resolve, then redirects fail-closed.
  //
  // EXCEPTION: warehouse staff on /admin/warehouse/* routes are allowed
  // through without permission checks (already validated server-side by
  // middleware + layout; client-side permission loading requires migration
  // 20260810000000 to be applied).
  useEffect(() => {
    if (permLoading) return;
    if (isSuperAdmin) return;
    if (isWarehouseStaff && pathname.startsWith('/admin/warehouse')) return;
    const required = permissionForPath(pathname);
    if (!required) return;
    const candidates = [required, ...(LEGACY_PERMISSION_ALIASES[required] ?? [])];
    if (!hasAnyPermission(candidates)) {
      router.replace('/admin/forbidden');
    }
  }, [pathname, permLoading, isSuperAdmin, isWarehouseStaff, hasAnyPermission, router]);

  const logout = async () => {
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-svh overflow-hidden bg-white text-slate-900">
      <AdminSidebar />

      {/* Mobile Sidebar (Bottom Drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="h-[80vh] p-0 border-t-[#1B4332] bg-[#1B4332] overflow-hidden rounded-t-xl">
          <SidebarContent logout={logout} closeMobile={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar email={profile.email ?? user.email ?? null} avatarUrl={profile.avatar_url ?? null} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <AdminPageTransition>{children}</AdminPageTransition>
        </main>
      </div>
    </div>
  );
}
