'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { formatPrice } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { fetchAdminDashboard } from '@/lib/data/admin-dashboard';

type DashboardData = Awaited<ReturnType<typeof fetchAdminDashboard>>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#ca8a04',
  processing: '#2563eb',
  shipped: '#9333ea',
  delivered: '#16a34a',
  cancelled: '#dc2626',
  returned: '#ea580c',
};

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Live metrics from Supabase</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Total Sales" value={formatPrice(data.totalSales)} subtitle="Excluding cancelled" />
        <Stat title="Today’s Orders" value={String(data.todayOrders)} />
        <Stat title="Pending Orders" value={String(data.pendingOrders)} />
        <Stat title="Total Revenue (paid)" value={formatPrice(data.totalRevenue)} />
        <Stat title="Total Customers" value={String(data.totalCustomers)} />
        <Stat title="Conversion Rate" value={`${data.conversionRate}%`} subtitle="Orders / visitors" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.statusChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] ?? '#64748b'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitors (14 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.visitorsChart}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="visitors" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.recentOrders ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                      <th className="py-2 pr-2">Order</th>
                      <th className="py-2 pr-2">Customer</th>
                      <th className="py-2 pr-2">Total</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-slate-100 dark:border-slate-900">
                        <td className="py-2 pr-2 font-mono text-xs">
                          <Link className="text-slate-900 underline dark:text-slate-100" href={`/admin/orders/${o.id}`}>
                            {o.order_number || `#${o.id.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td className="py-2 pr-2">{o.customer?.full_name ?? o.customer?.email ?? '—'}</td>
                        <td className="py-2 pr-2">{formatPrice(Number(o.total))}</td>
                        <td className="py-2 pr-2">
                          <Badge variant="secondary" className="capitalize">
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="New today" value={String(data.newCustomersToday)} />
            <Row label="New this week" value={String(data.newCustomersWeek)} />
            <Row label="New this month" value={String(data.newCustomersMonth)} />
            <div className="pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Top spenders</div>
            <ul className="space-y-1 text-xs">
              {data.topSpenders.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.full_name ?? c.email}</span>
                  <span className="shrink-0 font-medium">{formatPrice(c.spent)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top selling products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.topSelling.length === 0 ? (
              <p className="text-slate-500">No sales data yet.</p>
            ) : (
              data.topSelling.map((p) => (
                <div key={p.name} className="flex justify-between gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-900">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-slate-500">
                    {p.sold} sold · {formatPrice(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock (≤10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data.lowStock ?? []).length === 0 ? (
              <p className="text-slate-500">All products above threshold.</p>
            ) : (
              data.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0 dark:border-slate-900">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{p.stock}</Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
