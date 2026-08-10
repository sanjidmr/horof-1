import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { formatPrice } from '@/lib/utils';

export default async function AdminPaymentsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from('orders').select('id,amount,total_price,payment_method,payment_status,transaction_id,created_at,customer_name').order('created_at', { ascending: false }).limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">COD Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Orders (Cash on Delivery)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-2">Order</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2">Amount</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-mono text-xs">#{p.id}</td>
                  <td className="py-2 pr-2">{p.customer_name || 'Guest'}</td>
                  <td className="py-2 pr-2">{formatPrice(Number(p.total_price || p.amount || 0))}</td>
                  <td className="py-2 pr-2 capitalize">{p.payment_status || 'pending'}</td>
                  <td className="py-2 text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
