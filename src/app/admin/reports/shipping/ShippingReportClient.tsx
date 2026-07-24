'use client';

import { useRouter } from 'next/navigation';
import { Truck, Package, CheckCircle, Clock, MapPin, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'];

export function ShippingReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const s = data.summary || {};

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/shipping?range=${encodeURIComponent(range)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.courierPerformance} filename="shipping-courier-performance" columns={[
          { key: 'name', label: 'Courier' },
          { key: 'total_orders', label: 'Orders' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'returned', label: 'Returned' },
          { key: 'delivery_rate', label: 'Delivery Rate' },
          { key: 'total_shipping', label: 'Total Shipping' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard label="Total Shipped" value={String(s.total_shipped ?? 0)} icon={Package} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Delivered" value={String(s.total_delivered ?? 0)} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Shipping Collected" value={formatPrice(s.total_shipping_collected ?? 0)} icon={Truck} color="bg-purple-50 text-purple-600" />
        <KPICard label="Avg Shipping Charge" value={formatPrice(s.avg_shipping_charge ?? 0)} icon={Clock} color="bg-amber-50 text-amber-600" />
        <KPICard label="Delivery Rate" value={`${(s.delivery_rate ?? 0).toFixed(1)}%`} icon={TrendingUp} color="bg-cyan-50 text-cyan-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Courier Performance" subtitle="Orders, deliveries & returns per courier">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.courierPerformance}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total_orders" fill="#1a4731" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" fill="#52b788" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returned" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Delivery Rate by Courier" subtitle="Percentage of orders delivered">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.courierPerformance} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="delivery_rate" fill="#2d6a4f" radius={[0, 4, 4, 0]}>
                  {data.courierPerformance.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Delivery Type Breakdown" subtitle="Orders by delivery type">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.deliveryByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70} label={({ type, count }: any) => `${type}: ${count}`}>
                  {data.deliveryByType.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Courier Performance Table" subtitle="Detailed breakdown by courier">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Courier</th>
              <th className="py-2.5 px-3 font-bold text-right">Orders</th>
              <th className="py-2.5 px-3 font-bold text-right">Delivered</th>
              <th className="py-2.5 px-3 font-bold text-right">Returned</th>
              <th className="py-2.5 px-3 font-bold text-right">Delivery Rate</th>
              <th className="py-2.5 px-3 font-bold text-right">Total Shipping</th>
            </tr></thead>
            <tbody>
              {data.courierPerformance.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No courier data in this period</td></tr>
              )}
              {data.courierPerformance.map((c: any, i: number) => (
                <tr key={c.name || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.name}</td>
                  <td className="py-2.5 px-3 text-right">{c.total_orders}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">{c.delivered}</td>
                  <td className="py-2.5 px-3 text-right text-red-500 font-medium">{c.returned}</td>
                  <td className="py-2.5 px-3 text-right">{c.delivery_rate?.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-medium">{formatPrice(c.total_shipping)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
