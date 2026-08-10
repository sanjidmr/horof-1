import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FreeShippingManager } from '@/components/admin/marketing/FreeShippingManager';

export default async function AdminFreeShippingPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('free_shipping_offers')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Free Shipping Offers</h1>
        <p className="text-sm text-slate-500">Set up free shipping promotions based on order thresholds, coupons, or specific districts.</p>
      </div>
      <FreeShippingManager initial={(data as any[]) || []} />
    </div>
  );
}
