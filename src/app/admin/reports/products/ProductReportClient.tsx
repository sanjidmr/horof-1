'use client';

import { useRouter } from 'next/navigation';
import { Package, TrendingUp, AlertTriangle, ShoppingBag, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KPICard } from '@/components/reports/KPICard';
import { ChartCard } from '@/components/reports/ChartCard';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { ExportButton } from '@/components/reports/ExportButton';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#1a4731', '#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7', '#d8f3dc'];
const STATUS_COLORS: Record<string, string> = { in_stock: '#16a34a', low_stock: '#ca8a04', out_of_stock: '#dc2626', discontinued: '#64748b', pre_order: '#2563eb' };

export function ProductReportClient({ data, currentRange }: { data: any; currentRange: string }) {
  const router = useRouter();

  const handleRangeChange = (range: string) => {
    router.push(`/admin/reports/products?range=${encodeURIComponent(range)}`);
  };

  const totalSold = data.topSelling.reduce((s: number, p: any) => s + p.quantity_sold, 0);
  const totalRevenue = data.topSelling.reduce((s: number, p: any) => s + Number(p.revenue || 0), 0);

  const stockPie = [
    { name: 'In Stock', value: data.stockSummary.totalProducts - data.stockSummary.lowStock - data.stockSummary.outOfStock },
    { name: 'Low Stock', value: data.stockSummary.lowStock },
    { name: 'Out of Stock', value: data.stockSummary.outOfStock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={currentRange} onChange={handleRangeChange} />
        <ExportButton data={data.productPerformance} filename="product-performance" columns={[
          { key: 'name', label: 'Name' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Category' },
          { key: 'total_sold', label: 'Sold' }, { key: 'total_revenue', label: 'Revenue' },
          { key: 'total_profit', label: 'Profit' }, { key: 'profit_margin', label: 'Margin %' },
        ]} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Products" value={String(data.stockSummary.totalProducts)} icon={Package} color="bg-blue-50 text-blue-600" />
        <KPICard label="Items Sold" value={String(totalSold)} icon={ShoppingBag} color="bg-purple-50 text-purple-600" />
        <KPICard label="Product Revenue" value={formatPrice(totalRevenue)} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
        <KPICard label="Low Stock Items" value={String(data.stockSummary.lowStock)} icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Selling Products" subtitle="By quantity sold">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topSelling.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                <Tooltip formatter={(v: number) => `${v} sold`} />
                <Bar dataKey="quantity_sold" fill="#1a4731" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Revenue Products" subtitle="By revenue generated">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...data.topSelling].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="revenue" fill="#2d6a4f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Stock Status" subtitle="Inventory health">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }: any) => `${name}: ${value}`}>
                  {stockPie.map((_, i) => (
                    <Cell key={i} fill={['#16a34a', '#ca8a04', '#dc2626'][i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Low Stock Products" subtitle="Needs attention">
          <div className="h-64 overflow-y-auto">
            {data.stockSummary.lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No low stock products</p>
            ) : (
              data.stockSummary.lowStockProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 border-b border-slate-50">
                  <span className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{p.name}</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{p.stock}</span>
                </div>
              ))
            )}
          </div>
        </ChartCard>

        <ChartCard title="Out of Stock" subtitle="Unavailable products">
          <div className="h-64 overflow-y-auto">
            {data.stockSummary.outOfStockProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">All products in stock</p>
            ) : (
              data.stockSummary.outOfStockProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 border-b border-slate-50">
                  <span className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{p.name}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">0</span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Full Product Performance" subtitle="All products with sales data">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-3 font-bold">Product</th>
              <th className="py-2.5 px-3 font-bold">SKU</th>
              <th className="py-2.5 px-3 font-bold text-right">Stock</th>
              <th className="py-2.5 px-3 font-bold text-right">Sold</th>
              <th className="py-2.5 px-3 font-bold text-right">Revenue</th>
              <th className="py-2.5 px-3 font-bold text-right">Profit</th>
              <th className="py-2.5 px-3 font-bold text-right">Margin</th>
              <th className="py-2.5 px-3 font-bold text-right">Returns</th>
            </tr></thead>
            <tbody>
              {data.productPerformance.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">No product data available</td></tr>
              )}
              {data.productPerformance.map((p: any, i: number) => (
                <tr key={p.product_id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[200px] truncate">{p.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.sku || '-'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{p.total_sold}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{formatPrice(p.total_revenue || 0)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{formatPrice(p.total_profit || 0)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-bold ${Number(p.profit_margin) >= 20 ? 'text-emerald-600' : Number(p.profit_margin) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.profit_margin}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{p.return_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
