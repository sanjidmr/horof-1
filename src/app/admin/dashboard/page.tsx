import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Plus, Eye, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/shadcn/button';
import { DashboardClient } from '@/components/admin/dashboard/DashboardClient';
import { getDashboardData } from '@/lib/actions/dashboard-data';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/dashboard');

  const data = await getDashboardData();

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Welcome back, {profile?.full_name || 'Admin'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl px-5 h-11 shadow-lg shadow-forest-900/10 transition-all hover:-translate-y-0.5 text-sm font-bold">
            <Link href="/admin/products/new"><Plus className="mr-1.5 h-4 w-4" /> Add Product</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-200 text-slate-700 hover:bg-[#1a4731]/5 hover:border-[#1a4731]/30 rounded-xl px-5 h-11 transition-all text-sm font-bold">
            <Link href="/admin/orders"><Eye className="mr-1.5 h-4 w-4" /> Orders</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-200 text-slate-700 hover:bg-[#1a4731]/5 hover:border-[#1a4731]/30 rounded-xl px-5 h-11 transition-all text-sm font-bold">
            <Link href="/admin/messages"><MessageSquare className="mr-1.5 h-4 w-4" /> Messages</Link>
          </Button>
        </div>
      </div>

      <DashboardClient data={data} />
    </div>
  );
}
