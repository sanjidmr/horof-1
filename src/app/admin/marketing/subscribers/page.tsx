import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SubscriberManager } from '@/components/admin/marketing/SubscriberManager';

export default async function AdminSubscribersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  const { count: activeCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const sources = [...new Set((subscribers ?? []).map((s: any) => s.source))] as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscribers</h1>
        <p className="text-sm text-slate-500">
          Manage your email subscribers. {activeCount ?? 0} active subscribers.
        </p>
      </div>
      <SubscriberManager
        initialSubscribers={(subscribers as any[]) || []}
        initialSources={sources}
      />
    </div>
  );
}
