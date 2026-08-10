import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import CustomerLayoutClient from '../customer/CustomerLayoutClient';

export default async function DesignRequestsLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, avatar_url, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role === 'admin') {
    if (profile?.role === 'admin') redirect('/admin/dashboard');
  }

  return (
    <CustomerLayoutClient user={user} profile={profile}>
      {children}
    </CustomerLayoutClient>
  );
}