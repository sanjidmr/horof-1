'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  SalesReportData,
  ProfitLossData,
  ExpensesReportData,
  ProductsReportData,
  CustomersReportData,
  InventoryReportData,
  OrdersReportData,
  PaymentsReportData,
  DashboardReportData,
  TrendPoint,
  StatusCount,
  ProductPerformanceRow,
} from '@/lib/reports/types';

// ─── Utilities ────────────────────────────────────────────────────────────

const PAGE_SIZE = 1000;

async function requireReportAccess(): Promise<void> {
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('reports.view');
  } catch {
    throw new Error('Permission denied');
  }
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeRange(from?: string, to?: string): { from: string; to: string } {
  const now = new Date();
  let f: Date;
  let t: Date;
  if (from && to && !isNaN(Date.parse(from)) && !isNaN(Date.parse(to))) {
    f = new Date(from);
    t = new Date(to);
    if (t < f) {
      const tmp = f;
      f = t;
      t = tmp;
    }
  } else {
    f = new Date(now);
    f.setDate(f.getDate() - 29);
    f.setHours(0, 0, 0, 0);
    t = now;
  }
  return { from: f.toISOString(), to: t.toISOString() };
}

async function paged<T>(
  makeQuery: (start: number, end: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let start = 0;
  for (;;) {
    const { data, error } = await makeQuery(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }
  return all;
}

// ─── Loaders ──────────────────────────────────────────────────────────────

interface OrderRow {
  id: number;
  order_number: string;
  total: number | null;
  discount: number | null;
  delivery_charge: number | null;
  actual_courier_cost: number | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  refund_status: string | null;
  created_at: string;
  user_id: string | null;
  customer_id: string | null;
  product_details: unknown;
}

interface ProductRow {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  offer_price: number | null;
  cost_price: number | null;
  stock: number | null;
  min_stock_level: number | null;
  stock_status: string | null;
  is_active: boolean | null;
  created_at: string;
  category_id: string | null;
}

interface ExpenseRow {
  id: string;
  category_id: string | null;
  title: string | null;
  amount: number | null;
  expense_date: string;
  payment_method: string | null;
  notes: string | null;
  description: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
}

interface LineItem {
  productId: number | null;
  name: string;
  qty: number;
  revenue: number;
  designCharge: number;
}

async function loadOrders(sb: any, from: string, to: string): Promise<OrderRow[]> {
  return paged<OrderRow>((a, b) =>
    sb
      .from('orders')
      .select(
        'id,order_number,total,discount,delivery_charge,actual_courier_cost,status,payment_status,payment_method,refund_status,created_at,user_id,customer_id,product_details'
      )
      .gte('created_at', from)
      .lte('created_at', to)
      .range(a, b)
  );
}

async function loadAllOrders(sb: any): Promise<OrderRow[]> {
  return paged<OrderRow>((a, b) =>
    sb
      .from('orders')
      .select('id,user_id,customer_id,total,status,created_at')
      .range(a, b)
  );
}

async function loadProducts(sb: any): Promise<ProductRow[]> {
  return paged<ProductRow>((a, b) =>
    sb
      .from('products')
      .select(
        'id,name,sku,price,offer_price,cost_price,stock,min_stock_level,stock_status,is_active,created_at,category_id'
      )
      .range(a, b)
  );
}

async function loadExpenses(sb: any, from: string, to: string): Promise<ExpenseRow[]> {
  const fromDate = from.slice(0, 10);
  const toDate = to.slice(0, 10);
  return paged<ExpenseRow>((a, b) =>
    sb
      .from('expenses')
      .select('id,category_id,title,amount,expense_date,payment_method,notes,description')
      .gte('expense_date', fromDate)
      .lte('expense_date', toDate)
      .range(a, b)
  );
}

async function loadCustomers(sb: any): Promise<ProfileRow[]> {
  return paged<ProfileRow>((a, b) =>
    sb
      .from('profiles')
      .select('id,full_name,email,phone,role,created_at')
      .eq('role', 'customer')
      .range(a, b)
  );
}

async function loadCategories(sb: any): Promise<Map<string, string>> {
  const { data } = await sb.from('categories').select('id,name');
  const map = new Map<string, string>();
  for (const c of data ?? []) map.set(c.id, c.name);
  return map;
}

async function loadWarehouses(sb: any) {
  const { data } = await sb.from('warehouses').select('id,name,is_active');
  return (data ?? []) as { id: string; name: string; is_active: boolean }[];
}

async function loadOrderRequests(sb: any): Promise<{ product_id: number | null; status: string | null }[]> {
  return paged<{ product_id: number | null; status: string | null }>((a, b) =>
    sb.from('order_requests').select('product_id,status').range(a, b)
  );
}

async function loadStockMovements(sb: any, from: string, to: string) {
  return paged<any>((a, b) =>
    sb
      .from('stock_movements')
      .select('*')
      .gte('created_at', from)
      .lte('created_at', to)
      .range(a, b)
  );
}

async function loadCostMap(sb: any): Promise<Map<number, number>> {
  const products = await loadProducts(sb);
  const map = new Map<number, number>();
  for (const p of products) map.set(p.id, toNumber(p.cost_price));
  return map;
}

function parseLineItems(pd: unknown): LineItem[] {
  if (!Array.isArray(pd)) return [];
  const items = pd.filter((x) => x && typeof x === 'object' && !(x as any).is_metadata);
  const out: LineItem[] = [];
  for (const raw of items) {
    const it = raw as Record<string, unknown>;
    const qty = toNumber(it.quantity ?? it.quantity ?? 1) || 1;
    const price = toNumber(it.unit_price ?? it.price);
    const design = toNumber(it.design_charge ?? it.designCharge);
    const rawPid = it.product_id ?? it.productId;
    const pid = rawPid === null || rawPid === undefined || rawPid === '' ? null : toNumber(rawPid);
    out.push({
      productId: Number.isFinite(pid as number) ? (pid as number) : null,
      name: String(it.product_name ?? it.name ?? 'Unknown product'),
      qty,
      revenue: round2(price * qty + design),
      designCharge: round2(design),
    });
  }
  return out;
}

function orderLineItems(order: OrderRow): LineItem[] {
  return parseLineItems(order.product_details);
}

function isCancelled(o: OrderRow): boolean {
  return (o.status || '').toLowerCase() === 'cancelled';
}

function isRefunded(o: OrderRow): boolean {
  const s = (o.status || '').toLowerCase();
  const rs = (o.refund_status || '').toLowerCase();
  return s === 'refunded' || s === 'returned' || ['approved', 'paid', 'completed', 'refunded'].includes(rs);
}

function isDelivered(o: OrderRow): boolean {
  const s = (o.status || '').toLowerCase();
  return s === 'delivered' || s === 'completed';
}

function dayKey(d: string): string {
  return d.slice(0, 10);
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function localDayKey(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localHour(d: string | Date): number {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.getHours();
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ─── Sales metrics ─────────────────────────────────────────────────────────

function computeSales(orders: OrderRow[], prevOrders: OrderRow[] = []): SalesReportData {
  const valid = orders.filter((o) => !isCancelled(o));
  const grossRevenue = round2(sum(valid.map((o) => toNumber(o.total))));
  const refunds = round2(sum(orders.filter(isRefunded).map((o) => toNumber(o.total))));
  const netRevenue = round2(grossRevenue - refunds);
  const totalOrders = orders.length;
  const successfulOrders = valid.filter(isDelivered).length;
  const cancelledOrders = orders.filter(isCancelled).length;
  const returnedOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'returned').length;
  const pendingOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;
  const processingStatuses = ['processing', 'packed', 'ready_for_pickup', 'shipped', 'in_transit', 'out_for_delivery'];
  const processingOrders = valid.filter((o) => processingStatuses.includes((o.status || '').toLowerCase())).length;
  const deliveredOrders = valid.filter(isDelivered).length;
  const avgOrderValue = valid.length > 0 ? round2(grossRevenue / valid.length) : 0;
  const itemsSold = sum(valid.map((o) => sum(orderLineItems(o).map((li) => li.qty))));

  const prevValid = prevOrders.filter((o) => !isCancelled(o));
  const prevRevenue = round2(sum(prevValid.map((o) => toNumber(o.total))));
  const salesGrowthPct = prevRevenue > 0 ? round2(((grossRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  // Hourly
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h}:00`,
    orders: 0,
    revenue: 0,
  }));
  for (const o of valid) {
    const h = localHour(o.created_at);
    hourly[h].orders += 1;
    hourly[h].revenue = round2(hourly[h].revenue + toNumber(o.total));
  }

  // Daily trend
  const dayMap = new Map<string, TrendPoint>();
  for (const o of valid) {
    const k = localDayKey(o.created_at);
    if (!dayMap.has(k)) dayMap.set(k, { key: k, label: k, orders: 0, revenue: 0, itemsSold: 0 });
    const point = dayMap.get(k)!;
    point.orders += 1;
    point.revenue = round2(point.revenue + toNumber(o.total));
    point.itemsSold = (point.itemsSold || 0) + sum(orderLineItems(o).map((li) => li.qty));
  }
  const dailyTrend = Array.from(dayMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Monthly trend
  const monthMap = new Map<string, TrendPoint>();
  for (const o of valid) {
    const k = monthKey(o.created_at);
    if (!monthMap.has(k)) monthMap.set(k, { key: k, label: k, orders: 0, revenue: 0, itemsSold: 0 });
    const point = monthMap.get(k)!;
    point.orders += 1;
    point.revenue = round2(point.revenue + toNumber(o.total));
    point.itemsSold = (point.itemsSold || 0) + sum(orderLineItems(o).map((li) => li.qty));
  }
  const monthlyTrend = Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Weekly comparison (last 8 ISO weeks)
  const weeks: TrendPoint[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    const dow = monday.getDay();
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1) - i * 7);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const key = localDayKey(monday);
    const label = `W ${key.slice(5)}`;
    const wOrders = valid.filter((o) => {
      const d = new Date(o.created_at);
      return d >= monday && d < nextMonday;
    });
    weeks.push({
      key,
      label,
      orders: wOrders.length,
      revenue: round2(sum(wOrders.map((o) => toNumber(o.total)))),
    });
  }

  // Status / payment breakdown
  const statusMap = new Map<string, StatusCount>();
  for (const o of orders) {
    const s = (o.status || 'unknown').toLowerCase();
    if (!statusMap.has(s)) statusMap.set(s, { status: s, count: 0, total: 0 });
    const row = statusMap.get(s)!;
    row.count += 1;
    row.total = round2(row.total + toNumber(o.total));
  }
  const statusBreakdown = Array.from(statusMap.values()).sort((a, b) => b.count - a.count);

  const payMap = new Map<string, StatusCount>();
  for (const o of orders) {
    const s = (o.payment_status || 'unknown').toLowerCase();
    if (!payMap.has(s)) payMap.set(s, { status: s, count: 0, total: 0 });
    const row = payMap.get(s)!;
    row.count += 1;
    row.total = round2(row.total + toNumber(o.total));
  }
  const paymentBreakdown = Array.from(payMap.values()).sort((a, b) => b.count - a.count);

  return {
    kpis: {
      grossRevenue,
      netRevenue,
      refunds,
      totalOrders,
      successfulOrders,
      cancelledOrders,
      returnedOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      avgOrderValue,
      itemsSold,
      salesGrowthPct,
    },
    hourlySales: hourly,
    dailyTrend,
    monthlyTrend,
    weeklyComparison: weeks,
    statusBreakdown,
    paymentBreakdown,
  };
}

// ─── Product aggregation ───────────────────────────────────────────────────

interface ProductAgg {
  productId: number | null;
  name: string;
  sku: string;
  category: string;
  stock: number;
  stockStatus: string;
  costPrice: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  returns: number;
  popularity: number;
}

function aggregateProducts(
  orders: OrderRow[],
  products: ProductRow[],
  categoryMap: Map<string, string>,
  popularity: Map<number, number>
): Map<string, ProductAgg> {
  const productMap = new Map<number, ProductRow>();
  for (const p of products) productMap.set(p.id, p);

  const map = new Map<string, ProductAgg>();

  const ensure = (key: string, pid: number | null, name: string) => {
    if (!map.has(key)) {
      const prod = pid !== null ? productMap.get(pid) : undefined;
      map.set(key, {
        productId: pid,
        name: prod?.name ?? name,
        sku: prod?.sku ?? '',
        category: pid !== null ? (categoryMap.get(prod?.category_id ?? '') ?? 'Uncategorized') : 'Uncategorized',
        stock: pid !== null ? toNumber(prod?.stock) : 0,
        stockStatus: prod?.stock_status ?? (pid === null ? 'unknown' : 'in_stock'),
        costPrice: pid !== null ? toNumber(prod?.cost_price) : 0,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        returns: 0,
        popularity: pid !== null ? (popularity.get(pid) ?? 0) : 0,
      });
    }
    return map.get(key)!;
  };

  const returnedOrderIds = new Set(orders.filter((o) => (o.status || '').toLowerCase() === 'returned').map((o) => o.id));

  for (const o of orders) {
    if (isCancelled(o)) continue;
    const items = orderLineItems(o);
    const isReturned = returnedOrderIds.has(o.id);
    for (const li of items) {
      const key = li.productId !== null ? `p:${li.productId}` : `n:${li.name.toLowerCase()}`;
      const agg = ensure(key, li.productId, li.name);
      agg.quantity += li.qty;
      agg.revenue = round2(agg.revenue + li.revenue);
      const cost = li.qty * agg.costPrice;
      agg.cost = round2(agg.cost + cost);
      if (isReturned) agg.returns += li.qty;
    }
  }

  // Products with zero sales should still appear for worst-selling / inventory views
  for (const p of products) {
    const key = `p:${p.id}`;
    if (!map.has(key)) {
      ensure(key, p.id, p.name);
    }
  }

  for (const agg of map.values()) {
    agg.profit = round2(agg.revenue - agg.cost);
    agg.margin = agg.revenue > 0 ? round2((agg.profit / agg.revenue) * 100) : 0;
  }

  return map;
}

function toProductRows(aggMap: Map<string, ProductAgg>): ProductPerformanceRow[] {
  return Array.from(aggMap.values()).map((a) => ({
    productId: a.productId ?? 0,
    name: a.name,
    sku: a.sku,
    category: a.category,
    stock: a.stock,
    stockStatus: a.stockStatus,
    quantity: a.quantity,
    revenue: a.revenue,
    cost: a.cost,
    profit: a.profit,
    margin: a.margin,
    returns: a.returns,
    popularity: a.popularity,
  }));
}

// ─── Expenses metrics ──────────────────────────────────────────────────────

function computeExpenses(
  expenses: ExpenseRow[],
  categoryMap: Map<string, string>
): ExpensesReportData {
  const totalExpenses = round2(sum(expenses.map((e) => toNumber(e.amount))));
  const catMap = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const name = categoryMap.get(e.category_id ?? '') ?? 'Uncategorized';
    if (!catMap.has(name)) catMap.set(name, { total: 0, count: 0 });
    const row = catMap.get(name)!;
    row.total = round2(row.total + toNumber(e.amount));
    row.count += 1;
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      count: v.count,
      percentage: totalExpenses > 0 ? round2((v.total / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const dayMap = new Map<string, number>();
  for (const e of expenses) {
    const k = dayKey(e.expense_date);
    dayMap.set(k, round2((dayMap.get(k) ?? 0) + toNumber(e.amount)));
  }
  const trend = Array.from(dayMap.entries())
    .map(([date, total]) => ({ date, label: date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthMap = new Map<string, number>();
  for (const e of expenses) {
    const k = monthKey(e.expense_date);
    monthMap.set(k, round2((monthMap.get(k) ?? 0) + toNumber(e.amount)));
  }
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, total]) => ({ month, label: month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const sorted = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  const dayCount = dayMap.size || 1;
  const recent = sorted.slice(0, 50).map((e) => ({
    id: e.id,
    category: categoryMap.get(e.category_id ?? '') ?? 'Uncategorized',
    amount: toNumber(e.amount),
    expenseDate: e.expense_date,
    paymentMethod: e.payment_method ?? '',
    notes: e.notes,
    description: e.description,
  }));

  return {
    kpis: {
      totalExpenses,
      expenseCount: expenses.length,
      dailyAverage: round2(totalExpenses / dayCount),
      topCategory: byCategory[0]?.category ?? null,
    },
    byCategory,
    trend,
    monthlyTrend,
    recent,
  };
}

// ─── Customer metrics ──────────────────────────────────────────────────────

function computeCustomers(
  orders: OrderRow[],
  allOrders: OrderRow[],
  profiles: ProfileRow[],
  from: string,
  to: string
): CustomersReportData {
  const profileMap = new Map<string, ProfileRow>();
  for (const p of profiles) profileMap.set(p.id, p);

  const customerIdOf = (o: OrderRow): string | null => o.user_id ?? o.customer_id;

  // Per-customer aggregation within range
  const customerAgg = new Map<string, { orders: number; spent: number; first: string | null; last: string | null }>();
  for (const o of orders) {
    if (isCancelled(o)) continue;
    const cid = customerIdOf(o);
    if (!cid) continue;
    if (!customerAgg.has(cid)) customerAgg.set(cid, { orders: 0, spent: 0, first: null, last: null });
    const agg = customerAgg.get(cid)!;
    agg.orders += 1;
    agg.spent = round2(agg.spent + toNumber(o.total));
    if (!agg.first || o.created_at < agg.first) agg.first = o.created_at;
    if (!agg.last || o.created_at > agg.last) agg.last = o.created_at;
  }

  // All-time spend per customer for LTV segments
  const allTime = new Map<string, number>();
  for (const o of allOrders) {
    if (isCancelled(o)) continue;
    const cid = customerIdOf(o);
    if (!cid) continue;
    allTime.set(cid, round2((allTime.get(cid) ?? 0) + toNumber(o.total)));
  }

  const totalSpend = round2(sum(Array.from(customerAgg.values()).map((a) => a.spent)));

  const topCustomers = profiles
    .map((p) => {
      const agg = customerAgg.get(p.id);
      return {
        customerId: p.id,
        name: p.full_name || p.email || 'Unknown',
        email: p.email,
        phone: p.phone,
        orders: agg?.orders ?? 0,
        totalSpent: agg?.spent ?? 0,
        avgOrderValue: agg && agg.orders > 0 ? round2(agg.spent / agg.orders) : 0,
        firstOrderAt: agg?.first ?? null,
        lastOrderAt: agg?.last ?? null,
        joinedAt: p.created_at ?? null,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.orders - a.orders);

  const activeCustomers = topCustomers.filter((c) => c.orders > 0).length;
  const returningCustomers = topCustomers.filter((c) => c.orders >= 2).length;
  const newCustomers = profiles.filter((p) => {
    const c = new Date(p.created_at);
    return c >= new Date(from) && c <= new Date(to);
  }).length;

  // LTV segments (all-time spend)
  const segments: Record<string, { count: number; total: number }> = {};
  for (const [cid, spent] of allTime) {
    const segment =
      spent >= 50000 ? 'VIP' : spent >= 10000 ? 'Premium' : spent >= 1000 ? 'Regular' : 'Low Value';
    if (!segments[segment]) segments[segment] = { count: 0, total: 0 };
    segments[segment].count += 1;
    segments[segment].total = round2(segments[segment].total + spent);
  }
  const ltvSegments = Object.entries(segments)
    .map(([segment, v]) => ({
      segment,
      customerCount: v.count,
      avgLtv: v.count > 0 ? round2(v.total / v.count) : 0,
      totalRevenue: v.total,
    }))
    .sort((a, b) => b.avgLtv - a.avgLtv);

  // Customer acquisition per month (last 12 months)
  const now = new Date();
  const monthLabels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const countByMonth = new Map<string, number>();
  for (const p of profiles) {
    countByMonth.set(monthKey(p.created_at), (countByMonth.get(monthKey(p.created_at)) ?? 0) + 1);
  }
  let cumulative = 0;
  const acquisition = monthLabels.map((m) => {
    cumulative += countByMonth.get(m) ?? 0;
    return { month: m, label: m, newCustomers: countByMonth.get(m) ?? 0, cumulative };
  });

  return {
    kpis: {
      totalCustomers: profiles.length,
      newCustomers,
      returningCustomers,
      activeCustomers,
      totalSpend,
      avgLifetimeValue: profiles.length > 0 ? round2(totalSpend / profiles.length) : 0,
    },
    topCustomers,
    acquisition,
    ltvSegments,
  };
}

// ─── Profit & Loss ─────────────────────────────────────────────────────────

function computeProfitLoss(
  orders: OrderRow[],
  expenses: ExpenseRow[],
  costMap: Map<number, number>,
  categoryMap: Map<string, string>
): ProfitLossData {
  const valid = orders.filter((o) => !isCancelled(o));
  const grossRevenue = round2(sum(valid.map((o) => toNumber(o.total))));

  let productCost = 0;
  const prodAgg = new Map<string, { qty: number; revenue: number; cost: number; name: string; sku: string }>();
  for (const o of valid) {
    for (const li of orderLineItems(o)) {
      const costPrice = li.productId !== null ? (costMap.get(li.productId) ?? 0) : 0;
      const cost = li.qty * costPrice;
      productCost += cost;
      const key = li.productId !== null ? `p:${li.productId}` : `n:${li.name.toLowerCase()}`;
      if (!prodAgg.has(key)) prodAgg.set(key, { qty: 0, revenue: 0, cost: 0, name: li.name, sku: '' });
      const agg = prodAgg.get(key)!;
      agg.qty += li.qty;
      agg.revenue = round2(agg.revenue + li.revenue);
      agg.cost = round2(agg.cost + cost);
      agg.name = li.name;
    }
  }
  productCost = round2(productCost);

  const shippingCost = round2(sum(valid.map((o) => toNumber(o.actual_courier_cost ?? o.delivery_charge))));
  const discounts = round2(sum(valid.map((o) => toNumber(o.discount))));
  const refunds = round2(sum(orders.filter(isRefunded).map((o) => toNumber(o.total))));
  const expensesTotal = round2(sum(expenses.map((e) => toNumber(e.amount))));
  const courierCost = round2(
    sum(
      expenses
        .filter((e) => {
          const name = (categoryMap.get(e.category_id ?? '') ?? '').toLowerCase();
          return name.includes('courier') || name.includes('shipping');
        })
        .map((e) => toNumber(e.amount))
    )
  );

  const grossProfit = round2(grossRevenue - productCost);
  const netProfit = round2(grossRevenue - productCost - shippingCost - discounts - expensesTotal - refunds);
  const grossMarginPct = grossRevenue > 0 ? round2((grossProfit / grossRevenue) * 100) : 0;
  const netMarginPct = grossRevenue > 0 ? round2((netProfit / grossRevenue) * 100) : 0;

  const lines: ProfitLossData['lines'] = [
    { category: 'Gross Revenue', amount: grossRevenue, kind: 'revenue' },
    { category: 'Product Cost (COGS)', amount: -productCost, kind: 'expense' },
    { category: 'Gross Profit', amount: grossProfit, kind: 'profit' },
    { category: 'Shipping Cost', amount: -shippingCost, kind: 'expense' },
    { category: 'Discounts Given', amount: -discounts, kind: 'expense' },
    { category: 'Expenses', amount: -expensesTotal, kind: 'expense' },
    { category: 'Refunds', amount: -refunds, kind: 'expense' },
    { category: 'Net Profit', amount: netProfit, kind: 'profit' },
  ];

  const byProduct = Array.from(prodAgg.entries())
    .map(([, v]) => {
      const profit = round2(v.revenue - v.cost);
      return {
        productId: null as number | null,
        name: v.name,
        sku: v.sku,
        unitsSold: v.qty,
        revenue: v.revenue,
        cost: v.cost,
        profit,
        margin: v.revenue > 0 ? round2((profit / v.revenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);

  // Daily profit
  const dayMap = new Map<string, { revenue: number; cost: number; discounts: number; shipping: number; refunds: number; orders: number }>();
  for (const o of orders) {
    const k = localDayKey(o.created_at);
    if (!dayMap.has(k)) dayMap.set(k, { revenue: 0, cost: 0, discounts: 0, shipping: 0, refunds: 0, orders: 0 });
    const row = dayMap.get(k)!;
    if (!isCancelled(o)) {
      row.revenue = round2(row.revenue + toNumber(o.total));
      row.discounts = round2(row.discounts + toNumber(o.discount));
      row.shipping = round2(row.shipping + toNumber(o.actual_courier_cost ?? o.delivery_charge));
      row.orders += 1;
    }
    if (isRefunded(o)) row.refunds = round2(row.refunds + toNumber(o.total));
  }
  const expenseByDay = new Map<string, number>();
  for (const e of expenses) {
    expenseByDay.set(dayKey(e.expense_date), round2((expenseByDay.get(dayKey(e.expense_date)) ?? 0) + toNumber(e.amount)));
  }
  const dailyProfit = Array.from(dayMap.keys())
    .sort()
    .map((date) => {
      let cost = 0;
      for (const o of orders) {
        if (isCancelled(o) || localDayKey(o.created_at) !== date) continue;
        for (const li of orderLineItems(o)) {
          const cp = li.productId !== null ? (costMap.get(li.productId) ?? 0) : 0;
          cost += li.qty * cp;
        }
      }
      const row = dayMap.get(date)!;
      const exp = expenseByDay.get(date) ?? 0;
      return {
        date,
        label: date,
        revenue: row.revenue,
        cost: round2(cost),
        expenses: round2(exp),
        profit: round2(row.revenue - cost - row.discounts - row.shipping - row.refunds - exp),
      };
    });

  // Monthly profit
  const monthMap = new Map<string, { revenue: number; cost: number; discounts: number; shipping: number; refunds: number }>();
  for (const o of orders) {
    const k = monthKey(o.created_at);
    if (!monthMap.has(k)) monthMap.set(k, { revenue: 0, cost: 0, discounts: 0, shipping: 0, refunds: 0 });
    const row = monthMap.get(k)!;
    if (!isCancelled(o)) {
      row.revenue = round2(row.revenue + toNumber(o.total));
      row.discounts = round2(row.discounts + toNumber(o.discount));
      row.shipping = round2(row.shipping + toNumber(o.actual_courier_cost ?? o.delivery_charge));
    }
    if (isRefunded(o)) row.refunds = round2(row.refunds + toNumber(o.total));
  }
  const expenseByMonth = new Map<string, number>();
  for (const e of expenses) {
    expenseByMonth.set(monthKey(e.expense_date), round2((expenseByMonth.get(monthKey(e.expense_date)) ?? 0) + toNumber(e.amount)));
  }
  const monthlyProfit = Array.from(monthMap.keys())
    .sort()
    .map((month) => {
      let cost = 0;
      for (const o of orders) {
        if (isCancelled(o) || monthKey(o.created_at) !== month) continue;
        for (const li of orderLineItems(o)) {
          const cp = li.productId !== null ? (costMap.get(li.productId) ?? 0) : 0;
          cost += li.qty * cp;
        }
      }
      const row = monthMap.get(month)!;
      const exp = expenseByMonth.get(month) ?? 0;
      return {
        month,
        label: month,
        revenue: row.revenue,
        cost: round2(cost),
        expenses: round2(exp),
        profit: round2(row.revenue - cost - row.discounts - row.shipping - row.refunds - exp),
      };
    });

  return {
    summary: {
      grossRevenue,
      productCost,
      grossProfit,
      shippingCost,
      discounts,
      refunds,
      expenses: expensesTotal,
      courierCost,
      netProfit,
      grossMarginPct,
      netMarginPct,
    },
    lines,
    byProduct,
    dailyProfit,
    monthlyProfit,
  };
}

// ─── Public actions ────────────────────────────────────────────────────────

export async function getReportSales(from?: string, to?: string): Promise<SalesReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const orders = await loadOrders(supabase, f, t);
    const span = Math.max(1, Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86400000));
    const prevFrom = new Date(new Date(f).getTime() - span * 86400000).toISOString();
    const prevOrders = await loadOrders(supabase, prevFrom, f);
    return computeSales(orders, prevOrders);
  } catch (err) {
    console.error('[Reports] getReportSales error:', err);
    return {
      kpis: {
        grossRevenue: 0, netRevenue: 0, refunds: 0, totalOrders: 0, successfulOrders: 0,
        cancelledOrders: 0, returnedOrders: 0, pendingOrders: 0, processingOrders: 0,
        deliveredOrders: 0, avgOrderValue: 0, itemsSold: 0, salesGrowthPct: 0,
      },
      hourlySales: [], dailyTrend: [], monthlyTrend: [], weeklyComparison: [],
      statusBreakdown: [], paymentBreakdown: [],
    };
  }
}

export async function getReportProfitLoss(from?: string, to?: string): Promise<ProfitLossData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [orders, expenses, products, categories] = await Promise.all([
      loadOrders(supabase, f, t),
      loadExpenses(supabase, f, t),
      loadProducts(supabase),
      loadCategories(supabase),
    ]);
    const costMap = new Map<number, number>();
    for (const p of products) costMap.set(p.id, toNumber(p.cost_price));
    return computeProfitLoss(orders, expenses, costMap, categories);
  } catch (err) {
    console.error('[Reports] getReportProfitLoss error:', err);
    return {
      summary: {
        grossRevenue: 0, productCost: 0, grossProfit: 0, shippingCost: 0, discounts: 0,
        refunds: 0, expenses: 0, courierCost: 0, netProfit: 0, grossMarginPct: 0, netMarginPct: 0,
      },
      lines: [], byProduct: [], dailyProfit: [], monthlyProfit: [],
    };
  }
}

export async function getReportExpenses(from?: string, to?: string): Promise<ExpensesReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [expenses, categories] = await Promise.all([loadExpenses(supabase, f, t), loadCategories(supabase)]);
    return computeExpenses(expenses, categories);
  } catch (err) {
    console.error('[Reports] getReportExpenses error:', err);
    return {
      kpis: { totalExpenses: 0, expenseCount: 0, dailyAverage: 0, topCategory: null },
      byCategory: [], trend: [], monthlyTrend: [], recent: [],
    };
  }
}

export async function getReportProducts(from?: string, to?: string): Promise<ProductsReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [orders, products, categories, orderRequests] = await Promise.all([
      loadOrders(supabase, f, t),
      loadProducts(supabase),
      loadCategories(supabase),
      loadOrderRequests(supabase),
    ]);
    const popularity = new Map<number, number>();
    for (const r of orderRequests) {
      if (r.product_id !== null) popularity.set(r.product_id, (popularity.get(r.product_id) ?? 0) + 1);
    }
    const agg = aggregateProducts(orders, products, categories, popularity);
    const rows = toProductRows(agg);

    const bestSelling = rows.filter((r) => r.quantity > 0).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    const worstSelling = [...rows].sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue);
    const mostPopular = [...rows].sort((a, b) => b.popularity - a.popularity || b.quantity - a.quantity);
    const performance = [...rows].sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);

    const lowStockList = products
      .filter((p) => toNumber(p.stock) <= toNumber(p.min_stock_level ?? 5))
      .map((p) => {
        const aggRow = agg.get(`p:${p.id}`);
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku ?? '',
          category: categories.get(p.category_id ?? '') ?? 'Uncategorized',
          stock: toNumber(p.stock),
          stockStatus: p.stock_status ?? 'low_stock',
          quantity: aggRow?.quantity ?? 0,
          revenue: aggRow?.revenue ?? 0,
          cost: aggRow?.cost ?? 0,
          profit: aggRow?.profit ?? 0,
          margin: aggRow?.margin ?? 0,
          returns: aggRow?.returns ?? 0,
          popularity: popularity.get(p.id) ?? 0,
        };
      })
      .sort((a, b) => a.stock - b.stock);

    const outOfStockList = lowStockList.filter((p) => p.stock <= 0);
    const inStockCount = products.filter((p) => toNumber(p.stock) > 0).length;

    const addedProducts = [...products]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((p) => {
        const aggRow = agg.get(`p:${p.id}`);
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku ?? '',
          category: categories.get(p.category_id ?? '') ?? 'Uncategorized',
          stock: toNumber(p.stock),
          stockStatus: p.stock_status ?? 'in_stock',
          quantity: aggRow?.quantity ?? 0,
          revenue: aggRow?.revenue ?? 0,
          cost: aggRow?.cost ?? 0,
          profit: aggRow?.profit ?? 0,
          margin: aggRow?.margin ?? 0,
          returns: aggRow?.returns ?? 0,
          popularity: popularity.get(p.id) ?? 0,
        };
      });

    const totalUnitsSold = sum(bestSelling.map((r) => r.quantity));
    const totalRevenue = round2(sum(bestSelling.map((r) => r.revenue)));
    const totalProfit = round2(sum(bestSelling.map((r) => r.profit)));
    const totalStockUnits = sum(products.map((p) => toNumber(p.stock)));
    const stockValue = round2(sum(products.map((p) => toNumber(p.stock) * toNumber(p.cost_price))));

    return {
      kpis: {
        totalProducts: products.length,
        productsSold: bestSelling.filter((r) => r.quantity > 0).length,
        totalUnitsSold,
        totalRevenue,
        totalProfit,
        totalStockUnits,
        stockValue,
        lowStockCount: lowStockList.length,
        outOfStockCount: outOfStockList.length,
        inStockCount,
      },
      bestSelling,
      worstSelling,
      mostPopular,
      performance,
      lowStockProducts: lowStockList,
      outOfStockProducts: outOfStockList,
      recentlyAdded: addedProducts,
    };
  } catch (err) {
    console.error('[Reports] getReportProducts error:', err);
    return {
      kpis: {
        totalProducts: 0, productsSold: 0, totalUnitsSold: 0, totalRevenue: 0, totalProfit: 0,
        totalStockUnits: 0, stockValue: 0, lowStockCount: 0, outOfStockCount: 0, inStockCount: 0,
      },
      bestSelling: [], worstSelling: [], mostPopular: [], performance: [],
      lowStockProducts: [], outOfStockProducts: [], recentlyAdded: [],
    };
  }
}

export async function getReportCustomers(from?: string, to?: string): Promise<CustomersReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [orders, allOrders, profiles] = await Promise.all([
      loadOrders(supabase, f, t),
      loadAllOrders(supabase),
      loadCustomers(supabase),
    ]);
    return computeCustomers(orders, allOrders, profiles, f, t);
  } catch (err) {
    console.error('[Reports] getReportCustomers error:', err);
    return {
      kpis: {
        totalCustomers: 0, newCustomers: 0, returningCustomers: 0, activeCustomers: 0,
        totalSpend: 0, avgLifetimeValue: 0,
      },
      topCustomers: [], acquisition: [], ltvSegments: [],
    };
  }
}

export async function getReportInventory(from?: string, to?: string): Promise<InventoryReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [products, warehouses, movements, orders] = await Promise.all([
      loadProducts(supabase),
      loadWarehouses(supabase),
      loadStockMovements(supabase, f, t),
      loadOrders(supabase, f, t),
    ]);

    const productMap = new Map<number, ProductRow>();
    for (const p of products) productMap.set(p.id, p);

    const totalStockUnits = sum(products.map((p) => toNumber(p.stock)));
    const totalStockValue = round2(sum(products.map((p) => toNumber(p.stock) * toNumber(p.cost_price))));
    const inStockCount = products.filter((p) => toNumber(p.stock) > 0).length;
    const lowStockCount = products.filter((p) => toNumber(p.stock) <= toNumber(p.min_stock_level ?? 5)).length;
    const outOfStockCount = products.filter((p) => toNumber(p.stock) <= 0).length;

    let cogs = 0;
    for (const o of orders) {
      if (isCancelled(o)) continue;
      for (const li of orderLineItems(o)) {
        const cp = li.productId !== null ? toNumber(productMap.get(li.productId)?.cost_price) : 0;
        cogs += li.qty * cp;
      }
    }
    cogs = round2(cogs);
    const turnoverRatio = totalStockValue > 0 ? round2(cogs / totalStockValue) : 0;

    const warehouseAgg = new Map<string, { in: number; out: number }>();
    for (const w of warehouses) warehouseAgg.set(w.id, { in: 0, out: 0 });

    const movementsRows = movements
      .map((m) => {
        const prod = m.product_id != null ? productMap.get(Number(m.product_id)) : undefined;
        const change = toNumber(m.quantity_change);
        const wid = m.warehouse_id;
        if (wid && warehouseAgg.has(wid)) {
          const row = warehouseAgg.get(wid)!;
          if (change > 0) row.in += change;
          else row.out += Math.abs(change);
        }
        return {
          id: String(m.id),
          productId: m.product_id != null ? Number(m.product_id) : null,
          productName: prod?.name ?? `Product #${m.product_id ?? '?'}`,
          movementType: String(m.movement_type || 'unknown'),
          quantityChange: change,
          stockBefore: toNumber(m.stock_before),
          stockAfter: toNumber(m.stock_after),
          referenceType: String(m.reference_type || ''),
          notes: m.notes ?? null,
          createdAt: String(m.created_at),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const byWarehouse = warehouses.map((w) => {
      const agg = warehouseAgg.get(w.id) ?? { in: 0, out: 0 };
      return {
        id: w.id,
        name: w.name,
        isActive: !!w.is_active,
        movementsIn: agg.in,
        movementsOut: agg.out,
        netUnits: agg.in - agg.out,
      };
    });

    const dayMap = new Map<string, { stockIn: number; stockOut: number }>();
    for (const m of movements) {
      const k = localDayKey(m.created_at);
      if (!dayMap.has(k)) dayMap.set(k, { stockIn: 0, stockOut: 0 });
      const row = dayMap.get(k)!;
      const change = toNumber(m.quantity_change);
      if (change > 0) row.stockIn += change;
      else row.stockOut += Math.abs(change);
    }
    const stockInOut = Array.from(dayMap.keys())
      .sort()
      .map((date) => ({ date, label: date, ...dayMap.get(date)! }));

    const lowStock = products
      .filter((p) => toNumber(p.stock) <= toNumber(p.min_stock_level ?? 5))
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku ?? '',
        category: 'Uncategorized',
        stock: toNumber(p.stock),
        stockStatus: p.stock_status ?? 'low_stock',
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        returns: 0,
        popularity: 0,
      }))
      .sort((a, b) => a.stock - b.stock);

    const outOfStock = lowStock.filter((p) => p.stock <= 0);

    return {
      kpis: {
        totalProducts: products.length,
        totalStockUnits,
        totalStockValue,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        avgStockPerProduct: products.length > 0 ? round2(totalStockUnits / products.length) : 0,
        cogs,
        turnoverRatio,
      },
      byWarehouse,
      movements: movementsRows,
      stockInOut,
      lowStock,
      outOfStock,
    };
  } catch (err) {
    console.error('[Reports] getReportInventory error:', err);
    return {
      kpis: {
        totalProducts: 0, totalStockUnits: 0, totalStockValue: 0, inStockCount: 0,
        lowStockCount: 0, outOfStockCount: 0, avgStockPerProduct: 0, cogs: 0, turnoverRatio: 0,
      },
      byWarehouse: [], movements: [], stockInOut: [], lowStock: [], outOfStock: [],
    };
  }
}

export async function getReportOrders(from?: string, to?: string): Promise<OrdersReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const orders = await loadOrders(supabase, f, t);
    const sales = computeSales(orders);

    const customerIds = new Set<string>();
    for (const o of orders) {
      if (o.user_id) customerIds.add(o.user_id);
      if (o.customer_id) customerIds.add(o.customer_id);
    }
    const profileMap = new Map<string, string>();
    if (customerIds.size > 0) {
      const ids = Array.from(customerIds).slice(0, 900);
      const { data } = await supabase.from('profiles').select('id,full_name,email').in('id', ids);
      for (const p of data ?? []) profileMap.set(p.id, p.full_name || p.email || 'Unknown');
    }

    const recentOrders = [...orders]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 100)
      .map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: (o.user_id && profileMap.get(o.user_id)) || (o.customer_id && profileMap.get(o.customer_id)) || 'Guest',
        total: toNumber(o.total),
        status: (o.status || 'unknown').toLowerCase(),
        paymentStatus: (o.payment_status || 'unknown').toLowerCase(),
        paymentMethod: o.payment_method || '',
        createdAt: o.created_at,
      }));

    const s = sales.kpis;
    return {
      kpis: {
        totalOrders: s.totalOrders,
        totalRevenue: s.grossRevenue,
        pending: s.pendingOrders,
        confirmed: orders.filter((o) => (o.status || '').toLowerCase() === 'confirmed').length,
        processing: s.processingOrders,
        packed: orders.filter((o) => (o.status || '').toLowerCase() === 'packed').length,
        shipped: orders.filter((o) => ['shipped', 'in_transit', 'out_for_delivery'].includes((o.status || '').toLowerCase())).length,
        delivered: s.deliveredOrders,
        returned: s.returnedOrders,
        cancelled: s.cancelledOrders,
      },
      byStatus: sales.statusBreakdown,
      byPaymentMethod: Object.entries(
        orders.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
          const m = o.payment_method || 'unknown';
          if (!acc[m]) acc[m] = { count: 0, total: 0 };
          acc[m].count += 1;
          acc[m].total = round2(acc[m].total + toNumber(o.total));
          return acc;
        }, {})
      ).map(([method, v]) => ({ method, count: v.count, total: v.total })),
      dailyVolume: sales.dailyTrend,
      recentOrders,
    };
  } catch (err) {
    console.error('[Reports] getReportOrders error:', err);
    return {
      kpis: {
        totalOrders: 0, totalRevenue: 0, pending: 0, confirmed: 0, processing: 0, packed: 0,
        shipped: 0, delivered: 0, returned: 0, cancelled: 0,
      },
      byStatus: [], byPaymentMethod: [], dailyVolume: [], recentOrders: [],
    };
  }
}

export async function getReportPayments(from?: string, to?: string): Promise<PaymentsReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const orders = await loadOrders(supabase, f, t);
    const valid = orders.filter((o) => !isCancelled(o));
    const cod = valid.filter((o) => (o.payment_method || '').toLowerCase() === 'cod');

    const codCollected = round2(sum(cod.filter((o) => (o.payment_status || '').toLowerCase() === 'paid').map((o) => toNumber(o.total))));
    const codPending = round2(
      sum(
        cod
          .filter((o) => {
            const ps = (o.payment_status || '').toLowerCase();
            return !['paid', 'refunded'].includes(ps) && !isRefunded(o);
          })
          .map((o) => toNumber(o.total))
      )
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const cashCollectedToday = round2(
      sum(
        orders
          .filter((o) => {
            const ps = (o.payment_status || '').toLowerCase();
            return ps === 'paid' && new Date(o.created_at) >= todayStart;
          })
          .map((o) => toNumber(o.total))
      )
    );

    const inflow = round2(sum(valid.filter((o) => (o.payment_status || '').toLowerCase() === 'paid').map((o) => toNumber(o.total))));
    const outflow = round2(sum(orders.filter(isRefunded).map((o) => toNumber(o.total))));

    const dayMap = new Map<string, { collected: number; pending: number; orders: number }>();
    for (const o of valid) {
      const k = localDayKey(o.created_at);
      if (!dayMap.has(k)) dayMap.set(k, { collected: 0, pending: 0, orders: 0 });
      const row = dayMap.get(k)!;
      row.orders += 1;
      const isCod = (o.payment_method || '').toLowerCase() === 'cod';
      const paid = (o.payment_status || '').toLowerCase() === 'paid';
      if (isCod) {
        if (paid) row.collected = round2(row.collected + toNumber(o.total));
        else if (!isRefunded(o)) row.pending = round2(row.pending + toNumber(o.total));
      }
    }
    const dailyCollection = Array.from(dayMap.keys())
      .sort()
      .map((date) => ({ date, label: date, ...dayMap.get(date)! }));

    const methodMap = new Map<string, { count: number; total: number; paid: number; pending: number }>();
    for (const o of valid) {
      const m = o.payment_method || 'unknown';
      if (!methodMap.has(m)) methodMap.set(m, { count: 0, total: 0, paid: 0, pending: 0 });
      const row = methodMap.get(m)!;
      row.count += 1;
      row.total = round2(row.total + toNumber(o.total));
      if ((o.payment_status || '').toLowerCase() === 'paid') row.paid = round2(row.paid + toNumber(o.total));
      else if (!isRefunded(o)) row.pending = round2(row.pending + toNumber(o.total));
    }
    const byMethod = Array.from(methodMap.entries()).map(([method, v]) => ({ method, ...v }));

    return {
      kpis: {
        codOrders: cod.length,
        codCollected,
        codPending,
        cashCollectedToday,
        collectionRatePct: codCollected + codPending > 0 ? round2((codCollected / (codCollected + codPending)) * 100) : 0,
      },
      dailyCollection,
      cashFlow: { inflow, outflow, net: round2(inflow - outflow) },
      byMethod,
    };
  } catch (err) {
    console.error('[Reports] getReportPayments error:', err);
    return {
      kpis: { codOrders: 0, codCollected: 0, codPending: 0, cashCollectedToday: 0, collectionRatePct: 0 },
      dailyCollection: [], cashFlow: { inflow: 0, outflow: 0, net: 0 }, byMethod: [],
    };
  }
}

export async function getReportDashboard(from?: string, to?: string): Promise<DashboardReportData> {
  const supabase = await createSupabaseServerClient();
  const { from: f, to: t } = normalizeRange(from, to);
  await requireReportAccess();
  try {
    const [orders, products, expenses, profiles, categories, orderRequests] = await Promise.all([
      loadOrders(supabase, f, t),
      loadProducts(supabase),
      loadExpenses(supabase, f, t),
      loadCustomers(supabase),
      loadCategories(supabase),
      loadOrderRequests(supabase),
    ]);

    const span = Math.max(1, Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86400000));
    const prevFrom = new Date(new Date(f).getTime() - span * 86400000).toISOString();
    const prevOrders = await loadOrders(supabase, prevFrom, f);

    const sales = computeSales(orders, prevOrders);
    const costMap = new Map<number, number>();
    for (const p of products) costMap.set(p.id, toNumber(p.cost_price));
    const pl = computeProfitLoss(orders, expenses, costMap, categories);
    const expensesData = computeExpenses(expenses, categories);

    const popularity = new Map<number, number>();
    for (const r of orderRequests) {
      if (r.product_id !== null) popularity.set(r.product_id, (popularity.get(r.product_id) ?? 0) + 1);
    }
    const agg = aggregateProducts(orders, products, categories, popularity);
    const productRows = toProductRows(agg)
      .filter((r) => r.quantity > 0 || r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const customerGrowth = computeCustomers(orders, [], profiles, f, t).acquisition;

    const profitTrend = [...pl.dailyProfit]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        key: d.date,
        label: d.date,
        revenue: d.revenue,
        profit: d.profit,
        expenses: d.expenses,
      }));

    return {
      sales: sales.kpis,
      profit: {
        grossProfit: pl.summary.grossProfit,
        netProfit: pl.summary.netProfit,
        netMarginPct: pl.summary.netMarginPct,
        grossMarginPct: pl.summary.grossMarginPct,
      },
      expenses: expensesData.kpis.totalExpenses,
      customers: {
        totalCustomers: profiles.length,
        newCustomers: profiles.filter((p) => {
          const c = new Date(p.created_at);
          return c >= new Date(f) && c <= new Date(t);
        }).length,
        activeCustomers: productRows.length > 0 ? new Set(orders.filter((o) => !isCancelled(o) && (o.user_id || o.customer_id)).map((o) => o.user_id ?? o.customer_id)).size : 0,
      },
      salesTrend: sales.dailyTrend,
      profitTrend,
      ordersByStatus: sales.statusBreakdown,
      bestSellingProducts: productRows.slice(0, 8),
      customerGrowth,
      monthlyComparison: sales.monthlyTrend,
      weeklyComparison: sales.weeklyComparison,
      paymentStatus: sales.paymentBreakdown,
    };
  } catch (err) {
    console.error('[Reports] getReportDashboard error:', err);
    return {
      sales: {
        grossRevenue: 0, netRevenue: 0, refunds: 0, totalOrders: 0, successfulOrders: 0,
        cancelledOrders: 0, returnedOrders: 0, pendingOrders: 0, processingOrders: 0,
        deliveredOrders: 0, avgOrderValue: 0, itemsSold: 0, salesGrowthPct: 0,
      },
      profit: { grossProfit: 0, netProfit: 0, netMarginPct: 0, grossMarginPct: 0 },
      expenses: 0,
      customers: { totalCustomers: 0, newCustomers: 0, activeCustomers: 0 },
      salesTrend: [], profitTrend: [], ordersByStatus: [], bestSellingProducts: [],
      customerGrowth: [], monthlyComparison: [], weeklyComparison: [], paymentStatus: [],
    };
  }
}
