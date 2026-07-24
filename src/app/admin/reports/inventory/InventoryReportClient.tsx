'use client';

import { useRouter } from 'next/navigation';
import { Package, AlertTriangle, DollarSign, Warehouse, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc'];
const STATUS_COLORS: Record<string, string> = { in_stock: '#16a34a', low_stock: '#ca8a04', out_of_stock: '#dc2626' };

export function InventoryReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/inventory?range=${encodeURIComponent(range)}`);
  };

  const summary = data.summary ?? {};
  const totalProducts = summary.total_products ?? 0;
  const totalStockUnits = summary.total_stock_units ?? 0;
  const stockValue = summary.total_stock_value ?? 0;
  const lowStockCount = summary.low_stock_count ?? 0;
  const outOfStockCount = summary.out_of_stock_count ?? 0;
  const avgStock = summary.avg_stock ?? 0;
  const inStockCount = summary.in_stock_count ?? 0;

  const stockPie = [
    { name: 'In Stock', value: inStockCount },
    { name: 'Low Stock', value: lowStockCount },
    { name: 'Out of Stock', value: outOfStockCount },
  ];

  const valuationData = (data.valuation ?? []).map((v: any) => ({
    category: v.category || 'Uncategorized',
    value: Number(v.total_value ?? v.value ?? 0),
    units: Number(v.total_units ?? v.units ?? 0),
  }));

  const stockInOutData = (data.stockInOut ?? []).map((s: any) => ({
    date: s.date ?? s.period ?? '',
    stock_in: Number(s.stock_in ?? 0),
    stock_out: Number(s.stock_out ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.movements} filename="inventory-movements" columns={[
          { key: 'product_name', label: 'Product' },
          { key: 'sku', label: 'SKU' },
          { key: 'movement_type', label: 'Type' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'reference', label: 'Reference' },
          { key: 'created_at', label: 'Date' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Total Products" value={String(totalProducts)} icon={Package} color="bg-blue-50 text-blue-600" />
        <KPICard label="Total Stock Units" value={String(totalStockUnits)} icon={Package} color="bg-indigo-50 text-indigo-600" />
        <KPICard label="Stock Value" value={formatPrice(stockValue)} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Low Stock" value={String(lowStockCount)} icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
        <KPICard label="Out of Stock" value={String(outOfStockCount)} icon={AlertTriangle} color="bg-red-50 text-red-600" />
        <KPICard label="Avg Stock / Product" value={Number(avgStock).toFixed(1)} icon={TrendingUp} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Inventory Valuation by Category" subtitle="Stock value per category">
          <div className="h-72">
            {valuationData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-20">No valuation data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valuationData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {valuationData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Stock Status Distribution" subtitle="Inventory health overview">
          <div className="h-72">
            {stockPie.every((s) => s.value === 0) ? (
              <p className="text-sm text-slate-400 text-center py-20">No stock data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name}: ${value}`}>
                    {stockPie.map((_, i) => (
                      <Cell key={i} fill={['#16a34a', '#ca8a04', '#dc2626'][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Stock In / Out" subtitle="Inventory movement trends">
        <div className="h-72">
          {stockInOutData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-20">No movement data available</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockInOutData}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="stock_in" fill="#16a34a" name="Stock In" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stock_out" fill="#dc2626" name="Stock Out" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Warehouse Inventory" subtitle="Stock levels by warehouse">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-bold">Warehouse</th>
                  <th className="py-2.5 px-3 font-bold">Products</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Units</th>
                  <th className="py-2.5 px-3 font-bold text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {(data.warehouses ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-400">No warehouse data available</td></tr>
                )}
                {(data.warehouses ?? []).map((w: any, i: number) => (
                  <tr key={w.warehouse_id || w.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 flex items-center gap-2">
                      <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                      {w.warehouse_name ?? w.name ?? 'Unknown'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{w.product_count ?? w.total_products ?? 0}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">{w.total_units ?? w.stock_units ?? 0}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(w.total_value ?? w.stock_value ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Low Stock / Reorder Report" subtitle="Products below minimum stock level">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-bold">Product</th>
                  <th className="py-2.5 px-3 font-bold">SKU</th>
                  <th className="py-2.5 px-3 font-bold text-right">Current</th>
                  <th className="py-2.5 px-3 font-bold text-right">Min Level</th>
                  <th className="py-2.5 px-3 font-bold text-right">Reorder Qty</th>
                </tr>
              </thead>
              <tbody>
                {(data.lowStock ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">All products are well-stocked</td></tr>
                )}
                {(data.lowStock ?? []).map((p: any, i: number) => (
                  <tr key={p.product_id || p.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[180px] truncate">{p.name ?? p.product_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.sku || '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.stock ?? p.current_stock ?? 0}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{p.min_stock_level ?? p.min_level ?? 5}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {Math.max(0, (p.reorder_quantity ?? (p.min_stock_level ?? 5) - (p.stock ?? 0)))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Recent Stock Movements" subtitle="Latest inventory transactions">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-2.5 px-3 font-bold">Product</th>
                <th className="py-2.5 px-3 font-bold">SKU</th>
                <th className="py-2.5 px-3 font-bold">Type</th>
                <th className="py-2.5 px-3 font-bold text-right">Quantity</th>
                <th className="py-2.5 px-3 font-bold">Reference</th>
                <th className="py-2.5 px-3 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data.movements ?? []).length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No stock movements recorded</td></tr>
              )}
              {(data.movements ?? []).map((m: any, i: number) => (
                <tr key={m.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[180px] truncate">{m.product_name ?? m.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{m.sku || '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      m.movement_type === 'in' || m.movement_type === 'stock_in' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                    }`}>
                      {m.movement_type === 'in' || m.movement_type === 'stock_in' ? (
                        <ArrowDownCircle className="w-3 h-3" />
                      ) : (
                        <ArrowUpCircle className="w-3 h-3" />
                      )}
                      {m.movement_type === 'in' || m.movement_type === 'stock_in' ? 'In' : 'Out'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">{m.quantity}</td>
                  <td className="py-2.5 px-3 text-slate-500">{m.reference || '-'}</td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
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
