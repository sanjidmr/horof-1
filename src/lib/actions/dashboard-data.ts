'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const from30 = subDays(new Date(), 30).toISOString();
  const todayStart = startOfDay(new Date()).toISOString();

  const [productRes, orderRes, customerRes, ordersListRes, msgRes, dailySalesRes, profitLossRes, catSalesRes, invSummaryRes, orderStatusRes] = await Promise.all([
    supabase.from('products').select('id,stock,stock_status,is_active,cost_price,price').limit(9999),
    supabase.from('orders').select('id,total,status,payment_status,created_at'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'customer').eq('role', 'customer').eq('is_warehouse_staff', false),
    supabase.from('orders').select('id,total,status,created_at,profiles!customer_id(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('contact_messages').select('id,name,subject,message,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.rpc('get_daily_sales', { from_date: from30, to_date: new Date().toISOString() }),
    supabase.rpc('get_profit_loss', { from_date: from30, to_date: new Date().toISOString() }),
    supabase.rpc('get_sales_by_category', { from_date: from30, to_date: new Date().toISOString() }),
    supabase.from('products').select('id,stock,stock_status,min_stock_level'),
    supabase.from('orders').select('status'),
  ]);

  const products = productRes.data ?? [];
  const orders = orderRes.data ?? [];
  const activeProducts = products.filter((p: any) => p.is_active);
  const totalStock = products.reduce((s: number, p: any) => s + (p.stock || 0), 0);
  const lowStockItems = products.filter((p: any) => p.stock_status === 'low_stock' || (p.stock <= (p.min_stock_level ?? 5) && p.stock > 0));
  const outOfStockItems = products.filter((p: any) => p.stock_status === 'out_of_stock' || p.stock === 0);

  const nonCancelled = orders.filter((o: any) => o.status !== 'cancelled');
  const totalRevenue = nonCancelled.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const paidOrders = orders.filter((o: any) => o.payment_status === 'paid');
  const paidRevenue = paidOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const orderCount = orders.length;
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

  const invValue = products.reduce((s: number, p: any) => s + ((p.cost_price || 0) * (p.stock || 0)), 0);

  const dailySales = (dailySalesRes.data ?? []) as any[];
  const profitLoss = (profitLossRes.data ?? []) as { category: string; amount: number }[];
  const catSales = (catSalesRes.data ?? []) as any[];

  const plSummary = {
    revenue: profitLoss.find((r: any) => r.category === 'Revenue')?.amount ?? 0,
    cogs: Math.abs(profitLoss.find((r: any) => r.category === 'COGS')?.amount ?? 0),
    grossProfit: profitLoss.find((r: any) => r.category === 'Gross Profit')?.amount ?? 0,
    shipping: Math.abs(profitLoss.find((r: any) => r.category === 'Shipping Cost')?.amount ?? 0),
    discounts: Math.abs(profitLoss.find((r: any) => r.category === 'Discounts Given')?.amount ?? 0),
    refunds: Math.abs(profitLoss.find((r: any) => r.category === 'Refunds')?.amount ?? 0),
    netProfit: profitLoss.find((r: any) => r.category === 'Net Profit')?.amount ?? 0,
  };

  const statusCounts = (orderStatusRes.data ?? []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusChart = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return {
    stats: {
      totalRevenue,
      paidRevenue,
      orderCount,
      customerCount: customerRes.count ?? 0,
      productCount: activeProducts.length,
      totalStock,
      pendingOrders,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      inventoryValue: invValue,
      aov: nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0,
    },
    dailySales,
    profitLoss: profitLoss,
    plSummary,
    salesByCategory: catSales,
    orderStatusChart,
    recentOrders: ordersListRes.data ?? [],
    recentMessages: msgRes.data ?? [],
  };
}
