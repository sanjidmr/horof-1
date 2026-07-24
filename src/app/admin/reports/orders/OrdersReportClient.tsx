'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle, XCircle, Clock, Truck, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc'];

function statusColor(name: string) {
  const map: Record<string, string> = { pending: '#ca8a04', confirmed: '#2563eb', processing: '#9333ea', packed: '#ea580c', shipped: '#7c3aed', delivered: '#16a34a', cancelled: '#dc2626', returned: '#f97316', refunded: '#dc2626', paid: '#16a34a', unpaid: '#dc2626' };
  return map[name] || '#64748b';
}

export function OrdersReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const totalOrders = data.byStatus.reduce((s: number, d: any) => s + d.count, 0);
  const pending = data.byStatus.find((s: any) => s.status === 'pending')?.count || 0;
  const delivered = data.byStatus.find((s: any) => s.status === 'delivered')?.count || 0;
  const cancelled = data.byStatus.find((s: any) => s.status === 'cancelled')?.count || 0;
  const returned = data.byStatus.find((s: any) => s.status === 'returned')?.count || 0;
  const codOrders = data.codVsOnline.find((s: any) => s.type === 'cod')?.count || 0;

  const kpiCards = [
    { label: 'Total Orders', value: String(totalOrders), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: String(pending), icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Delivered', value: String(delivered), icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Cancelled', value: String(cancelled), icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Returned', value: String(returned), icon: Truck, color: 'bg-orange-50 text-orange-600' },
    { label: 'COD Orders', value: String(codOrders), icon: CreditCard, color: 'bg-purple-50 text-purple-600' },
  ];

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/orders?range=${encodeURIComponent(range)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.dailyVolume} filename="orders-report" columns={[
          { key: 'date', label: 'Date' }, { key: 'total_orders', label: 'Total Orders' },
          { key: 'pending', label: 'Pending' }, { key: 'confirmed', label: 'Confirmed' },
          { key: 'delivered', label: 'Delivered' }, { key: 'cancelled', label: 'Cancelled' },
          { key: 'returned', label: 'Returned' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Orders by Status" subtitle="Distribution of order statuses">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }: any) => `${status}: ${count}`}>
                  {data.byStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={statusColor(_.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="COD Orders" subtitle="All orders are Cash on Delivery">
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400 text-sm">This store operates exclusively on Cash on Delivery.</p>
          </div>
        </ChartCard>

        <ChartCard title="Orders by Method" subtitle="All COD">
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400 text-sm">All orders are placed with Cash on Delivery.</p>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Fulfillment Status" subtitle="Orders by fulfillment stage">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.fulfillment} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#2d6a4f" radius={[0, 4, 4, 0]}>
                  {data.fulfillment.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Order Volume" subtitle="Orders per day">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyVolume}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pending" stackId="a" fill="#ca8a04" />
                <Bar dataKey="confirmed" stackId="a" fill="#2563eb" />
                <Bar dataKey="delivered" stackId="a" fill="#16a34a" />
                <Bar dataKey="cancelled" stackId="a" fill="#dc2626" />
                <Bar dataKey="returned" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Daily Volume Data Table" subtitle="Detailed daily breakdown">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Date</th>
              <th className="py-2.5 px-3 font-bold text-right">Total</th>
              <th className="py-2.5 px-3 font-bold text-right">Pending</th>
              <th className="py-2.5 px-3 font-bold text-right">Confirmed</th>
              <th className="py-2.5 px-3 font-bold text-right">Delivered</th>
              <th className="py-2.5 px-3 font-bold text-right">Cancelled</th>
              <th className="py-2.5 px-3 font-bold text-right">Returned</th>
            </tr></thead>
            <tbody>
              {data.dailyVolume.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">No order data in this period</td></tr>
              )}
              {data.dailyVolume.map((row: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{row.date}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{row.total_orders ?? 0}</td>
                  <td className="py-2.5 px-3 text-right">{row.pending ?? 0}</td>
                  <td className="py-2.5 px-3 text-right">{row.confirmed ?? 0}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{row.delivered ?? 0}</td>
                  <td className="py-2.5 px-3 text-right text-red-600">{row.cancelled ?? 0}</td>
                  <td className="py-2.5 px-3 text-right text-orange-600">{row.returned ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
