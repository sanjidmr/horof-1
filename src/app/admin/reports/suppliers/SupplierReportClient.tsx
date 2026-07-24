'use client';

import { useRouter } from 'next/navigation';
import { Building2, ShoppingCart, DollarSign, Package, TrendingUp, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const PO_COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'];

export function SupplierReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/suppliers?range=${encodeURIComponent(range)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.suppliers} filename="suppliers-report" columns={[
          { key: 'name', label: 'Supplier' },
          { key: 'total_pos', label: 'Total POs' },
          { key: 'total_spend', label: 'Total Spend' },
          { key: 'items_received', label: 'Items Received' },
          { key: 'on_time_rate', label: 'On-Time Rate' },
          { key: 'is_active', label: 'Active' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Suppliers" value={String(data.totalSuppliers)} icon={Building2} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total POs" value={String(data.totalPOs)} icon={ShoppingCart} color="bg-purple-50 text-purple-600" />
        <KPICard label="Total Spend" value={formatPrice(data.totalSpend)} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Items Received" value={String(data.totalItemsReceived)} icon={Package} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Purchase Order Status" subtitle="Distribution by status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.poSummary} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }: any) => `${status}: ${count}`}>
                  {data.poSummary.map((_: any, i: number) => (
                    <Cell key={i} fill={PO_COLORS[i % PO_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Supplier Performance" subtitle="Top suppliers by purchase activity" className="lg:col-span-2">
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">Supplier</th>
                <th className="py-2.5 px-3 font-bold text-right">Total POs</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Spend</th>
                <th className="py-2.5 px-3 font-bold text-right">Items Received</th>
                <th className="py-2.5 px-3 font-bold text-right">On-Time Rate</th>
                <th className="py-2.5 px-3 font-bold text-right">Active</th>
              </tr></thead>
              <tbody>
                {data.suppliers.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">No supplier data available</td></tr>
                )}
                {data.suppliers.map((s: any, i: number) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2.5 px-3 text-right">{s.total_pos}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(s.total_spend)}</td>
                    <td className="py-2.5 px-3 text-right">{s.items_received}</td>
                    <td className="py-2.5 px-3 text-right">{s.on_time_rate != null ? `${s.on_time_rate}%` : '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      {s.is_active ? <CheckCircle className="inline h-4 w-4 text-emerald-500" /> : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Purchased Products" subtitle="Most ordered from suppliers">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">Product</th>
                <th className="py-2.5 px-3 font-bold">SKU</th>
                <th className="py-2.5 px-3 font-bold text-right">Qty Purchased</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Cost</th>
                <th className="py-2.5 px-3 font-bold">Supplier</th>
              </tr></thead>
              <tbody>
                {data.topProducts.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No product data available</td></tr>
                )}
                {data.topProducts.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.sku || '-'}</td>
                    <td className="py-2.5 px-3 text-right">{p.total_purchased}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(p.total_cost)}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.supplier_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="PO Summary by Status" subtitle="Purchase order cost breakdown">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Count</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Cost</th>
                <th className="py-2.5 px-3 font-bold text-right">Avg Cost</th>
              </tr></thead>
              <tbody>
                {data.poSummary.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-400">No PO data available</td></tr>
                )}
                {data.poSummary.map((s: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 capitalize">{s.status}</td>
                    <td className="py-2.5 px-3 text-right">{s.count}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(s.total_cost)}</td>
                    <td className="py-2.5 px-3 text-right">{formatPrice(s.avg_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
