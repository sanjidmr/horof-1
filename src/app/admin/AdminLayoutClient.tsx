'use client';

import type { ReactNode } from 'react';
import { AdminSidebar, SidebarContent } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminPageTransition } from '@/components/admin/AdminPageTransition';
import { Sheet, SheetContent } from '@/components/shadcn/sheet';
import { useAdminSidebar } from '@/stores/admin-sidebar-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
