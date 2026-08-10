import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LazyAnalyticsDashboardClient } from '@/components/admin/dashboard/LazyAnalyticsDashboardClient';
import { getAnalyticsDashboardData } from '@/lib/actions/analytics-dashboard';

export default async function AdminAnalyticsPage() {
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

  const data = await getAnalyticsDashboardData('this_month');

  return <LazyAnalyticsDashboardClient initialData={data as any} />;
}
