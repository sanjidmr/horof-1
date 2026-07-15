import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BundleOfferManager } from '@/components/admin/marketing/BundleOfferManager';

export default async function AdminBundleOffersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('bundle_offers')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bundle Offers</h1>
        <p className="text-sm text-slate-500">Create bundle deals like Buy X Get Y, fixed-price bundles, and product combination discounts.</p>
      </div>
      <BundleOfferManager initial={(data as any[]) || []} />
    </div>
  );
}
