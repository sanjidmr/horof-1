'use client';

import { Boxes, Layers, PackageCheck, AlertTriangle, PackageX, RotateCcw, Wallet, Package, AlertCircle } from 'lucide-react';
import { getReportInventory } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { BarTrendChart, ComposedTrendChart, ChartLegend } from '@/components/admin/reports/LazyCharts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatDateTime, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { InventoryReportData, ProductPerformanceRow, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

const movementColumns: ReportColumn<any>[] = [
  { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
  { key: 'productName', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.productName}</span> },
  { key: 'movementType', label: 'Type', render: (r) => titleCase(r.movementType) },
  { key: 'quantityChange', label: 'Change', align: 'right', render: (r) => <span className={r.quantityChange >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>{r.quantityChange >= 0 ? '+' : ''}{formatNumber(r.quantityChange)}</span> },
  { key: 'stockAfter', label: 'Stock After', align: 'right' },
  { key: 'referenceType', label: 'Reference', render: (r) => titleCase(r.referenceType) || 'â€”' },
];

const warehouseColumns: ReportColumn<any>[] = [
  { key: 'name', label: 'Warehouse', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
  { key: 'isActive', label: 'Status', render: (r) => <span className={r.isActive ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600' : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500'}>{r.isActive ? 'Active' : 'Inactive'}</span> },
  { key: 'movementsIn', label: 'Stock In', align: 'right' },
  { key: 'movementsOut', label: 'Stock Out', align: 'right' },
  { key: 'netUnits', label: 'Net Units', align: 'right', render: (r) => <span className={r.netUnits >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>{r.netUnits >= 0 ? '+' : ''}{formatNumber(r.netUnits)}</span> },
];

const stockColumns: ReportColumn<ProductPerformanceRow>[] = [
  { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
  { key: 'sku', label: 'SKU' },
  { key: 'stock', label: 'Stock', align: 'right', render: (r) => <span className={r.stock <= 0 ? 'font-bold text-red-500' : 'font-bold text-amber-600'}>{formatNumber(r.stock)}</span> },
];

export function InventoryReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<InventoryReportData>(getReportInventory, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load inventory report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('inventory-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, movementColumns, data.movements);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, movementColumns, data.movements);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Stock Movements', movementColumns, data.movements),
      buildPrintBlock('Warehouse Summary', warehouseColumns, data.byWarehouse),
      buildPrintBlock('Low Stock Products', stockColumns, data.lowStock),
      buildPrintBlock('Out of Stock Products', stockColumns, data.outOfStock),
    ];
    openPrintable('Inventory Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.movements.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Products" value={formatNumber(k.totalProducts)} icon={<Package className="h-5 w-5" />} accent="slate" />
        <StatCard label="Stock Units" value={formatNumber(k.totalStockUnits)} icon={<Boxes className="h-5 w-5" />} accent="blue" />
        <StatCard label="Stock Value" value={formatCurrency(k.totalStockValue)} icon={<Wallet className="h-5 w-5" />} accent="green" />
        <StatCard label="Avg Stock/Product" value={formatNumber(k.avgStockPerProduct)} icon={<Layers className="h-5 w-5" />} accent="violet" />
        <StatCard label="COGS" value={formatCurrency(k.cogs)} icon={<RotateCcw className="h-5 w-5" />} accent="amber" />
        <StatCard label="Turnover Ratio" value={k.turnoverRatio.toFixed(2)} icon={<RotateCcw className="h-5 w-5" />} accent="blue" sub="COGS / stock value" />
        <StatCard label="In Stock" value={formatNumber(k.inStockCount)} icon={<PackageCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Low Stock" value={formatNumber(k.lowStockCount)} icon={<AlertCircle className="h-5 w-5" />} accent="amber" />
        <StatCard label="Out of Stock" value={formatNumber(k.outOfStockCount)} icon={<PackageX className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Stock Movement Trend" subtitle="Units in vs units out">
          {data.stockInOut.length === 0 ? (
            <EmptyState title="No movements" message="Stock movements within this period will appear here." />
          ) : (
            <>
              <ComposedTrendChart
                data={data.stockInOut}
                xKey="label"
                series={[
                  { key: 'stockIn', label: 'Stock In', color: '#10b981', kind: 'bar' },
                  { key: 'stockOut', label: 'Stock Out', color: '#ef4444', kind: 'bar' },
                ]}
              />
              <ChartLegend
                items={[
                  { label: 'Stock In', color: '#10b981' },
                  { label: 'Stock Out', color: '#ef4444' },
                ]}
              />
            </>
          )}
        </ReportCard>

        <ReportCard title="Warehouse Summary" subtitle="Movement totals per warehouse">
          {data.byWarehouse.length === 0 ? (
            <EmptyState title="No warehouses" />
          ) : (
            <ReportTable<any> columns={warehouseColumns} rows={data.byWarehouse} rowKey={(r) => r.id} pageSize={8} searchText={search} searchKeys={(r) => r.name} />
          )}
        </ReportCard>
      </div>

      <ReportCard title="Stock Movements" subtitle="Detailed movement history">
        {data.movements.length === 0 ? (
          <EmptyState title="No movements recorded" />
        ) : (
          <ReportTable<any> columns={movementColumns} rows={data.movements} rowKey={(r) => r.id} pageSize={10} searchText={search} searchKeys={(r) => `${r.productName} ${r.movementType} ${r.referenceType}`} />
        )}
      </ReportCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Low Stock" subtitle="At or below minimum stock level">
          {data.lowStock.length === 0 ? (
            <EmptyState title="All good" message="No products below minimum stock level." />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={stockColumns} rows={data.lowStock} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>

        <ReportCard title="Out of Stock" subtitle="Products with zero stock">
          {data.outOfStock.length === 0 ? (
            <EmptyState title="No out-of-stock products" />
          ) : (
            <ReportTable<ProductPerformanceRow> columns={stockColumns} rows={data.outOfStock} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>
      </div>
    </div>
  );
}
