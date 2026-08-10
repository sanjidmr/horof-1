import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ShippingManager } from '@/components/admin/shipping/ShippingManager';

export default async function AdminShippingZonesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('shipping_zones').select('*').order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipping Zones</h1>
        <p className="text-sm text-slate-500">Configure delivery areas and their respective charges.</p>
      </div>
      
      <ShippingManager initialZones={data || []} />
    </div>
  );
}

