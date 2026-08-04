'use client';

import { Banknote, TrendingUp, Truck, Tag, Undo2, ReceiptText, Scale, AlertTriangle, Boxes } from 'lucide-react';
import { getReportProfitLoss } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { BarTrendChart, ComposedTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/charts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatMonthKey, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { ProfitLossData, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

export function ProfitLossClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<ProfitLossData>(getReportProfitLoss, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load P&L report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const s = data.summary;
  const netUp = s.netProfit >= 0;

  const linesColumns: ReportColumn<any>[] = [
    { key: 'category', label: 'Category', render: (r) => titleCase(r.category) },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className={r.kind === 'revenue' ? 'font-bold text-emerald-600' : r.kind === 'profit' ? 'font-bold text-slate-900' : 'text-red-500'}>{r.kind === 'expense' ? '−' : '+'}{formatCurrency(r.amount)}</span> },
  ];
  const productColumns: ReportColumn<any>[] = [
    { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
    { key: 'sku', label: 'SKU' },
    { key: 'unitsSold', label: 'Units', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
    { key: 'cost', label: 'Cost', align: 'right', render: (r) => formatCurrency(r.cost) },
    { key: 'profit', label: 'Profit', align: 'right', render: (r) => <span className={r.profit >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>{formatCurrency(r.profit)}</span> },
    { key: 'margin', label: 'Margin', align: 'right', render: (r) => `${r.margin.toFixed(1)}%` },
  ];
  const monthlyColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Month', render: (r) => formatMonthKey(r.month) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
    { key: 'cost', label: 'Cost', align: 'right', render: (r) => formatCurrency(r.cost) },
    { key: 'expenses', label: 'Expenses', align: 'right', render: (r) => formatCurrency(r.expenses) },
    { key: 'profit', label: 'Profit', align: 'right', render: (r) => <span className={r.profit >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-red-500'}>{formatCurrency(r.profit)}</span> },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('profit-loss', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, productColumns, data.byProduct);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, productColumns, data.byProduct);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('P&L Summary', linesColumns, data.lines),
      buildPrintBlock('Product Profitability', productColumns, data.byProduct),
      buildPrintBlock('Monthly Profit', monthlyColumns, data.monthlyProfit),
    ];
    openPrintable('Profit & Loss Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.byProduct.length === 0 && data.lines.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Gross Revenue" value={formatCurrency(s.grossRevenue)} icon={<Banknote className="h-5 w-5" />} accent="green" />
        <StatCard label="Product Cost" value={formatCurrency(s.productCost)} icon={<Boxes className="h-5 w-5" />} accent="slate" />
        <StatCard label="Gross Profit" value={formatCurrency(s.grossProfit)} icon={<TrendingUp className="h-5 w-5" />} accent="green" sub={`Margin ${s.grossMarginPct.toFixed(1)}%`} />
        <StatCard label="Shipping Cost" value={formatCurrency(s.shippingCost)} icon={<Truck className="h-5 w-5" />} accent="blue" sub={`Courier ${formatCurrency(s.courierCost)}`} />
        <StatCard label="Discounts" value={formatCurrency(s.discounts)} icon={<Tag className="h-5 w-5" />} accent="amber" />
        <StatCard label="Refunds" value={formatCurrency(s.refunds)} icon={<Undo2 className="h-5 w-5" />} accent="violet" />
        <StatCard label="Operating Expenses" value={formatCurrency(s.expenses)} icon={<ReceiptText className="h-5 w-5" />} accent="red" />
        <StatCard label="Net Profit" value={formatCurrency(s.netProfit)} icon={<Scale className="h-5 w-5" />} accent={netUp ? 'green' : 'red'} trend={{ value: `Margin ${s.netMarginPct.toFixed(1)}%`, up: netUp }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Daily Profit Trend" subtitle="Revenue, cost & profit day-by-day">
          {data.dailyProfit.length === 0 ? (
            <EmptyState title="No profit data" message="Orders and expenses within this period will appear here." />
          ) : (
            <ComposedTrendChart
              data={data.dailyProfit}
              xKey="label"
              series={[
                { key: 'revenue', label: 'Revenue', color: '#1a4731', kind: 'bar' },
                { key: 'profit', label: 'Profit', color: '#10b981', kind: 'line' },
              ]}
            />
          )}
        </ReportCard>

        <ReportCard title="Revenue vs Profit" subtitle="Monthly comparison">
          {data.monthlyProfit.length === 0 ? (
            <EmptyState title="No monthly data" />
          ) : (
            <BarTrendChart
              data={data.monthlyProfit.map((m) => ({ ...m, label: formatMonthKey(m.month) }))}
              xKey="label"
              series={[
                { key: 'revenue', label: 'Revenue', color: '#1a4731' },
                { key: 'profit', label: 'Profit', color: '#10b981' },
              ]}
            />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="P&L Composition" subtitle="Where money comes in and goes out">
          {data.lines.length === 0 ? (
            <EmptyState title="No lines" />
          ) : (
            <DonutChart
              data={data.lines.map((l) => ({ name: titleCase(l.category), value: l.amount }))}
              nameKey="name"
              valueKey="value"
              format="currency"
              centerLabel="Total"
            />
          )}
        </ReportCard>

        <ReportCard title="Product Profitability" subtitle="Profit and margin per product">
          {data.byProduct.length === 0 ? (
            <EmptyState title="No product sales" />
          ) : (
            <ReportTable<any> columns={productColumns} rows={data.byProduct} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => `${r.name} ${r.sku}`} />
          )}
        </ReportCard>
      </div>

      <ReportCard title="Monthly Profit Summary" subtitle="Month-by-month profit breakdown">
        {data.monthlyProfit.length === 0 ? (
          <EmptyState title="No monthly data" />
        ) : (
          <ReportTable<any> columns={monthlyColumns} rows={data.monthlyProfit} rowKey={(r) => r.month} pageSize={12} searchText={search} searchKeys={(r) => formatMonthKey(r.month)} />
        )}
      </ReportCard>
    </div>
  );
}
