'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subWeeks, subMonths, startOfYear, endOfYear
} from 'date-fns';

type KpiTimeValues = {
  current: number;
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  growth: number;
  direction: 'up' | 'down' | 'flat';
};

type KpiCard = {
  label: string;
  key: string;
  values: KpiTimeValues;
  format?: 'currency' | 'number' | 'count';
};

type DateRange = { start: Date; end: Date };

function getDateRanges(filter: string, customStart?: string, customEnd?: string) {
  const now = new Date();
  const today = { start: startOfDay(now), end: endOfDay(now) };
  const yesterday = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
  const last7Days = { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  const last30Days = { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };

  let current: DateRange;
  let previous: DateRange;

  switch (filter) {
    case 'today':
      current = today;
      previous = yesterday;
      break;
    case 'yesterday':
      current = yesterday;
      previous = { start: startOfDay(subDays(now, 2)), end: endOfDay(subDays(now, 2)) };
      break;
    case 'this_week': {
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      current = { start: weekStart, end: now };
      previous = { start: subDays(weekStart, 7), end: subDays(weekStart, 1) };
      break;
    }
    case 'last_week': {
      const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 0 }), 7);
      current = { start: lastWeekStart, end: subDays(lastWeekStart, -6) };
      previous = { start: subDays(lastWeekStart, 7), end: subDays(lastWeekStart, -1) };
      break;
    }
    case 'this_month': {
      const monthStart = startOfMonth(now);
      current = { start: monthStart, end: now };
      previous = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      break;
    }
    case 'last_month': {
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      current = { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      previous = { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) };
      break;
    }
    case 'this_year': {
      current = { start: startOfYear(now), end: now };
      previous = { start: startOfYear(subMonths(now, 12)), end: endOfYear(subMonths(now, 12)) };
      break;
    }
    case 'custom':
      current = {
        start: customStart ? new Date(customStart) : today.start,
        end: customEnd ? new Date(customEnd) : now,
      };
      {
        const dur = current.end.getTime() - current.start.getTime();
        previous = { start: new Date(current.start.getTime() - dur), end: new Date(current.start.getTime() - 1) };
      }
      break;
    default:
      current = today;
      previous = yesterday;
  }

  return { current, previous, today, yesterday, last7Days, last30Days };
}

function toISO(d: Date): string {
  return d.toISOString();
}

function calcGrowth(current: number, previous: number): { growth: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { growth: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  const g = ((current - previous) / previous) * 100;
  return {
    growth: Math.round(g * 100) / 100,
    direction: g > 0 ? 'up' : g < 0 ? 'down' : 'flat',
  };
}

function computeKpiTimeValues(values: Record<string, number>, currentKey: string, currentVal: number, prevVal: number): KpiTimeValues {
  const g = calcGrowth(currentVal, prevVal);
  return {
    current: currentVal,
    today: values.today ?? 0,
    yesterday: values.yesterday ?? 0,
    last7Days: values.last7days ?? 0,
    last30Days: values.last30days ?? 0,
    growth: g.growth,
    direction: g.direction,
  };
}

export async function getAnalyticsDashboardData(
  filter: string = 'this_month',
  customStart?: string,
  customEnd?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const ranges = getDateRanges(filter, customStart, customEnd);

  // =====================================================
  // Query all data in parallel
  // =====================================================
  const r = (label: string, start: Date, end: Date) => {
    const s = toISO(start);
    const e = toISO(end);
    return { label, s, e };
  };

  const periods = {
    current: r('current', ranges.current.start, ranges.current.end),
    previous: r('previous', ranges.previous.start, ranges.previous.end),
    today: r('today', ranges.today.start, ranges.today.end),
    yesterday: r('yesterday', ranges.yesterday.start, ranges.yesterday.end),
    last7days: r('last7days', ranges.last7Days.start, ranges.last7Days.end),
    last30days: r('last30days', ranges.last30Days.start, ranges.last30Days.end),
  };

  const allPeriods = Object.values(periods);

  // Helper: run a query for a single period and extract numeric result
  async function sumField(table: string, field: string, period: { s: string; e: string }, filters?: Record<string, any>, excludeCancelled = false) {
    try {
      let q = supabase.from(table as any).select(field);
      if (table === 'orders' && excludeCancelled) {
        q = q.not('status', 'eq', 'cancelled');
      }
      if (table === 'orders' || table === 'payments') {
        q = q.gte('created_at', period.s).lt('created_at', period.e);
      }
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          q = q.eq(k, v);
        }
      }
      const { data, error } = await q;
      if (error) return 0;
      const arr = data as any[];
      return arr.reduce((s: number, r: any) => s + Number(r[field] ?? 0), 0);
    } catch { return 0; }
  }

  async function countTable(table: string, period: { s: string; e: string }, filters?: Record<string, any>) {
    try {
      let q = supabase.from(table as any).select('*', { count: 'exact', head: true });
      if (table === 'orders') {
        q = q.gte('created_at', period.s).lt('created_at', period.e);
      }
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          q = q.eq(k, v);
        }
      }
      const { count, error } = await q;
      if (error) return 0;
      return count ?? 0;
    } catch { return 0; }
  }

  // =====================================================
  // 1. SALES & ORDER KPIs
  // =====================================================
  const orderQueries = allPeriods.map(p =>
    sumField('orders', 'total', p, undefined, true).then(v => ({ period: p.label, value: v }))
  );
  const orderCountQueries = allPeriods.map(p =>
    countTable('orders', p, undefined).then(v => ({ period: p.label, value: v }))
  );
  const paidOrderQueries = allPeriods.map(p =>
    sumField('orders', 'total', p, { payment_status: 'paid' }).then(v => ({ period: p.label, value: v }))
  );
  const unpaidOrderQueries = allPeriods.map(p =>
    sumField('orders', 'total', p, { payment_status: 'unpaid' }).then(v => ({ period: p.label, value: v }))
  );
  const discountQueries = allPeriods.map(p =>
    sumField('orders', 'discount', p, undefined, true).then(v => ({ period: p.label, value: v }))
  );
  async function countStatus(period: { s: string; e: string; label: string }, statusFilter: string | string[]) {
    try {
      let q = supabase.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', period.s)
        .lt('created_at', period.e);
      if (typeof statusFilter === 'string') {
        q = q.eq('status', statusFilter);
      } else if (Array.isArray(statusFilter)) {
        q = q.in('status', statusFilter);
      }
      const { count, error } = await q;
      return { period: period.label, count: (error ? 0 : (count ?? 0)) };
    } catch { return { period: period.label, count: 0 }; }
  }

  const statusCountQueries = allPeriods.flatMap(p => [
    countStatus(p, ['pending', 'processing', 'shipped']).then(r => ({ ...r, key: 'active' })),
    countStatus(p, 'pending').then(r => ({ ...r, key: 'pending' })),
    countStatus(p, ['delivered', 'completed']).then(r => ({ ...r, key: 'delivered' })),
    countStatus(p, 'cancelled').then(r => ({ ...r, key: 'cancelled' })),
  ]);

  const [salesResults, orderCountResults, paidResults, unpaidResults, discountResults, statusResults] = await Promise.all([
    Promise.all(orderQueries),
    Promise.all(orderCountQueries),
    Promise.all(paidOrderQueries),
    Promise.all(unpaidOrderQueries),
    Promise.all(discountQueries),
    Promise.all(statusCountQueries),
  ]);

  function byPeriod(results: { period: string; value: number }[]): Record<string, number> {
    const m: Record<string, number> = {};
    for (const r of results) m[r.period] = r.value;
    return m;
  }

  function statusByPeriod(results: any[], key: string): Record<string, number> {
    const m: Record<string, number> = {};
    for (const r of results) {
      if (r.key === key) m[r.period] = r.count;
    }
    return m;
  }

  const salesMap = byPeriod(salesResults);
  const orderCountMap = byPeriod(orderCountResults);
  const paidMap = byPeriod(paidResults);
  const unpaidMap = byPeriod(unpaidResults);
  const discountMap = byPeriod(discountResults);
  const activeMap = statusByPeriod(statusResults, 'active');
  const pendingMap = statusByPeriod(statusResults, 'pending');
  const deliveredMap = statusByPeriod(statusResults, 'delivered');
  const cancelledMap = statusByPeriod(statusResults, 'cancelled');

  // =====================================================
  // 2. PRODUCT / STOCK KPIs
  // =====================================================
  const [productRes, customerCountRes] = await Promise.all([
    supabase.from('products').select('id,stock,cost_price,price,is_active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
  ]);

  const allProducts = (productRes.data ?? []) as any[];
  const activeProducts = allProducts.filter((p: any) => p.is_active);
  const totalProducts = activeProducts.length;
  const totalCustomers = customerCountRes.count ?? 0;

  const stockPurchaseValue = activeProducts.reduce((s: number, p: any) => s + (p.cost_price ?? 0) * (p.stock ?? 0), 0);
  const stockSellingValue = activeProducts.reduce((s: number, p: any) => s + (p.price ?? 0) * (p.stock ?? 0), 0);

  // =====================================================
  // 4. PAYMENT KPIs
  // =====================================================
  const paymentQueries = allPeriods.map(p =>
    sumField('payments', 'amount', p, { status: 'completed' }).then(v => ({ period: p.label, value: v }))
  );
  const paymentResults = await Promise.all(paymentQueries);
  const paymentMap = byPeriod(paymentResults);

  // =====================================================
  // 5. PROFIT & LOSS via RPC
  // =====================================================
  const plQueries = allPeriods.map(p =>
    supabase.rpc('get_profit_loss', { from_date: p.s, to_date: p.e }).then(({ data, error }) => {
      if (error || !data) return { period: p.label, grossProfit: 0, netProfit: 0 };
      const rows = data as { category: string; amount: number }[];
      return {
        period: p.label,
        grossProfit: rows.find((r: any) => r.category === 'Gross Profit')?.amount ?? 0,
        netProfit: rows.find((r: any) => r.category === 'Net Profit')?.amount ?? 0,
      };
    })
  );
  const plResults = await Promise.all(plQueries);

  function plByPeriod(results: any[], key: string): Record<string, number> {
    const m: Record<string, number> = {};
    for (const r of results) m[r.period] = r[key];
    return m;
  }

  const grossProfitMap = plByPeriod(plResults, 'grossProfit');
  const netProfitMap = plByPeriod(plResults, 'netProfit');

  // =====================================================
  // 6. CHARTS DATA
  // =====================================================

  // Revenue Trend (for last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 29);
  const [dailySalesRes, financialSummaryRes, topProductsRes, categorySalesRes,
    warehouseInvRes, stockMovementsRes, lowStockRes, expenseTotalRes] = await Promise.all([
    supabase.rpc('get_daily_sales', { from_date: toISO(thirtyDaysAgo), to_date: toISO(new Date()) }),
    supabase.rpc('get_financial_summary', { from_date: toISO(ranges.current.start), to_date: toISO(ranges.current.end) }),
    supabase.rpc('get_top_selling_products', { limit_count: 10 }),
    supabase.rpc('get_sales_by_category', { from_date: toISO(ranges.current.start), to_date: toISO(ranges.current.end) }),
    supabase.rpc('get_warehouse_inventory'),
    supabase.rpc('get_stock_movements', { from_date: toISO(ranges.current.start), to_date: toISO(ranges.current.end), limit_count: 50 }),
    supabase.rpc('get_low_stock_report'),
    supabase.rpc('get_expense_summary', { from_date: toISO(ranges.current.start), to_date: toISO(ranges.current.end) }),
  ]);

  // Top Customers (by order value in current period)
  const topCustomersRes = await supabase
    .from('orders')
    .select('customer_id, total, profiles!customer_id(full_name, email)')
    .gte('created_at', toISO(ranges.current.start))
    .lt('created_at', toISO(ranges.current.end))
    .not('status', 'eq', 'cancelled')
    .order('total', { ascending: false })
    .limit(10);

  const currentExpenses = Number(expenseTotalRes.data ?? 0);

  // Recent activities
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id,order_number,total,status,created_at')
    .order('created_at', { ascending: false })
    .limit(15);

  // =====================================================
  // BUILD KPI CARDS
  // =====================================================
  function build(label: string, key: string, map: Record<string, number>, previousVal: number, fmt?: 'currency' | 'number' | 'count'): KpiCard {
    const currentVal = map.current ?? 0;
    return {
      label,
      key,
      values: computeKpiTimeValues(map, 'current', currentVal, previousVal),
      format: fmt ?? 'currency',
    };
  }

  const currentSales = salesMap.current ?? 0;
  const previousSales = salesMap.previous ?? 0;
  const currentPaid = paidMap.current ?? 0;
  const previousPaid = paidMap.previous ?? 0;
  const currentUnpaid = unpaidMap.current ?? 0;
  const previousUnpaid = unpaidMap.previous ?? 0;
  const currentDiscount = discountMap.current ?? 0;
  const previousDiscount = discountMap.previous ?? 0;
  const currentGrossProfit = grossProfitMap.current ?? 0;
  const previousGrossProfit = grossProfitMap.previous ?? 0;
  const currentNetProfit = netProfitMap.current ?? 0;
  const previousNetProfit = netProfitMap.previous ?? 0;
  const currentActiveOrders = activeMap.current ?? 0;
  const previousActiveOrders = activeMap.previous ?? 0;
  const currentPendingOrders = pendingMap.current ?? 0;
  const previousPendingOrders = pendingMap.previous ?? 0;
  const currentDeliveredOrders = deliveredMap.current ?? 0;
  const previousDeliveredOrders = deliveredMap.previous ?? 0;
  const currentCancelledOrders = cancelledMap.current ?? 0;
  const previousCancelledOrders = cancelledMap.previous ?? 0;
  const currentPayments = paymentMap.current ?? 0;
  const previousPayments = paymentMap.previous ?? 0;

  // For cumulative KPIs (customers, products, stock values), use all-time values
  const kpis: KpiCard[] = [
    build('Total Sales', 'totalSales', salesMap, previousSales, 'currency'),
    build('Sales Received', 'salesReceived', paidMap, previousPaid, 'currency'),
    build('Sales Due', 'salesDue', unpaidMap, previousUnpaid, 'currency'),
    build('Due Collected', 'dueCollected', paymentMap, previousPayments, 'currency'),
    {
      label: 'Total Expense',
      key: 'totalExpense',
      values: {
        current: currentExpenses,
        today: currentExpenses,
        yesterday: currentExpenses,
        last7Days: currentExpenses,
        last30Days: currentExpenses,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'currency',
    },
    build('Total Discount', 'totalDiscount', discountMap, previousDiscount, 'currency'),
    build('Gross Profit', 'grossProfit', grossProfitMap, previousGrossProfit, 'currency'),
    build('Net Profit', 'netProfit', netProfitMap, previousNetProfit, 'currency'),
    {
      label: 'All Customer Due',
      key: 'customerDue',
      values: {
        current: currentUnpaid,
        today: unpaidMap.today ?? 0,
        yesterday: unpaidMap.yesterday ?? 0,
        last7Days: unpaidMap.last7days ?? 0,
        last30Days: unpaidMap.last30days ?? 0,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'currency',
    },
    {
      label: 'Daily Cash',
      key: 'dailyCash',
      values: {
        current: 0, today: 0, yesterday: 0, last7Days: 0, last30Days: 0,
        growth: 0, direction: 'flat' as const,
      },
      format: 'currency',
    },
    {
      label: 'Main Balance',
      key: 'mainBalance',
      values: {
        current: 0, today: 0, yesterday: 0, last7Days: 0, last30Days: 0,
        growth: 0, direction: 'flat' as const,
      },
      format: 'currency',
    },
    {
      label: 'Total Customers',
      key: 'totalCustomers',
      values: {
        current: totalCustomers,
        today: totalCustomers,
        yesterday: totalCustomers,
        last7Days: totalCustomers,
        last30Days: totalCustomers,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'count',
    },
    {
      label: 'Total Products',
      key: 'totalProducts',
      values: {
        current: totalProducts,
        today: totalProducts,
        yesterday: totalProducts,
        last7Days: totalProducts,
        last30Days: totalProducts,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'count',
    },
    build('Active Orders', 'activeOrders', activeMap, previousActiveOrders, 'count'),
    build('Pending Orders', 'pendingOrders', pendingMap, previousPendingOrders, 'count'),
    build('Delivered Orders', 'deliveredOrders', deliveredMap, previousDeliveredOrders, 'count'),
    build('Cancelled Orders', 'cancelledOrders', cancelledMap, previousCancelledOrders, 'count'),
    {
      label: 'Stock (Purchase Value)',
      key: 'stockPurchaseValue',
      values: {
        current: stockPurchaseValue,
        today: stockPurchaseValue,
        yesterday: stockPurchaseValue,
        last7Days: stockPurchaseValue,
        last30Days: stockPurchaseValue,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'currency',
    },
    {
      label: 'Stock Value (Selling)',
      key: 'stockSellingValue',
      values: {
        current: stockSellingValue,
        today: stockSellingValue,
        yesterday: stockSellingValue,
        last7Days: stockSellingValue,
        last30Days: stockSellingValue,
        growth: 0,
        direction: 'flat' as const,
      },
      format: 'currency',
    },
  ];

  // =====================================================
  // BUILD CHART DATA
  // =====================================================
  const dailySales = (dailySalesRes.data ?? []) as any[];
  const financialSummary = (financialSummaryRes.data ?? []) as { metric: string; amount: number }[];
  const topSellingProducts = (topProductsRes.data ?? []) as any[];
  const categorySales = (categorySalesRes.data ?? []) as any[];
  const warehouseInventory = (warehouseInvRes.data ?? []) as any[];
  const stockMovements = (stockMovementsRes.data ?? []) as any[];
  const lowStockProducts = (lowStockRes.data ?? []) as any[];
  const topCustomers = (topCustomersRes.data ?? []) as any[];
  const recentOrdersList = (recentOrders ?? []) as any[];

  // Build profit trend from daily sales (revenue - estimated cost)
  const profitTrend = dailySales.map((d: any) => ({
    date: d.date,
    revenue: d.revenue ?? 0,
    profit: (d.revenue ?? 0) * 0.25,
  }));

  // Orders overview chart
  const orderStatusBreakdown = [
    { name: 'Active', value: currentActiveOrders, fill: '#2563eb' },
    { name: 'Pending', value: currentPendingOrders, fill: '#ca8a04' },
    { name: 'Delivered', value: currentDeliveredOrders, fill: '#16a34a' },
    { name: 'Cancelled', value: currentCancelledOrders, fill: '#dc2626' },
  ].filter(d => d.value > 0);

  // Financial summary as chart
  const fsRevenue = financialSummary.find((f: any) => f.metric === 'gross_revenue')?.amount ?? 0;
  const fsCogs = Math.abs(financialSummary.find((f: any) => f.metric === 'cogs')?.amount ?? 0);
  const fsShipping = Math.abs(financialSummary.find((f: any) => f.metric === 'total_shipping_collected')?.amount ?? 0);
  const fsDiscounts = Math.abs(financialSummary.find((f: any) => f.metric === 'total_discounts')?.amount ?? 0);
  const fsRefunds = Math.abs(financialSummary.find((f: any) => f.metric === 'total_refunds')?.amount ?? 0);
  const fsNetRevenue = financialSummary.find((f: any) => f.metric === 'net_revenue')?.amount ?? 0;

  // Recent activities merged
  const recentActivities = [
    ...recentOrdersList.map((o: any) => ({
      id: o.id,
      type: 'order' as const,
      ref: o.order_number ?? o.id,
      value: o.total,
      status: o.status,
      date: o.created_at,
    })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);

  return {
    kpis,
    charts: {
      salesOverview: dailySales,
      revenueTrend: dailySales,
      profitTrend,
      ordersOverview: orderStatusBreakdown,
      expenseAnalysis: [
        { name: 'COGS', value: fsCogs, fill: '#dc2626' },
        { name: 'Shipping', value: fsShipping, fill: '#ca8a04' },
        { name: 'Discounts', value: fsDiscounts, fill: '#ea580c' },
        { name: 'Refunds', value: fsRefunds, fill: '#0891b2' },
      ].filter(d => d.value > 0),
      topSellingProducts,
      topCategories: categorySales,
      topCustomers,
      warehousePerformance: warehouseInventory,
      stockMovement: stockMovements,
      lowStockProducts,
      recentActivities,
      financialSummary: {
        grossRevenue: fsRevenue,
        netRevenue: fsNetRevenue,
        cogs: fsCogs,
        totalDiscounts: fsDiscounts,
        totalShipping: fsShipping,
        totalRefunds: fsRefunds,
      },
    },
    filter,
  };
}
