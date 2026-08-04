import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CouponManager } from '@/components/admin/marketing/CouponManager';
import type { CouponRow } from '@/lib/actions/coupons';

export default async function AdminCouponsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('coupons').select('*').order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coupons</h1>
        <p className="text-sm text-slate-500">Create and manage discount codes for your customers.</p>
      </div>
      
      <CouponManager initialCoupons={(data || []) as CouponRow[]} />
    </div>
  );
}
