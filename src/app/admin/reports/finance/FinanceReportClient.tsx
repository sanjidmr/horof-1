'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, TrendingDown, Percent, Receipt, CreditCard, FileText, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'];

export function FinanceReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/finance?range=${encodeURIComponent(range)}`);
  };

  const { summary } = data;

  const kpiCards = [
    { label: 'Gross Revenue', value: formatPrice(summary.gross_revenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Net Revenue', value: formatPrice(summary.net_revenue), icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Discounts', value: formatPrice(summary.total_discounts), icon: Percent, color: 'bg-amber-50 text-amber-600' },
    { label: 'Total Tax', value: formatPrice(summary.total_tax), icon: Receipt, color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Refunds', value: formatPrice(summary.total_refunds), icon: TrendingDown, color: 'bg-red-50 text-red-600' },
    { label: 'COGS', value: formatPrice(summary.cogs), icon: TrendingDown, color: 'bg-orange-50 text-orange-600' },
    { label: 'Paid Orders Value', value: formatPrice(summary.paid_orders), icon: CreditCard, color: 'bg-teal-50 text-teal-600' },
    { label: 'Pending Payments', value: formatPrice(summary.pending_payments), icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
  ];

  const revenueBreakdown = [
    { name: 'Gross Revenue', amount: summary.gross_revenue || 0 },
    { name: 'Net Revenue', amount: summary.net_revenue || 0 },
    { name: 'COGS', amount: summary.cogs || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.revenueByDayOfWeek} filename="finance-report" columns={[
          { key: 'day', label: 'Day' }, { key: 'revenue', label: 'Revenue' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Breakdown" subtitle="Gross Revenue vs Net Revenue vs COGS">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBreakdown}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {revenueBreakdown.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payment Collection Status" subtitle="Payments by status">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentCollection} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }: any) => `${status}: ${count}`}>
                  {data.paymentCollection.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Day of Week" subtitle="Revenue distribution across weekdays">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByDayOfWeek}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#1a4731" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue by Hour" subtitle="Hourly revenue distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueByHour}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#1a4731" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Financial Summary" subtitle="Detailed financial breakdown">
        <div className="p-4">
          <table className="w-full text-sm max-w-lg">
            <tbody>
              {[
                { label: 'Gross Revenue', value: summary.gross_revenue || 0, color: 'text-emerald-600' },
                { label: 'Net Revenue', value: summary.net_revenue || 0, color: 'text-blue-600', bold: true },
                { label: 'Total Discounts', value: -summary.total_discounts || 0, color: 'text-amber-600' },
                { label: 'Shipping Collected', value: summary.total_shipping_collected || 0, color: 'text-purple-600' },
                { label: 'Total Tax', value: summary.total_tax || 0, color: 'text-purple-600' },
                { label: 'Total Refunds', value: -summary.total_refunds || 0, color: 'text-red-600' },
                { label: 'Cost of Goods Sold (COGS)', value: -summary.cogs || 0, color: 'text-orange-600' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className={`py-3 pr-8 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{row.label}</td>
                  <td className={`py-3 text-right font-mono font-bold ${row.color}`}>
                    {row.value >= 0 ? formatPrice(row.value) : `-${formatPrice(Math.abs(row.value))}`}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200">
                <td className="py-3 pr-8 font-bold text-slate-900">Paid Orders</td>
                <td className="py-3 text-right font-mono font-bold text-teal-600">{formatPrice(summary.paid_orders || 0)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-8 font-bold text-slate-900">Pending Payments</td>
                <td className="py-3 text-right font-mono font-bold text-rose-600">{formatPrice(summary.pending_payments || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
