import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminLayoutClient from './AdminLayoutClient';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,email,avatar_url,is_warehouse_staff,assigned_warehouse_id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) redirect('/login?error=forbidden');
  const isAllowed = profile.role === 'admin' || profile.role === 'warehouse_staff' || profile.is_warehouse_staff;
  if (!isAllowed) redirect('/login?error=forbidden');

  return (
    <AdminLayoutClient user={user} profile={profile}>
      {children}
    </AdminLayoutClient>
  );
}


