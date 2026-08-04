'use client';

import { Package, ShoppingCart, TrendingUp, Wallet, Boxes, AlertTriangle, PackageX, PackageCheck, Layers } from 'lucide-react';
import { getReportProducts } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { BarTrendChart } from '@/components/admin/reports/charts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { ProductsReportData, ProductPerformanceRow, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

function stockBadge(status: string, stock: number) {
  const s = (status || '').toLowerCase();
  const cls = stock <= 0 ? 'bg-red-50 text-red-600' : s.includes('low') || s.includes('out') ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
  const label = stock <= 0 ? 'Out of stock' : s.includes('low') ? 'Low stock' : s.includes('out') ? 'Out of stock' : 'In stock';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}

const productColumns: ReportColumn<ProductPerformanceRow>[] = [
  { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category', render: (r) => titleCase(r.category) },
  { key: 'quantity', label: 'Units Sold', align: 'right' },
  { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
  { key: 'profit', label: 'Profit', align: 'right', render: (r) => <span className={r.profit >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>{formatCurrency(r.profit)}</span> },
  { key: 'margin', label: 'Margin', align: 'right', render: (r) => `${r.margin.toFixed(1)}%` },
  { key: 'stock', label: 'Stock', align: 'right', render: (r) => `${formatNumber(r.stock)} ${stockBadge(r.stockStatus, r.stock)}` },
  { key: 'popularity', label: 'Popularity', align: 'right', render: (r) => formatNumber(r.popularity) },
];

const stockColumns: ReportColumn<ProductPerformanceRow>[] = [
  { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category', render: (r) => titleCase(r.category) },
  { key: 'stock', label: 'Stock', align: 'right', render: (r) => <span className={r.stock <= 0 ? 'font-bold text-red-500' : 'font-bold text-amber-600'}>{formatNumber(r.stock)}</span> },
];

export function ProductReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('last7');
  const { data, loading, error, reload } = useReportData<ProductsReportData>(getReportProducts, range, key);

  if (loading || (!data && !error)) {
    return (
      <div className="space-y-6">
        <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading exportDisabled />
        <ReportGridSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} />
        <ReportCard>
          <EmptyState icon={AlertTriangle} title="Unable to load products report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('products-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, productColumns, data.performance);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, productColumns, data.performance);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Product Performance', productColumns, data.performance),
      buildPrintBlock('Low Stock Products', stockColumns, data.lowStockProducts),
      buildPrintBlock('Out of Stock Products', stockColumns, data.outOfStockProducts),
    ];
    openPrintable('Products Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.performance.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Products" value={formatNumber(k.totalProducts)} icon={<Package className="h-5 w-5" />} accent="slate" />
        <StatCard label="Products Sold" value={formatNumber(k.productsSold)} icon={<ShoppingCart className="h-5 w-5" />} accent="blue" />
        <StatCard label="Units Sold" value={formatNumber(k.totalUnitsSold)} icon={<Layers className="h-5 w-5" />} accent="green" />
        <StatCard label="Revenue" value={formatCurrency(k.totalRevenue)} icon={<TrendingUp className="h-5 w-5" />} accent="green" />
        <StatCard label="Profit" value={formatCurrency(k.totalProfit)} icon={<Wallet className="h-5 w-5" />} accent="violet" />
        <StatCard label="Stock Units" value={formatNumber(k.totalStockUnits)} icon={<Boxes className="h-5 w-5" />} accent="slate" />
        <StatCard label="Stock Value" value={formatCurrency(k.stockValue)} icon={<Wallet className="h-5 w-5" />} accent="amber" />
        <StatCard label="In Stock" value={formatNumber(k.inStockCount)} icon={<PackageCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Low Stock" value={formatNumber(k.lowStockCount)} icon={<AlertTriangle className="h-5 w-5" />} accent="amber" />
        <StatCard label="Out of Stock" value={formatNumber(k.outOfStockCount)} icon={<PackageX className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Top Products by Revenue" subtitle="Best performers in this period">
          {data.performance.length === 0 ? (
            <EmptyState title="No sales data" message="No products were sold within this period." />
          ) : (
            <BarTrendChart
              data={data.performance.slice(0, 10).map((p) => ({ label: p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name, revenue: p.revenue }))}
              xKey="label"
              series={[{ key: 'revenue', label: 'Revenue', color: '#1a4731' }]}
              format="currency"
            />
          )}
        </ReportCard>

        <ReportCard title="Most Popular" subtitle="Ranked by popularity signal & units sold">
          {data.mostPopular.length === 0 ? (
            <EmptyState title="No popularity data" />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={productColumns} rows={data.mostPopular} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>
      </div>

      <ReportCard title="Product Performance" subtitle="Revenue, profit and margin across all products">
        {data.performance.length === 0 ? (
          <EmptyState title="No product sales" />
        ) : (
          <ReportTable<ProductPerformanceRow> columns={productColumns} rows={data.performance} rowKey={(r) => r.productId} pageSize={10} searchText={search} searchKeys={(r) => `${r.name} ${r.sku} ${r.category}`} />
        )}
      </ReportCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Best Selling" subtitle="Top by units sold">
          {data.bestSelling.length === 0 ? (
            <EmptyState title="No sales" />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={productColumns} rows={data.bestSelling} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>

        <ReportCard title="Worst Selling" subtitle="Bottom by units sold">
          {data.worstSelling.length === 0 ? (
            <EmptyState title="No products" />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={productColumns} rows={data.worstSelling} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Low Stock" subtitle="Products at or below minimum stock level">
          {data.lowStockProducts.length === 0 ? (
            <EmptyState title="All good" message="No products are below their minimum stock level." />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={stockColumns} rows={data.lowStockProducts} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>

        <ReportCard title="Recently Added" subtitle="Latest products in the catalog">
          {data.recentlyAdded.length === 0 ? (
            <EmptyState title="No products" />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={stockColumns} rows={data.recentlyAdded} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>
      </div>
    </div>
  );
}
