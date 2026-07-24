'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type DateRange = { from: string; to: string };

function parseRange(raw: string | undefined): DateRange {
  const today = new Date();
  if (!raw) return { from: subDays(today, 30).toISOString(), to: endOfDay(today).toISOString() };

  const parts = raw.split('..');
  if (parts.length === 2) {
    return { from: startOfDay(new Date(parts[0])).toISOString(), to: endOfDay(new Date(parts[1])).toISOString() };
  }
  return { from: subDays(today, 30).toISOString(), to: endOfDay(today).toISOString() };
}

// ─── DASHBOARD KPIs ────────────────────────────────────────
export async function getDashboardKpis(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);
  const todayStart = startOfDay(new Date()).toISOString();
  const yesterdayStart = subDays(new Date(), 1).toISOString();
  const weekStart = subDays(new Date(), 7).toISOString();

  try {
    const [ordersRes, todayOrdersRes, yesterdayOrdersRes, weekOrdersRes, customersRes, productsRes, visitorsRes, salesCatRes] = await Promise.all([
      supabase.from('orders').select('id,total,status,payment_status,created_at').gte('created_at', from).lte('created_at', to),
      supabase.from('orders').select('id,total', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('orders').select('id,total', { count: 'exact', head: true }).gte('created_at', yesterdayStart).lt('created_at', todayStart),
      supabase.from('orders').select('id,total', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', from),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('visitors').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to),
      supabase.rpc('get_sales_by_category', { from_date: from, to_date: to }),
    ]);

    const orders = (ordersRes.data ?? []) as any[];
    const nonCancelled = orders.filter((o: any) => o.status !== 'cancelled');
    const paid = orders.filter((o: any) => o.payment_status === 'paid');

    const totalRevenue = nonCancelled.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const paidRevenue = paid.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
    const totalOrders = nonCancelled.length;
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const visitorsCount = visitorsRes.count ?? 0;
    const conversionRate = visitorsCount > 0 ? Math.round((totalOrders / visitorsCount) * 10000) / 100 : 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const revenueChart = await getRevenueChart(supabase, from, to);

    return {
      totalRevenue, paidRevenue, totalOrders, pendingOrders,
      totalCustomers: customersRes.count ?? 0,
      totalProducts: productsRes.count ?? 0,
      todayOrders: todayOrdersRes.count ?? 0,
      yesterdayOrders: yesterdayOrdersRes.count ?? 0,
      weekOrders: weekOrdersRes.count ?? 0,
      conversionRate, aov,
      revenueChart,
      salesByCategory: salesCatRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getDashboardKpis error:', err?.message || err);
    return {
      totalRevenue: 0, paidRevenue: 0, totalOrders: 0, pendingOrders: 0,
      totalCustomers: 0, totalProducts: 0, todayOrders: 0, yesterdayOrders: 0,
      weekOrders: 0, conversionRate: 0, aov: 0, revenueChart: [], salesByCategory: [],
    };
  }
}

async function getRevenueChart(supabase: any, from: string, to: string) {
  const { data } = await supabase.rpc('get_daily_sales', { from_date: from, to_date: to });
  return (data ?? []) as { date: string; orders: number; revenue: number; items_sold: number; avg_order_value: number }[];
}

// ─── SALES REPORTS ──────────────────────────────────────────
export async function getSalesReport(groupBy: 'daily' | 'weekly' | 'monthly' | 'yearly', range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [dailyRes, categoryRes, couponRes] = await Promise.all([
      supabase.rpc('get_daily_sales', { from_date: from, to_date: to }),
      supabase.rpc('get_sales_by_category', { from_date: from, to_date: to }),
      supabase.rpc('get_coupon_report', { from_date: from, to_date: to }),
    ]);

    const daily = (dailyRes.data ?? []) as any[];
    const allOrders = (await supabase.from('orders').select('total,shipping_charge,discount,status,payment_status').gte('created_at', from).lte('created_at', to)).data ?? [];

    const totals = (allOrders as any[]).reduce((acc: any, o: any) => {
      if (o.status === 'cancelled') return acc;
      acc.revenue += Number(o.total || 0);
      acc.shipping += Number(o.shipping_charge || 0);
      acc.discount += Number(o.discount || 0);
      return acc;
    }, { revenue: 0, shipping: 0, discount: 0 });

    const statusBreakdown = (allOrders as any[]).reduce((acc: Record<string, { status: string; count: number; total: number }>, o: any) => {
      const s = o.status || 'unknown';
      if (!acc[s]) acc[s] = { status: s, count: 0, total: 0 };
      acc[s].count++;
      acc[s].total += Number(o.total || 0);
      return acc;
    }, {});

    const paymentBreakdown = (allOrders as any[]).reduce((acc: Record<string, { status: string; count: number; total: number }>, o: any) => {
      const s = o.payment_status || 'unknown';
      if (!acc[s]) acc[s] = { status: s, count: 0, total: 0 };
      acc[s].count++;
      acc[s].total += Number(o.total || 0);
      return acc;
    }, {});

    return {
      dailySales: daily,
      statusBreakdown: Object.values(statusBreakdown),
      paymentBreakdown: Object.values(paymentBreakdown),
      salesByCategory: categoryRes.data ?? [],
      couponReport: couponRes.data ?? [],
      totals,
    };
  } catch (err: any) {
    console.error('[Reports] getSalesReport error:', err?.message || err);
    return {
      dailySales: [], statusBreakdown: [], paymentBreakdown: [],
      salesByCategory: [], couponReport: [], totals: { revenue: 0, shipping: 0, discount: 0 },
    };
  }
}

// ─── PRODUCT REPORTS ────────────────────────────────────────
export async function getProductReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [topSellingRes, perfRes, catSalesRes, stockRes] = await Promise.all([
      supabase.rpc('get_top_selling_products', { limit_count: 20 }),
      supabase.rpc('get_product_performance', { limit_count: 200 }),
      supabase.rpc('get_sales_by_category', { from_date: from, to_date: to }),
      supabase.from('products').select('id,name,stock,stock_status,cost_price,price,min_stock_level').order('stock', { ascending: true }).limit(200),
    ]);

    const stockData = (stockRes.data ?? []) as any[];
    const lowStock = stockData.filter((p: any) => p.stock <= (p.min_stock_level ?? 5));
    const outOfStock = stockData.filter((p: any) => p.stock === 0);

    return {
      topSelling: topSellingRes.data ?? [],
      productPerformance: perfRes.data ?? [],
      salesByCategory: catSalesRes.data ?? [],
      stockSummary: {
        totalProducts: stockData.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        lowStockProducts: lowStock.slice(0, 10),
        outOfStockProducts: outOfStock.slice(0, 10),
      },
    };
  } catch (err: any) {
    console.error('[Reports] getProductReport error:', err?.message || err);
    return {
      topSelling: [], productPerformance: [], salesByCategory: [],
      stockSummary: { totalProducts: 0, lowStock: 0, outOfStock: 0, lowStockProducts: [], outOfStockProducts: [] },
    };
  }
}

// ─── CUSTOMER REPORTS ───────────────────────────────────────
export async function getCustomerReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [ltvRes, retentionRes, acquisitionRes, topCustomersQuery] = await Promise.all([
      supabase.rpc('get_customer_ltv'),
      supabase.rpc('get_customer_retention'),
      supabase.rpc('get_customer_acquisition', { months: 12 }),
      supabase.from('profiles').select('id,full_name,email,phone,created_at').eq('role', 'customer').order('created_at', { ascending: false }).limit(200),
    ]);

    const topCustomers = (topCustomersQuery.data ?? []) as any[];
    const customerIds = topCustomers.map((c: any) => c.id);

    let customerOrders: any[] = [];
    if (customerIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id,total,status')
        .in('customer_id', customerIds);
      customerOrders = (orders ?? []) as any[];
    }

    const customerStats = topCustomers.map((c: any) => {
      const custOrders = customerOrders.filter((o: any) => o.customer_id === c.id);
      const totalSpent = custOrders.filter((o: any) => o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const orderCount = custOrders.filter((o: any) => o.status !== 'cancelled').length;
      return { ...c, totalSpent, orderCount, avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0 };
    });

    customerStats.sort((a: any, b: any) => b.totalSpent - a.totalSpent);

    return {
      ltv: ltvRes.data ?? [],
      retention: retentionRes.data ?? [],
      acquisition: acquisitionRes.data ?? [],
      topCustomers: customerStats.slice(0, 50),
      totalCustomers: customerStats.length,
    };
  } catch (err: any) {
    console.error('[Reports] getCustomerReport error:', err?.message || err);
    return { ltv: [], retention: [], acquisition: [], topCustomers: [], totalCustomers: 0 };
  }
}

// ─── PROFIT & LOSS ──────────────────────────────────────────
export async function getProfitLossReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [plRes, byProductRes] = await Promise.all([
      supabase.rpc('get_profit_loss', { from_date: from, to_date: to }),
      supabase.rpc('get_profit_by_product', { from_date: from, to_date: to, limit_count: 50 }),
    ]);

    const plData = (plRes.data ?? []) as { category: string; amount: number }[];

    const summary = {
      revenue: plData.find((r: any) => r.category === 'Revenue')?.amount ?? 0,
      cogs: Math.abs(plData.find((r: any) => r.category === 'COGS')?.amount ?? 0),
      grossProfit: plData.find((r: any) => r.category === 'Gross Profit')?.amount ?? 0,
      shippingCost: Math.abs(plData.find((r: any) => r.category === 'Shipping Cost')?.amount ?? 0),
      discounts: Math.abs(plData.find((r: any) => r.category === 'Discounts Given')?.amount ?? 0),
      refunds: Math.abs(plData.find((r: any) => r.category === 'Refunds')?.amount ?? 0),
      netProfit: plData.find((r: any) => r.category === 'Net Profit')?.amount ?? 0,
    };

    return {
      profitLoss: plData,
      profitByProduct: byProductRes.data ?? [],
      summary,
      grossMargin: summary.revenue > 0 ? Math.round((summary.grossProfit / summary.revenue) * 10000) / 100 : 0,
      netMargin: summary.revenue > 0 ? Math.round((summary.netProfit / summary.revenue) * 10000) / 100 : 0,
    };
  } catch (err: any) {
    console.error('[Reports] getProfitLossReport error:', err?.message || err);
    return {
      profitLoss: [], profitByProduct: [],
      summary: { revenue: 0, cogs: 0, grossProfit: 0, shippingCost: 0, discounts: 0, refunds: 0, netProfit: 0 },
      grossMargin: 0, netMargin: 0,
    };
  }
}

// ─── INVENTORY REPORTS ───────────────────────────────────────
export async function getInventoryReport() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  try {
    const [summaryRes, valuationRes, lowStockRes, warehouseRes, movementsRes, stockInOutRes] = await Promise.all([
      supabase.rpc('get_inventory_summary'),
      supabase.rpc('get_inventory_valuation'),
      supabase.rpc('get_low_stock_report'),
      supabase.rpc('get_warehouse_inventory'),
      supabase.rpc('get_stock_movements', { from_date: subDays(new Date(), 30).toISOString(), to_date: new Date().toISOString(), limit_count: 100 }),
      supabase.rpc('get_stock_in_out', { from_date: subDays(new Date(), 30).toISOString(), to_date: new Date().toISOString() }),
    ]);

    return {
      summary: (summaryRes.data as any)?.[0] ?? { total_products: 0, total_stock_value: 0, total_stock_units: 0, in_stock_count: 0, low_stock_count: 0, out_of_stock_count: 0, avg_stock: 0 },
      valuation: valuationRes.data ?? [],
      lowStock: lowStockRes.data ?? [],
      warehouses: warehouseRes.data ?? [],
      movements: movementsRes.data ?? [],
      stockInOut: stockInOutRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getInventoryReport error:', err?.message || err);
    return {
      summary: { total_products: 0, total_stock_value: 0, total_stock_units: 0, in_stock_count: 0, low_stock_count: 0, out_of_stock_count: 0, avg_stock: 0 },
      valuation: [], lowStock: [], warehouses: [], movements: [], stockInOut: [],
    };
  }
}

// ─── ORDER REPORTS ──────────────────────────────────────────
export async function getOrderReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [statusRes, paymentMethodRes, codOnlineRes, fulfillmentRes, dailyVolumeRes] = await Promise.all([
      supabase.rpc('get_orders_by_status', { from_date: from, to_date: to }),
      supabase.rpc('get_orders_by_payment_method', { from_date: from, to_date: to }),
      supabase.rpc('get_cod_vs_online_orders', { from_date: from, to_date: to }),
      supabase.rpc('get_order_fulfillment_report', { from_date: from, to_date: to }),
      supabase.rpc('get_daily_order_volume', { from_date: from, to_date: to }),
    ]);

    return {
      byStatus: statusRes.data ?? [],
      byPaymentMethod: paymentMethodRes.data ?? [],
      codVsOnline: codOnlineRes.data ?? [],
      fulfillment: fulfillmentRes.data ?? [],
      dailyVolume: dailyVolumeRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getOrderReport error:', err?.message || err);
    return { byStatus: [], byPaymentMethod: [], codVsOnline: [], fulfillment: [], dailyVolume: [] };
  }
}

// ─── FINANCE REPORTS ─────────────────────────────────────────
export async function getFinanceReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [summaryRes, paymentRes, dowRes, hourRes] = await Promise.all([
      supabase.rpc('get_financial_summary', { from_date: from, to_date: to }),
      supabase.rpc('get_payment_collection_report', { from_date: from, to_date: to }),
      supabase.rpc('get_revenue_by_day_of_week', { from_date: from, to_date: to }),
      supabase.rpc('get_revenue_by_hour', { from_date: from, to_date: to }),
    ]);

    const metrics = (summaryRes.data ?? []) as { metric: string; amount: number }[];
    const metricMap = Object.fromEntries(metrics.map(m => [m.metric, Number(m.amount)]));

    return {
      summary: metricMap,
      paymentCollection: paymentRes.data ?? [],
      revenueByDayOfWeek: dowRes.data ?? [],
      revenueByHour: hourRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getFinanceReport error:', err?.message || err);
    return { summary: {}, paymentCollection: [], revenueByDayOfWeek: [], revenueByHour: [] };
  }
}

// ─── SHIPPING REPORTS ───────────────────────────────────────
export async function getShippingReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [summaryRes, courierRes, districtRes] = await Promise.all([
      supabase.rpc('get_shipping_summary', { from_date: from, to_date: to }),
      supabase.rpc('get_courier_performance', { from_date: from, to_date: to }),
      supabase.rpc('get_delivery_by_district', { from_date: from, to_date: to }),
    ]);

    const metrics = (summaryRes.data ?? []) as { metric: string; value: number }[];
    const metricMap = Object.fromEntries(metrics.map(m => [m.metric, Number(m.value)]));

    return {
      summary: metricMap,
      courierPerformance: courierRes.data ?? [],
      deliveryByType: districtRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getShippingReport error:', err?.message || err);
    return { summary: {}, courierPerformance: [], deliveryByType: [] };
  }
}

// ─── MARKETING REPORTS ──────────────────────────────────────
export async function getMarketingReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [couponRes, emailRes, popupRes, subscriberRes, bundleRes] = await Promise.all([
      supabase.rpc('get_coupon_performance', { from_date: from, to_date: to }),
      supabase.rpc('get_email_campaign_report'),
      supabase.rpc('get_popup_campaign_report'),
      supabase.rpc('get_subscriber_growth'),
      supabase.rpc('get_bundle_offer_report'),
    ]);

    return {
      coupons: couponRes.data ?? [],
      emailCampaigns: emailRes.data ?? [],
      popups: popupRes.data ?? [],
      subscribers: subscriberRes.data ?? [],
      bundles: bundleRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getMarketingReport error:', err?.message || err);
    return { coupons: [], emailCampaigns: [], popups: [], subscribers: [], bundles: [] };
  }
}

// ─── SUPPLIER REPORTS ──────────────────────────────────────
export async function getSupplierReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [performanceRes, poSummaryRes, topProductsRes] = await Promise.all([
      supabase.rpc('get_supplier_performance'),
      supabase.rpc('get_purchase_order_summary', { from_date: from, to_date: to }),
      supabase.rpc('get_top_purchased_products', { from_date: from, to_date: to, limit_count: 20 }),
    ]);

    return {
      suppliers: performanceRes.data ?? [],
      poSummary: poSummaryRes.data ?? [],
      topProducts: topProductsRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getSupplierReport error:', err?.message || err);
    return { suppliers: [], poSummary: [], topProducts: [] };
  }
}

// ─── EMPLOYEE / ADMIN REPORTS ──────────────────────────────
export async function getAdminReport(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [activityRes, loginRes, supportRes, agentRes] = await Promise.all([
      supabase.rpc('get_admin_activity_report', { from_date: from, to_date: to }),
      supabase.rpc('get_login_summary', { from_date: from, to_date: to }),
      supabase.rpc('get_support_performance', { from_date: from, to_date: to }),
      supabase.rpc('get_agent_performance', { from_date: from, to_date: to }),
    ]);

    const loginMetrics = (loginRes.data ?? []) as { metric: string; value: number }[];
    const supportMetrics = (supportRes.data ?? []) as { metric: string; value: number }[];

    return {
      adminActivity: activityRes.data ?? [],
      loginSummary: Object.fromEntries(loginMetrics.map(m => [m.metric, Number(m.value)])),
      supportMetrics: Object.fromEntries(supportMetrics.map(m => [m.metric, Number(m.value)])),
      agentPerformance: agentRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getAdminReport error:', err?.message || err);
    return { adminActivity: [], loginSummary: {}, supportMetrics: {}, agentPerformance: [] };
  }
}

// ─── WEBSITE ANALYTICS ──────────────────────────────────────
export async function getWebsiteAnalytics(range?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { from, to } = parseRange(range);

  try {
    const [visitorsRes, trafficRes, deviceRes, geoRes, topPagesRes, browserRes] = await Promise.all([
      supabase.rpc('get_visitor_summary', { from_date: from, to_date: to }),
      supabase.rpc('get_traffic_sources', { from_date: from, to_date: to }),
      supabase.rpc('get_device_analytics', { from_date: from, to_date: to }),
      supabase.rpc('get_geo_analytics', { from_date: from, to_date: to }),
      supabase.rpc('get_top_pages', { from_date: from, to_date: to, limit_count: 20 }),
      supabase.rpc('get_browser_analytics', { from_date: from, to_date: to }),
    ]);

    return {
      visitors: visitorsRes.data ?? [],
      trafficSources: trafficRes.data ?? [],
      devices: deviceRes.data ?? [],
      geo: geoRes.data ?? [],
      topPages: topPagesRes.data ?? [],
      browsers: browserRes.data ?? [],
    };
  } catch (err: any) {
    console.error('[Reports] getWebsiteAnalytics error:', err?.message || err);
    return { visitors: [], trafficSources: [], devices: [], geo: [], topPages: [], browsers: [] };
  }
}
