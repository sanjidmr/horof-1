'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Package,
  Users, BarChart3, AlertTriangle, Warehouse,
  Activity, RefreshCw, Calendar,
  ArrowUpRight, ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getAnalyticsDashboardData } from '@/lib/actions/analytics-dashboard';

type Direction = 'up' | 'down' | 'flat';

type KpiTimeValues = {
  current: number;
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  growth: number;
  direction: Direction;
};

type KpiCard = {
  label: string;
  key: string;
  values: KpiTimeValues;
  format?: 'currency' | 'number' | 'count';
};

type ChartData = {
  salesOverview: any[];
  revenueTrend: any[];
  profitTrend: any[];
  ordersOverview: any[];
  expenseAnalysis: any[];
  topSellingProducts: any[];
  topCategories: any[];
  topCustomers: any[];
  warehousePerformance: any[];
  stockMovement: any[];
  lowStockProducts: any[];
  recentActivities: any[];
  financialSummary: Record<string, number>;
};

type DashboardData = {
  kpis: KpiCard[];
  charts: ChartData;
  filter: string;
};

const FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#f0a500', '#d95d39', '#4a7c59'];
const STATUS_COLORS: Record<string, string> = {
  pending: '#ca8a04', processing: '#2563eb', shipped: '#9333ea',
  delivered: '#16a34a', cancelled: '#dc2626', returned: '#ea580c',
  completed: '#16a34a',
};

function TrendIndicator({ direction, growth }: { direction: Direction; growth: number }) {
  const absGrowth = Math.abs(growth);
  if (direction === 'flat') {
    return <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Minus className="w-3 h-3" />0%</span>;
  }
  return (
    <span className={cn(
      'flex items-center gap-1 text-xs font-bold',
      direction === 'up' ? 'text-emerald-600' : 'text-red-500'
    )}>
      {direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {absGrowth.toFixed(1)}%
    </span>
  );
}

function KpiCardComponent({ card }: { card: KpiCard }) {
  const { values, format, label } = card;

  const fmt = (v: number) => {
    if (format === 'currency') return formatPrice(v);
    return v.toLocaleString();
  };

  const isPositive = values.direction === 'up';
  const isNegative = values.direction === 'down';

  return (
    <div className="bg-white rounded-[1.75rem] border border-slate-100 p-5 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{label}</span>
        <TrendIndicator direction={values.direction} growth={values.growth} />
      </div>
      <p className="text-2xl font-black text-slate-900 tracking-tight mb-3">{fmt(values.current)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Today</span>
          <span className="font-bold text-slate-700">{fmt(values.today)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Yesterday</span>
          <span className="font-bold text-slate-700">{fmt(values.yesterday)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">7 Days</span>
          <span className="font-bold text-slate-700">{fmt(values.last7Days)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">30 Days</span>
          <span className="font-bold text-slate-700">{fmt(values.last30Days)}</span>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden', className)}>
      <div className="p-5 border-b border-slate-50">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function AnalyticsDashboardClient({ initialData }: { initialData: DashboardData | null }) {
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [filter, setFilter] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const refresh = useCallback(async (f: string, cs?: string, ce?: string) => {
    setLoading(true);
    try {
      const result = await getAnalyticsDashboardData(f, cs, ce);
      if (result) setData(result as any);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds for real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      refresh(filter);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, refresh]);

  const handleFilter = useCallback((f: string) => {
    setFilter(f);
    if (f !== 'custom') {
      setShowFilters(false);
      refresh(f);
    } else {
      setShowFilters(true);
    }
  }, [refresh]);

  const applyCustom = useCallback(() => {
    if (customStart && customEnd) {
      refresh('custom', customStart, customEnd);
      setShowFilters(false);
    }
  }, [customStart, customEnd, refresh]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400 text-sm">No data available</p>
      </div>
    );
  }

  const { kpis, charts } = data;

  const kpiGroups = [
    { title: 'Revenue & Sales', items: kpis.slice(0, 8) },
    { title: 'Profit & Financial', items: kpis.slice(8, 16) },
    { title: 'Customers & Products', items: kpis.slice(16, 20) },
    { title: 'Orders & Stock', items: kpis.slice(20, 28) },
  ];

  const currentFilterLabel = FILTERS.find(f => f.value === filter)?.label ?? 'This Month';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Comprehensive real-time business intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Calendar className="w-4 h-4" />
              {currentFilterLabel}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 min-w-[200px]">
                {FILTERS.filter(f => f.value !== 'custom').map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => handleFilter(f.value)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      filter === f.value ? 'bg-[#1a4731] text-white' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-2" />
                <div className="px-2 py-2 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Custom Range</p>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={applyCustom}
                    disabled={!customStart || !customEnd}
                    className="w-full px-3 py-2 text-xs font-bold bg-[#1a4731] text-white rounded-lg hover:bg-[#2d6a4f] disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => refresh(filter)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a4731] text-white rounded-xl text-sm font-bold hover:bg-[#2d6a4f] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="space-y-8">
        {kpiGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-wide">{group.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {group.items.map((kpi) => (
                <KpiCardComponent key={kpi.key} card={kpi} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales / Revenue Trend */}
        <ChartCard title="Revenue Trend" subtitle="Daily revenue over 30 days" className="lg:col-span-2">
          {charts.revenueTrend.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a4731" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1a4731" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v?.slice(5) ?? ''} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#1a4731' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-12">No revenue data available</p>
          )}
        </ChartCard>

        {/* Profit Trend */}
        <ChartCard title="Profit Trend" subtitle="Real profit from delivered orders (revenue - COGS - shipping - discounts)">
          {charts.profitTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.profitTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v?.slice(5) ?? ''} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-12">No profit data available</p>
          )}
        </ChartCard>

        {/* Order Status Overview */}
        <ChartCard title="Orders Overview" subtitle={`${kpis.find(k => k.key === 'totalSales')?.values.current.toLocaleString() ?? 0} total orders`}>
          <div className="h-64 flex flex-col justify-center">
            {charts.ordersOverview.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={charts.ordersOverview} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {charts.ordersOverview.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {charts.ordersOverview.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-[10px] font-medium text-slate-500">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-slate-400 text-sm">No orders data</p>
            )}
          </div>
        </ChartCard>

        {/* Expense Analysis */}
        <ChartCard title="Expense Analysis" subtitle="Cost breakdown">
          <div className="h-64 flex flex-col justify-center">
            {charts.expenseAnalysis.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={charts.expenseAnalysis} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {charts.expenseAnalysis.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {charts.expenseAnalysis.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-[10px] font-medium text-slate-500">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-slate-400 text-sm">No expense data</p>
            )}
          </div>
        </ChartCard>

        {/* Top Selling Products */}
        <ChartCard title="Top Selling Products" subtitle="Best performing products">
          <div className="h-64">
            {charts.topSellingProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topSellingProducts} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={16}>
                    {charts.topSellingProducts.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No product data</p>
            )}
          </div>
        </ChartCard>

        {/* Top Categories */}
        <ChartCard title="Top Categories" subtitle="Sales by category">
          <div className="h-64">
            {charts.topCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topCategories} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" tick={{ fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={16}>
                    {charts.topCategories.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No category data</p>
            )}
          </div>
        </ChartCard>

        {/* Top Customers */}
        <ChartCard title="Top Customers" subtitle="Highest spending customers">
          <div className="max-h-64 overflow-y-auto">
            {charts.topCustomers.length > 0 ? (
              <div className="space-y-2">
                {charts.topCustomers.slice(0, 8).map((c: any, i: number) => (
                  <div key={c.customer_id ?? i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold text-slate-400 w-5">{i + 1}.</span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{c.profiles?.full_name ?? 'Unknown'}</p>
                        <p className="text-[9px] text-slate-400">{c.profiles?.email ?? ''}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{formatPrice(Number(c.total ?? 0))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No customer data</p>
            )}
          </div>
        </ChartCard>

        {/* Warehouse Performance */}
        <ChartCard title="Warehouse Performance" subtitle="Inventory by warehouse">
          <div className="max-h-64 overflow-y-auto">
            {charts.warehousePerformance.length > 0 ? (
              <div className="space-y-3">
                {charts.warehousePerformance.map((w: any, i: number) => (
                  <div key={w.warehouse_name ?? i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">{w.warehouse_name ?? 'Unknown'}</span>
                      <span className="text-[10px] font-bold text-slate-500">{w.total_stock ?? 0} units</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-[#1a4731] transition-all"
                        style={{ width: `${Math.min(100, ((w.total_stock ?? 0) / 1000) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>Value: {formatPrice(Number(w.total_value ?? 0))}</span>
                      <span>{w.low_stock_count ?? 0} low stock</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No warehouse data</p>
            )}
          </div>
        </ChartCard>

        {/* Stock Movement */}
        <ChartCard title="Stock Movement" subtitle="Recent stock changes">
          <div className="max-h-64 overflow-y-auto">
            {charts.stockMovement.length > 0 ? (
              <div className="space-y-2">
                {charts.stockMovement.slice(0, 10).map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                        (m.quantity_change ?? 0) > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                      )}>
                        {(m.quantity_change ?? 0) > 0 ? '+' : ''}{m.quantity_change}
                      </span>
                      <p className="text-xs text-slate-700 truncate max-w-[160px]">{m.product_name ?? 'Unknown'}</p>
                    </div>
                    <span className="text-[9px] text-slate-400">{m.movement_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No stock movements</p>
            )}
          </div>
        </ChartCard>

        {/* Low Stock Products */}
        <ChartCard title="Low Stock Products" subtitle="Products needing restock">
          <div className="max-h-64 overflow-y-auto">
            {charts.lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {charts.lowStockProducts.slice(0, 10).map((p: any, i: number) => (
                  <div key={p.product_id ?? i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">{p.name ?? 'Unknown'}</p>
                        <p className="text-[9px] text-slate-400">SKU: {p.sku ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        'text-xs font-bold',
                        (p.stock ?? 0) === 0 ? 'text-red-500' : 'text-amber-600'
                      )}>
                        {p.stock ?? 0}
                      </span>
                      {p.reorder_qty && <p className="text-[9px] text-slate-400">Min: {p.reorder_qty}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">All products well-stocked</p>
            )}
          </div>
        </ChartCard>

        {/* Recent Activities */}
        <ChartCard title="Recent Activities" subtitle="Latest orders" className="lg:col-span-2">
          <div className="max-h-80 overflow-y-auto">
            {charts.recentActivities.length > 0 ? (
              <div className="space-y-1">
                {charts.recentActivities.slice(0, 15).map((a: any, i: number) => (
                  <div key={a.id ?? i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center',
                        'bg-blue-50'
                      )}>
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800">
                          Order #{String(a.ref).slice(0, 8)}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{formatPrice(Number(a.value ?? 0))}</p>
                      <span className={cn(
                        'text-[9px] font-medium capitalize',
                        a.status === 'pending' ? 'text-orange-500' :
                        a.status === 'delivered' || a.status === 'completed' || a.status === 'received' ? 'text-emerald-600' :
                        a.status === 'cancelled' ? 'text-red-500' : 'text-slate-500'
                      )}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No recent activities</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
