import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EmailCampaignManager } from '@/components/admin/marketing/EmailCampaignManager';

export default async function AdminEmailCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  const { data: templates } = await supabase
    .from('email_templates')
    .select('*')
    .order('name');
  const { count: subscriberCount } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Campaigns</h1>
        <p className="text-sm text-slate-500">
          Create, schedule, and send email campaigns to your subscribers. {subscriberCount ?? 0} active subscribers.
        </p>
      </div>
      <EmailCampaignManager
        initialCampaigns={(campaigns as any[]) || []}
        initialTemplates={(templates as any[]) || []}
      />
    </div>
  );
}
