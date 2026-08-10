'use client';

import { Users, UserPlus, RefreshCcw, Activity, Wallet, Gem, AlertTriangle, ShoppingCart } from 'lucide-react';
import { getReportCustomers } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { AreaTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/LazyCharts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatDate } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { CustomersReportData, CustomerRow, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

const customerColumns: ReportColumn<CustomerRow>[] = [
  { key: 'name', label: 'Customer', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
  { key: 'email', label: 'Email', render: (r) => r.email || 'â€”' },
  { key: 'phone', label: 'Phone', render: (r) => r.phone || 'â€”' },
  { key: 'orders', label: 'Orders', align: 'right' },
  { key: 'totalSpent', label: 'Total Spent', align: 'right', render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.totalSpent)}</span> },
  { key: 'avgOrderValue', label: 'Avg Order', align: 'right', render: (r) => formatCurrency(r.avgOrderValue) },
  { key: 'lastOrderAt', label: 'Last Order', align: 'right', render: (r) => formatDate(r.lastOrderAt) },
];

export function CustomerReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<CustomersReportData>(getReportCustomers, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load customers report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;

  const ltvColumns: ReportColumn<any>[] = [
    { key: 'segment', label: 'Segment' },
    { key: 'customerCount', label: 'Customers', align: 'right' },
    { key: 'avgLtv', label: 'Avg LTV', align: 'right', render: (r) => formatCurrency(r.avgLtv) },
    { key: 'totalRevenue', label: 'Total Revenue', align: 'right', render: (r) => formatCurrency(r.totalRevenue) },
  ];
  const acquisitionColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Month' },
    { key: 'newCustomers', label: 'New Customers', align: 'right' },
    { key: 'cumulative', label: 'Cumulative', align: 'right' },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('customers-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, customerColumns, data.topCustomers);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, customerColumns, data.topCustomers);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Top Customers', customerColumns, data.topCustomers),
      buildPrintBlock('LTV Segments', ltvColumns, data.ltvSegments),
      buildPrintBlock('Customer Acquisition', acquisitionColumns, data.acquisition),
    ];
    openPrintable('Customers Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.topCustomers.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Customers" value={formatNumber(k.totalCustomers)} icon={<Users className="h-5 w-5" />} accent="slate" />
        <StatCard label="New Customers" value={formatNumber(k.newCustomers)} icon={<UserPlus className="h-5 w-5" />} accent="green" sub="in this period" />
        <StatCard label="Returning" value={formatNumber(k.returningCustomers)} icon={<RefreshCcw className="h-5 w-5" />} accent="blue" />
        <StatCard label="Active" value={formatNumber(k.activeCustomers)} icon={<Activity className="h-5 w-5" />} accent="violet" sub="placed orders" />
        <StatCard label="Total Spend" value={formatCurrency(k.totalSpend)} icon={<Wallet className="h-5 w-5" />} accent="green" />
        <StatCard label="Avg Lifetime Value" value={formatCurrency(k.avgLifetimeValue)} icon={<Gem className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Customer Acquisition" subtitle="New customers per month (cumulative)">
          {data.acquisition.length === 0 ? (
            <EmptyState title="No acquisition data" />
          ) : (
            <>
              <AreaTrendChart
                data={data.acquisition}
                xKey="label"
                series={[
                  { key: 'newCustomers', label: 'New Customers', color: '#10b981', format: 'number' },
                  { key: 'cumulative', label: 'Cumulative', color: '#1a4731', format: 'number' },
                ]}
                format="number"
              />
              <ChartLegend
                items={[
                  { label: 'New Customers', color: '#10b981' },
                  { label: 'Cumulative', color: '#1a4731' },
                ]}
              />
            </>
          )}
        </ReportCard>

        <ReportCard title="LTV Segments" subtitle="Customer value distribution">
          {data.ltvSegments.length === 0 ? (
            <EmptyState title="No segments" />
          ) : (
            <DonutChart
              data={data.ltvSegments.map((s) => ({ name: s.segment, value: s.customerCount }))}
              nameKey="name"
              valueKey="value"
              format="number"
              centerLabel="Customers"
            />
          )}
        </ReportCard>
      </div>

      <ReportCard title="Top Customers" subtitle="Highest spenders in this period">
        {data.topCustomers.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No customer orders" message="No customer orders recorded within this period." />
        ) : (
          <ReportTable<CustomerRow> columns={customerColumns} rows={data.topCustomers} rowKey={(r) => r.customerId ?? r.email ?? r.name} pageSize={10} searchText={search} searchKeys={(r) => `${r.name} ${r.email || ''} ${r.phone || ''}`} />
        )}
      </ReportCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Acquisition Detail" subtitle="Monthly new & cumulative customers">
          <ReportTable<any> columns={acquisitionColumns} rows={data.acquisition} rowKey={(r) => r.month} pageSize={12} searchText={search} searchKeys={(r) => r.label} />
        </ReportCard>

        <ReportCard title="LTV Segments Detail" subtitle="Segment performance">
          <ReportTable<any> columns={ltvColumns} rows={data.ltvSegments} rowKey={(r) => r.segment} pageSize={8} searchText={search} searchKeys={(r) => r.segment} />
        </ReportCard>
      </div>
    </div>
  );
}
