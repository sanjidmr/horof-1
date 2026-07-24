'use client';

import { useRouter } from 'next/navigation';
import { Users, TrendingUp, DollarSign, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const LTV_COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'];

export function CustomerReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/customers?range=${encodeURIComponent(range)}`);
  };

  const totalRevenue = data.topCustomers.reduce((s: number, c: any) => s + c.totalSpent, 0);
  const avgLtv = data.topCustomers.length > 0 ? totalRevenue / data.topCustomers.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.topCustomers} filename="customers-report" columns={[
          { key: 'full_name', label: 'Name' }, { key: 'email', label: 'Email' },
          { key: 'totalSpent', label: 'Total Spent' }, { key: 'orderCount', label: 'Orders' },
          { key: 'avgOrderValue', label: 'Avg Order' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Customers" value={String(data.totalCustomers)} icon={Users} color="bg-blue-50 text-blue-600" />
        <KPICard label="Average LTV" value={formatPrice(avgLtv)} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Total Customer Revenue" value={formatPrice(totalRevenue)} icon={TrendingUp} color="bg-purple-50 text-purple-600" />
        <KPICard label="VIP Customers" value={String(data.ltv.find((s: any) => s.segment === 'VIP')?.customer_count || 0)} icon={Award} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Customer Lifetime Value" subtitle="Segmentation by spending">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.ltv} dataKey="customer_count" nameKey="segment" cx="50%" cy="50%" outerRadius={70} label={({ segment, customer_count }: any) => `${segment}: ${customer_count}`}>
                  {data.ltv.map((_: any, i: number) => (
                    <Cell key={i} fill={LTV_COLORS[i % LTV_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Customer Acquisition" subtitle="New customers per month" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.acquisition}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="new_customers" fill="#1a4731" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Customer Retention" subtitle="Retention rate over time">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.retention}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="retention_rate" stroke="#1a4731" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Customer LTV by Segment" subtitle="Average spend per segment">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ltv} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatPrice(v)} />
                <YAxis type="category" dataKey="segment" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="avg_ltv" fill="#2d6a4f" radius={[0, 4, 4, 0]}>
                  {data.ltv.map((_: any, i: number) => (
                    <Cell key={i} fill={LTV_COLORS[i % LTV_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top Customers" subtitle={`${data.topCustomers.length} customers ranked by total spend`}>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">#</th>
              <th className="py-2.5 px-3 font-bold">Customer</th>
              <th className="py-2.5 px-3 font-bold">Email</th>
              <th className="py-2.5 px-3 font-bold text-right">Orders</th>
              <th className="py-2.5 px-3 font-bold text-right">Total Spent</th>
              <th className="py-2.5 px-3 font-bold text-right">Avg Order</th>
              <th className="py-2.5 px-3 font-bold text-right">Joined</th>
            </tr></thead>
            <tbody>
              {data.topCustomers.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">No customer data available</td></tr>
              )}
              {data.topCustomers.map((c: any, i: number) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{c.full_name || 'Unknown'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{c.email || '-'}</td>
                  <td className="py-2.5 px-3 text-right">{c.orderCount}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(c.totalSpent)}</td>
                  <td className="py-2.5 px-3 text-right">{formatPrice(c.avgOrderValue)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
