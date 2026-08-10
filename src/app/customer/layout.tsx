import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import CustomerLayoutClient from './CustomerLayoutClient';

export default async function CustomerLayout({ children }: { children: ReactNode }) {
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
    // Admins should probably be in admin dashboard, but they can view it. Or we just redirect them.
    // Let's redirect admin to admin dashboard if they try to access customer routes.
    if (profile?.role === 'admin') redirect('/admin/dashboard');
  }

  return (
    <CustomerLayoutClient user={user} profile={profile}>
      {children}
    </CustomerLayoutClient>
  );
}
