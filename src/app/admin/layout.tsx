import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminLayoutClient from './AdminLayoutClient';
import { isInternalAdminRole } from '@/lib/auth/roles';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};

  const isWarehouseStaffMeta = meta.is_warehouse_staff === true || appMeta.is_warehouse_staff === true;
  const isAdminMeta = isInternalAdminRole(meta.role) || isInternalAdminRole(appMeta.role);

  let profile: any = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role,email,avatar_url,is_warehouse_staff,assigned_warehouse_id')
      .eq('id', user.id)
      .single();
    profile = data;
  } catch {
    // Profile query can fail if columns don't exist — auth metadata is the fallback
  }

  const isWarehouseStaff = isWarehouseStaffMeta || profile?.is_warehouse_staff === true || profile?.role === 'warehouse_staff';
  const isAdmin = isAdminMeta || isInternalAdminRole(profile?.role);
  const isAllowed = isAdmin || isWarehouseStaff;

  if (!isAllowed) redirect('/login?error=forbidden');

  const mergedProfile = {
    email: profile?.email ?? user.email ?? null,
    avatar_url: profile?.avatar_url ?? null,
    is_warehouse_staff: isWarehouseStaff,
    role: isAdmin ? 'admin' : isWarehouseStaff ? 'warehouse_staff' : profile?.role ?? 'customer',
    assigned_warehouse_id: profile?.assigned_warehouse_id ?? null,
  };

  return (
    <AdminLayoutClient user={user} profile={mergedProfile}>
      {children}
    </AdminLayoutClient>
  );
}
