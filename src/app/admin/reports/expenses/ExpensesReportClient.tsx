'use client';

import { ReceiptText, CalendarClock, Trophy, AlertTriangle, Wallet } from 'lucide-react';
import { getReportExpenses } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { AreaTrendChart, BarTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/LazyCharts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatMonthKey, formatDateTime, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { ExpensesReportData, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

export function ExpensesReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<ExpensesReportData>(getReportExpenses, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load expenses report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;

  const categoryColumns: ReportColumn<any>[] = [
    { key: 'category', label: 'Category' },
    { key: 'count', label: 'Entries', align: 'right' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
    { key: 'percentage', label: 'Share', align: 'right', render: (r) => `${r.percentage.toFixed(1)}%` },
  ];
  const recentColumns: ReportColumn<any>[] = [
    { key: 'expenseDate', label: 'Date' },
    { key: 'category', label: 'Category' },
    { key: 'notes', label: 'Notes', render: (r) => r.notes || r.description || 'â€”' },
    { key: 'paymentMethod', label: 'Paid Via', render: (r) => titleCase(r.paymentMethod) },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="font-bold text-red-500">âˆ’{formatCurrency(r.amount)}</span> },
  ];
  const trendColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Date' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
  ];
  const monthlyColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Month', render: (r) => formatMonthKey(r.month) },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('expenses-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, recentColumns, data.recent);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, recentColumns, data.recent);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Expenses by Category', categoryColumns, data.byCategory),
      buildPrintBlock('Expense Entries', recentColumns, data.recent),
      buildPrintBlock('Monthly Expense Trend', monthlyColumns, data.monthlyTrend),
    ];
    openPrintable('Expenses Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.recent.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Expenses" value={formatCurrency(k.totalExpenses)} icon={<Wallet className="h-5 w-5" />} accent="red" />
        <StatCard label="Expense Entries" value={formatNumber(k.expenseCount)} icon={<ReceiptText className="h-5 w-5" />} accent="slate" />
        <StatCard label="Daily Average" value={formatCurrency(k.dailyAverage)} icon={<CalendarClock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Top Category" value={k.topCategory ? titleCase(k.topCategory) : 'â€”'} icon={<Trophy className="h-5 w-5" />} accent="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Expense Trend" subtitle="Daily expense totals">
          {data.trend.length === 0 ? (
            <EmptyState title="No expenses recorded" message="Expenses within this period will appear here." />
          ) : (
            <>
              <AreaTrendChart data={data.trend} xKey="label" series={[{ key: 'total', label: 'Expenses', color: '#ef4444' }]} format="currency" />
              <ChartLegend items={[{ label: 'Daily expenses', color: '#ef4444' }]} />
            </>
          )}
        </ReportCard>

        <ReportCard title="Expenses by Category" subtitle="Where spending is concentrated">
          {data.byCategory.length === 0 ? (
            <EmptyState title="No categories" />
          ) : (
            <>
              <DonutChart
                data={data.byCategory.map((c) => ({ name: titleCase(c.category), value: c.total }))}
                nameKey="name"
                valueKey="value"
                format="currency"
                centerLabel="Total"
              />
              <ChartLegend items={data.byCategory.slice(0, 5).map((c) => ({ label: titleCase(c.category), color: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'][data.byCategory.indexOf(c) % 5] }))} />
            </>
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Monthly Expense Trend" subtitle="Total per month">
          {data.monthlyTrend.length === 0 ? (
            <EmptyState title="No monthly data" />
          ) : (
            <BarTrendChart
              data={data.monthlyTrend.map((m) => ({ ...m, label: formatMonthKey(m.month) }))}
              xKey="label"
              series={[{ key: 'total', label: 'Expenses', color: '#ef4444' }]}
              format="currency"
            />
          )}
        </ReportCard>

        <ReportCard title="Expense Entries" subtitle="Recent recorded expenses">
          {data.recent.length === 0 ? (
            <EmptyState title="No expense entries" />
          ) : (
            <ReportTable<any> columns={recentColumns} rows={data.recent} rowKey={(r) => r.id} pageSize={8} searchText={search} searchKeys={(r) => `${r.category} ${r.notes || ''} ${r.description || ''}`} />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Category Breakdown" subtitle="Expense totals by category">
          <ReportTable<any> columns={categoryColumns} rows={data.byCategory} rowKey={(r) => r.category} pageSize={10} searchText={search} searchKeys={(r) => r.category} />
        </ReportCard>

        <ReportCard title="Monthly Detail" subtitle="Monthly expense totals">
          <ReportTable<any> columns={monthlyColumns} rows={data.monthlyTrend} rowKey={(r) => r.month} pageSize={12} searchText={search} searchKeys={(r) => formatMonthKey(r.month)} />
        </ReportCard>
      </div>
    </div>
  );
}
