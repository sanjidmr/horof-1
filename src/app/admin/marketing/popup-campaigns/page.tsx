import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PopupCampaignManager } from '@/components/admin/marketing/PopupCampaignManager';

export default async function AdminPopupCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('popup_campaigns')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Popup Campaigns</h1>
        <p className="text-sm text-slate-500">Create popups for lead generation, promotions, announcements, and more.</p>
      </div>
      <PopupCampaignManager initial={(data as any[]) || []} />
    </div>
  );
}
