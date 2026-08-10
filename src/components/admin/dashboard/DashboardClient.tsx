'use client';

import { TrendingUp, DollarSign, Users, Package, ShoppingBag, AlertTriangle, Warehouse, BarChart3, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area } from 'recharts';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { usePermissions } from '@/context/PermissionContext';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'];
const STATUS_COLORS: Record<string, string> = {
  delivered: '#16a34a', pending: '#ca8a04', processing: '#2563eb', shipped: '#9333ea',
  cancelled: '#dc2626', returned: '#ea580c', refunded: '#0891b2', completed: '#16a34a',
};

export function DashboardClient({ data }: { data: any }) {
  const { hasPermission } = usePermissions();

  if (!data) return null;

  const { stats, dailySales, profitLoss, plSummary, salesByCategory, orderStatusChart, recentOrders, recentMessages } = data;

  const quickActions = [
{ href: '/admin/products/new', label: 'Add New Product', icon: Package, perm: 'products.edit' },
{ href: '/admin/orders', label: 'View Orders', icon: ShoppingBag, perm: 'orders.view' },
{ href: '/admin/messages', label: 'Messages', icon: Users, perm: 'messages.view', suffix: ` (${recentMessages.length})` },
  ].filter(a => hasPermission(a.perm));

  const kpis = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', trend: '+12.5%' },
    { label: 'Paid Revenue', value: formatPrice(stats.paidRevenue), icon: TrendingUp, color: 'bg-blue-50 text-blue-600', trend: '+8.3%' },
    { label: 'Orders', value: String(stats.orderCount), subtitle: `${stats.pendingOrders} pending`, icon: ShoppingBag, color: 'bg-purple-50 text-purple-600' },
    { label: 'Customers', value: String(stats.customerCount), icon: Users, color: 'bg-orange-50 text-orange-600' },
    { label: 'Products', value: String(stats.productCount), icon: Package, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Avg Order Value', value: formatPrice(stats.aov), icon: BarChart3, color: 'bg-rose-50 text-rose-600' },
    { label: 'Total Stock', value: stats.totalStock.toLocaleString(), icon: Warehouse, color: 'bg-teal-50 text-teal-600' },
    { label: 'Low Stock Items', value: String(stats.lowStockCount), subtitle: `${stats.outOfStockCount} out of stock`, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
  ];

  const plData = [
    { name: 'Revenue', value: plSummary.revenue, fill: '#1a4731' },
    { name: 'COGS', value: plSummary.cogs, fill: '#dc2626' },
    { name: 'Shipping', value: plSummary.shipping, fill: '#ca8a04' },
    { name: 'Discounts', value: plSummary.discounts, fill: '#ea580c' },
    { name: 'Refunds', value: plSummary.refunds, fill: '#0891b2' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-[1.75rem] border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{kpi.label}</span>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
              {kpi.subtitle && <p className="text-xs text-slate-500 mt-1.5 font-medium">{kpi.subtitle}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Revenue Trend</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daily revenue over the last 30 days</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {stats.totalRevenue > 0 ? '+12.5%' : '0%'}
              </div>
            </div>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a4731" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1a4731" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={2.5} fill="url(#revGradient)" dot={false} activeDot={{ r: 5, fill: '#1a4731' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-900">Profit & Loss</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 30 days overview</p>
          </div>
          <div className="h-72 p-4 flex flex-col justify-center">
            <div className="flex justify-center mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 font-medium">Net Profit</p>
                <p className={`text-2xl font-black ${plSummary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatPrice(plSummary.netProfit)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Margin: {stats.totalRevenue > 0 ? ((plSummary.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
            {plData.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={plData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {plData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {plData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] font-medium text-slate-500">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-900">Order Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">{stats.orderCount} total orders</p>
          </div>
          <div className="h-64 p-4 flex flex-col justify-center">
            {orderStatusChart.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={orderStatusChart} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {orderStatusChart.map((entry: any) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {orderStatusChart.map((entry: any) => (
                    <div key={entry.status} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }} />
                      <span className="text-[10px] font-medium text-slate-500 capitalize">{entry.status} ({entry.count})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-slate-400 text-sm">No orders yet</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-900">Sales by Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">Revenue breakdown by product category</p>
          </div>
          <div className="h-64 p-4">
            {salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByCategory} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" tick={{ fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                    {salesByCategory.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 text-sm py-12">No category data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[1.75rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Orders</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest 5 orders</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-bold text-[#1a4731] hover:underline flex items-center gap-1">
              View All <span className="text-base">→</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#1a4731]">#{String(order.id).slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{order.profiles?.full_name || 'Guest'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{formatPrice(Number(order.total || 0))}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          order.status === 'returned' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{order.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Inventory Status</h3>
              <Link href="/admin/inventory">
                <span className="text-xs font-bold text-[#1a4731] hover:underline">Manage →</span>
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Stock</span>
                <span className="text-sm font-bold text-slate-900">{stats.totalStock.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Inventory Value</span>
                <span className="text-sm font-bold text-slate-900">{formatPrice(stats.inventoryValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Products</span>
                <span className="text-sm font-bold text-slate-900">{stats.productCount}</span>
              </div>
              {stats.lowStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Low Stock
                  </span>
                  <span className="text-sm font-bold text-amber-600">{stats.lowStockCount}</span>
                </div>
              )}
              {stats.outOfStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Out of Stock
                  </span>
                  <span className="text-sm font-bold text-red-600">{stats.outOfStockCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a4731] to-[#0d2b1d] rounded-[1.75rem] p-6 text-white shadow-xl shadow-forest-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
            <div className="relative z-10">
              <h3 className="text-base font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                      <Icon className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium">{action.label}{action.suffix}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
