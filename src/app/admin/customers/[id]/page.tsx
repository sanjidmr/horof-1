import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { formatPrice } from '@/lib/utils';

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  const { data: ordersAll } = await supabase.from('orders').select('id,total_price,status,created_at').eq('user_id', id).order('created_at', { ascending: false });
  const orders = (ordersAll ?? []).map(o => ({
    ...o,
    amount: (o as any).total_price ?? 0,
    order_number: `#${o.id.slice(0, 8)}`
  }));

  if (!profile) return <p className="text-sm">Not found</p>;

  const spent = (orders ?? []).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.amount || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{profile.full_name ?? profile.email}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Email: {profile.email}</p>
          <p>Phone: {profile.phone ?? '—'}</p>
          <p>Lifetime spend: {formatPrice(spent)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="divide-y rounded-md border">
            {(orders ?? []).map((o) => (
              <li key={o.id} className="flex justify-between px-3 py-2">
                <span className="font-mono text-xs">{o.order_number || `#${o.id.slice(0, 8)}`}</span>
                <span>{formatPrice(Number(o.amount || 0))}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
