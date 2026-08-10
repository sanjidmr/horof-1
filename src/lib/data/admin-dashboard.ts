import type { SupabaseClient } from '@supabase/supabase-js';
import { startOfDay, subDays, format } from 'date-fns';

export async function fetchAdminDashboard(supabase: SupabaseClient) {
  const today = startOfDay(new Date());
  const todayIso = today.toISOString();
  const tomorrowIso = new Date(today.getTime() + 86400000).toISOString();
  const d30 = subDays(today, 30).toISOString();
  const d14 = subDays(today, 14).toISOString();
  const d7 = subDays(today, 7).toISOString();

  const { data: ordersAll } = await supabase
    .from('orders')
    .select('id,total_price,status,created_at,user_id');

  const orders = (ordersAll ?? []).map(o => ({
    ...o,
    amount: (o as any).total_price ?? 0
  }));
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const totalSales = nonCancelled.reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const todayOrders = orders.filter((o) => o.created_at >= todayIso && o.created_at < tomorrowIso).length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'paid')
    .reduce((s, o) => s + Number(o.amount ?? 0), 0);

  const { count: totalCustomers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer');

  const { count: visitorsCount } = await supabase.from('visitors').select('id', { count: 'exact', head: true });

  const ordersCountAll = orders.length;
  const conversionRate =
    (visitorsCount ?? 0) > 0 ? Math.round(((ordersCountAll / (visitorsCount ?? 1)) * 100) * 100) / 100 : 0;

  const recentOrderRows = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  const customerIds = [...new Set(recentOrderRows.map((o) => o.user_id))];
  const { data: recentProfiles } = await supabase.from('profiles').select('id,full_name,email').in('id', customerIds);
  const recentOrders = recentOrderRows.map((o) => ({
    id: o.id,
    order_number: `#${o.id.slice(0, 8)}`,
    total: o.amount,
    status: o.status,
    payment_status: o.status === 'paid' ? 'paid' : o.status === 'failed' ? 'failed' : 'pending',
    created_at: o.created_at,
    customer_id: o.user_id,
    customer: recentProfiles?.find((p) => p.id === o.user_id) ?? null,
  }));

  const { data: lowStock } = await supabase
    .from('products')
    .select('id,name,stock,slug')
    .lte('stock', 10)
    .order('stock', { ascending: true })
    .limit(20);

  const paidInRange = orders.filter(
    (o) =>
      o.created_at >= d30 &&
      o.status === 'paid'
  );
  const revenueByDate: Record<string, number> = {};
  for (const row of paidInRange) {
    const d = format(new Date(row.created_at), 'yyyy-MM-dd');
    revenueByDate[d] = (revenueByDate[d] ?? 0) + Number(row.amount ?? 0);
  }
  const revenueChart = [...Array(30)].map((_, i) => {
    const d = format(subDays(today, 29 - i), 'yyyy-MM-dd');
    return { date: d, revenue: revenueByDate[d] ?? 0 };
  });

  const { data: visitorRows } = await supabase.from('visitors').select('created_at').gte('created_at', d14);
  const visitorsByDate: Record<string, number> = {};
  for (const row of visitorRows ?? []) {
    const d = format(new Date(row.created_at), 'yyyy-MM-dd');
    visitorsByDate[d] = (visitorsByDate[d] ?? 0) + 1;
  }
  const visitorsChart = [...Array(14)].map((_, i) => {
    const d = format(subDays(today, 13 - i), 'yyyy-MM-dd');
    return { date: d, visitors: visitorsByDate[d] ?? 0 };
  });

  const statusMap: Record<string, number> = {};
  for (const row of orders) {
    statusMap[row.status] = (statusMap[row.status] ?? 0) + 1;
  }
  const statusChart = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const { data: orderItems } = await supabase.from('order_items').select('quantity,total_price,product_id').limit(8000);
  const pids = [...new Set((orderItems ?? []).map((r) => r.product_id))];
  const { data: prodNames } = pids.length ? await supabase.from('products').select('id,name').in('id', pids) : { data: [] as { id: string; name: string }[] };

  const agg = new Map<string, { name: string; sold: number; revenue: number }>();
  for (const row of orderItems ?? []) {
    const name = prodNames?.find((p) => p.id === row.product_id)?.name ?? 'Product';
    const cur = agg.get(name) ?? { name, sold: 0, revenue: 0 };
    cur.sold += row.quantity ?? 0;
    cur.revenue += Number(row.total_price ?? 0);
    agg.set(name, cur);
  }
  const topSelling = [...agg.values()]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map((x) => ({ ...x, image_url: null as string | null }));

  const { count: newCustomersToday } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', todayIso);

  const { count: newCustomersWeek } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', d7);

  const { count: newCustomersMonth } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', d30);

  const byCust = new Map<string, number>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    byCust.set(o.user_id, (byCust.get(o.user_id) ?? 0) + Number(o.amount ?? 0));
  }
  const topIds = [...byCust.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  let topSpenders: { id: string; full_name: string | null; email: string | null; spent: number }[] = [];
  if (topIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id,full_name,email').in('id', topIds);
    topSpenders = topIds.map((id) => {
      const p = profs?.find((x) => x.id === id);
      return { id, full_name: p?.full_name ?? null, email: p?.email ?? null, spent: byCust.get(id) ?? 0 };
    });
  }

  return {
    totalSales,
    todayOrders,
    pendingOrders,
    totalRevenue,
    totalCustomers: totalCustomers ?? 0,
    conversionRate,
    recentOrders,
    lowStock: lowStock ?? [],
    revenueChart,
    visitorsChart,
    statusChart,
    topSelling,
    newCustomersToday: newCustomersToday ?? 0,
    newCustomersWeek: newCustomersWeek ?? 0,
    newCustomersMonth: newCustomersMonth ?? 0,
    topSpenders,
  };
}
