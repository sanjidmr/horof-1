import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AccountingClient } from '@/components/admin/accounting/AccountingClient';
import { getAccountingDashboardData } from '@/lib/actions/accounting';

export default async function AdminAccountingPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'super_admin', 'manager', 'staff'].includes(profile?.role)) redirect('/dashboard');

  const data = await getAccountingDashboardData();

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading...</div>}>
      <AccountingClient initialData={data as any} />
    </Suspense>
  );
}
