'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, ShoppingBag, Truck, Percent, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const PIE_COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626', '#9333ea', '#ea580c'];

function statusColor(name: string) {
  const map: Record<string, string> = { pending: '#ca8a04', processing: '#2563eb', shipped: '#9333ea', delivered: '#16a34a', cancelled: '#dc2626', failed: '#dc2626', refunded: '#ea580c' };
  return map[name] || '#64748b';
}

export function SalesReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const kpiCards = [
    { label: 'Total Revenue', value: formatPrice(data.totals.revenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Orders', value: String(data.dailySales.reduce((s: number, d: any) => s + d.orders, 0)), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Shipping Charged', value: formatPrice(data.totals.shipping), icon: Truck, color: 'bg-purple-50 text-purple-600' },
    { label: 'Discounts Given', value: formatPrice(data.totals.discount), icon: Percent, color: 'bg-amber-50 text-amber-600' },
    { label: 'Items Sold', value: String(data.dailySales.reduce((s: number, d: any) => s + d.items_sold, 0)), icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Avg Order Value', value: formatPrice(
      data.dailySales.reduce((s: number, d: any) => s + d.orders, 0) > 0
        ? data.dailySales.reduce((s: number, d: any) => s + d.revenue, 0) / data.dailySales.reduce((s: number, d: any) => s + d.orders, 0)
        : 0
    ), icon: RefreshCw, color: 'bg-rose-50 text-rose-600' },
  ];

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/sales?range=${encodeURIComponent(range)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.dailySales} filename="sales-report" columns={[
          { key: 'date', label: 'Date' }, { key: 'orders', label: 'Orders' },
          { key: 'revenue', label: 'Revenue' }, { key: 'items_sold', label: 'Items Sold' },
          { key: 'avg_order_value', label: 'Avg Order Value' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Revenue" subtitle="Revenue per day">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailySales}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#1a4731" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Orders" subtitle="Orders per day">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailySales}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Order Status Breakdown" subtitle="Orders by status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }: any) => `${status}: ${count}`}>
                  {data.statusBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={statusColor(_.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payment Status" subtitle="Orders by payment status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }: any) => `${status}: ${count}`}>
                  {data.paymentBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={statusColor(_.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Coupon Usage" subtitle="Discount codes used">
          <div className="h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2 px-2 font-bold">Code</th>
                <th className="py-2 px-2 font-bold text-right">Uses</th>
                <th className="py-2 px-2 font-bold text-right">Discount</th>
              </tr></thead>
              <tbody>
                {data.couponReport.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-400">No coupon usage in this period</td></tr>
                )}
                {data.couponReport.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 px-2 font-medium text-slate-800">{c.coupon_code}</td>
                    <td className="py-2 px-2 text-right">{c.times_used}</td>
                    <td className="py-2 px-2 text-right font-medium text-red-600">{formatPrice(c.total_discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {data.salesByCategory?.length > 0 && (
        <ChartCard title="Sales by Category" subtitle="Revenue by product category">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesByCategory} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#1a4731" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <ChartCard title="Sales Data Table" subtitle="Detailed daily breakdown">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Date</th>
              <th className="py-2.5 px-3 font-bold text-right">Orders</th>
              <th className="py-2.5 px-3 font-bold text-right">Items Sold</th>
              <th className="py-2.5 px-3 font-bold text-right">Revenue</th>
              <th className="py-2.5 px-3 font-bold text-right">Avg Order Value</th>
            </tr></thead>
            <tbody>
              {data.dailySales.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No sales data in this period</td></tr>
              )}
              {data.dailySales.map((row: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.date}</td>
                  <td className="py-2.5 px-3 text-right">{row.orders}</td>
                  <td className="py-2.5 px-3 text-right">{row.items_sold}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{formatPrice(row.revenue)}</td>
                  <td className="py-2.5 px-3 text-right">{formatPrice(row.avg_order_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
