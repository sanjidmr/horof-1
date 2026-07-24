'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, TrendingDown, Percent, Truck, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const PNL_COLORS = { Revenue: '#16a34a', COGS: '#dc2626', 'Gross Profit': '#2563eb', 'Shipping Cost': '#ca8a04', 'Discounts Given': '#ea580c', Refunds: '#9333ea', 'Net Profit': '#1a4731' };

export function ProfitLossClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/profit-loss?range=${encodeURIComponent(range)}`);
  };

  const { summary } = data;

  const kpiCards = [
    { label: 'Total Revenue', value: formatPrice(summary.revenue), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'COGS', value: formatPrice(summary.cogs), icon: TrendingDown, color: 'bg-red-50 text-red-600' },
    { label: 'Gross Profit', value: formatPrice(summary.grossProfit), icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
    { label: 'Gross Margin', value: `${data.grossMargin}%`, icon: Percent, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Shipping Cost', value: formatPrice(summary.shippingCost), icon: Truck, color: 'bg-amber-50 text-amber-600' },
    { label: 'Discounts', value: formatPrice(summary.discounts), icon: RefreshCw, color: 'bg-orange-50 text-orange-600' },
    { label: 'Refunds', value: formatPrice(summary.refunds), icon: BarChart3, color: 'bg-purple-50 text-purple-600' },
    { label: 'Net Profit', value: formatPrice(summary.netProfit), icon: TrendingUp, color: summary.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600' },
    { label: 'Net Margin', value: `${data.netMargin}%`, icon: Percent, color: data.netMargin >= 0 ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600' },
  ];

  const pnlChartData = data.profitLoss
    .filter((r: any) => !['Gross Profit', 'Net Profit'].includes(r.category))
    .map((r: any) => ({ name: r.category, amount: Math.abs(r.amount), value: r.amount }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.profitByProduct} filename="profit-by-product" columns={[
          { key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' },
          { key: 'units_sold', label: 'Units Sold' }, { key: 'revenue', label: 'Revenue' },
          { key: 'cost', label: 'Cost' }, { key: 'profit', label: 'Profit' },
          { key: 'margin', label: 'Margin %' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => <KPICard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Profit & Loss Overview" subtitle="Revenue vs Costs breakdown">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {pnlChartData.map((entry: any, i: number) => (
                    <Cell key={i} fill={(PNL_COLORS as any)[entry.name] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue vs Net Profit" subtitle="Comparison">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Revenue', amount: summary.revenue },
                { name: 'COGS', amount: -summary.cogs },
                { name: 'Gross Profit', amount: summary.grossProfit },
                { name: 'Net Profit', amount: summary.netProfit },
              ]}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {[{ name: 'Revenue' }, { name: 'COGS' }, { name: 'Gross Profit' }, { name: 'Net Profit' }].map((_, i) => (
                    <Cell key={i} fill={['#16a34a', '#dc2626', '#2563eb', '#1a4731'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Summary" subtitle="Detailed P&L breakdown">
        <div className="p-4">
          <table className="w-full text-sm max-w-lg">
            <tbody>
              {[
                { label: 'Total Revenue', value: summary.revenue, color: 'text-emerald-600' },
                { label: 'Cost of Goods Sold (COGS)', value: -summary.cogs, color: 'text-red-600' },
                { label: 'Gross Profit', value: summary.grossProfit, color: 'text-blue-600', bold: true },
                { label: 'Shipping Costs', value: -summary.shippingCost, color: 'text-amber-600' },
                { label: 'Discounts Given', value: -summary.discounts, color: 'text-orange-600' },
                { label: 'Refunds', value: -summary.refunds, color: 'text-purple-600' },
                { label: 'Net Profit', value: summary.netProfit, color: summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bold: true, border: true },
              ].map((row, i) => (
                <tr key={i} className={row.border ? 'border-t-2 border-slate-200' : 'border-b border-slate-50'}>
                  <td className={`py-3 pr-8 ${row.bold ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{row.label}</td>
                  <td className={`py-3 text-right font-mono font-bold ${row.color}`}>
                    {row.value >= 0 ? formatPrice(row.value) : `-${formatPrice(Math.abs(row.value))}`}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-100">
                <td className="py-3 pr-8 text-slate-500 text-xs">Gross Margin</td>
                <td className="py-3 text-right font-bold text-blue-600">{data.grossMargin}%</td>
              </tr>
              <tr>
                <td className="py-3 pr-8 text-slate-500 text-xs">Net Margin</td>
                <td className="py-3 text-right font-bold text-emerald-600">{data.netMargin}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard title="Profit by Product" subtitle="Individual product profitability">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Product</th>
              <th className="py-2.5 px-3 font-bold">SKU</th>
              <th className="py-2.5 px-3 font-bold text-right">Units Sold</th>
              <th className="py-2.5 px-3 font-bold text-right">Revenue</th>
              <th className="py-2.5 px-3 font-bold text-right">Cost</th>
              <th className="py-2.5 px-3 font-bold text-right">Profit</th>
              <th className="py-2.5 px-3 font-bold text-right">Margin</th>
            </tr></thead>
            <tbody>
              {data.profitByProduct.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">No profit data available</td></tr>
              )}
              {data.profitByProduct.map((p: any, i: number) => (
                <tr key={p.product_id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[200px] truncate">{p.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.sku || '-'}</td>
                  <td className="py-2.5 px-3 text-right">{p.units_sold}</td>
                  <td className="py-2.5 px-3 text-right">{formatPrice(p.revenue)}</td>
                  <td className="py-2.5 px-3 text-right text-red-600">{formatPrice(p.cost)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(p.profit)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold ${Number(p.margin) >= 20 ? 'text-emerald-600' : Number(p.margin) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
