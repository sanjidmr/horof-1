'use client';

import { Banknote, ShoppingCart, TrendingUp, ReceiptText, Users, AlertTriangle, Scale } from 'lucide-react';
import { getReportDashboard } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { AreaTrendChart, BarTrendChart, ComposedTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/charts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatPercent, formatMonthKey, titleCase } from '@/lib/reports/format';
import { openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import { statusBadge } from '../orders/OrdersReportClient';
import type { DashboardReportData, StatusCount, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

export function AnalyticsDashboardClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<DashboardReportData>(getReportDashboard, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load dashboard" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const s = data.sales;
  const growthTrend = { value: `${Math.abs(s.salesGrowthPct)}% vs prev period`, up: s.salesGrowthPct >= 0 };
  const netUp = data.profit.netProfit >= 0;

  const statusColumns: ReportColumn<StatusCount>[] = [
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total Value', align: 'right', render: (r) => formatCurrency(r.total) },
  ];
  const productColumns: ReportColumn<any>[] = [
    { key: 'name', label: 'Product', render: (r) => <span className="font-semibold text-slate-700">{r.name}</span> },
    { key: 'quantity', label: 'Units', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.revenue)}</span> },
    { key: 'margin', label: 'Margin', align: 'right', render: (r) => formatPercent(r.margin) },
  ];
  const growthColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Month' },
    { key: 'newCustomers', label: 'New', align: 'right' },
    { key: 'cumulative', label: 'Cumulative', align: 'right' },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('dashboard', range.label);
    if (fmt === 'csv' || fmt === 'excel') return;
    const blocks: PrintBlock[] = [
      buildPrintBlock('Orders by Status', statusColumns, data.ordersByStatus),
      buildPrintBlock('Best Selling Products', productColumns, data.bestSellingProducts),
      buildPrintBlock('Customer Growth', growthColumns, data.customerGrowth),
    ];
    openPrintable('Reports Dashboard', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.ordersByStatus.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Gross Revenue" value={formatCurrency(s.grossRevenue)} icon={<Banknote className="h-5 w-5" />} accent="green" trend={growthTrend} />
        <StatCard label="Net Profit" value={formatCurrency(data.profit.netProfit)} icon={<Scale className="h-5 w-5" />} accent={netUp ? 'green' : 'red'} sub={`Margin ${formatPercent(data.profit.netMarginPct)}`} />
        <StatCard label="Gross Profit" value={formatCurrency(data.profit.grossProfit)} icon={<TrendingUp className="h-5 w-5" />} accent="blue" sub={`Margin ${formatPercent(data.profit.grossMarginPct)}`} />
        <StatCard label="Orders" value={formatNumber(s.totalOrders)} icon={<ShoppingCart className="h-5 w-5" />} accent="violet" sub={`${formatNumber(s.itemsSold)} items sold`} />
        <StatCard label="Expenses" value={formatCurrency(data.expenses)} icon={<ReceiptText className="h-5 w-5" />} accent="amber" />
        <StatCard label="Customers" value={formatNumber(data.customers.totalCustomers)} icon={<Users className="h-5 w-5" />} accent="slate" sub={`${formatNumber(data.customers.newCustomers)} new`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Sales Trend" subtitle="Daily revenue & orders">
          {data.salesTrend.length === 0 ? (
            <EmptyState title="No sales" message="Orders placed within this period will appear here." />
          ) : (
            <>
              <AreaTrendChart
                data={data.salesTrend}
                xKey="label"
                series={[
                  { key: 'revenue', label: 'Revenue', color: '#1a4731', format: 'currency' },
                  { key: 'orders', label: 'Orders', color: '#10b981', format: 'number' },
                ]}
                format="currency"
              />
              <ChartLegend
                items={[
                  { label: 'Revenue', color: '#1a4731' },
                  { label: 'Orders', color: '#10b981' },
                ]}
              />
            </>
          )}
        </ReportCard>

        <ReportCard title="Profit vs Expenses" subtitle="Daily net result">
          {data.profitTrend.length === 0 ? (
            <EmptyState title="No profit data" />
          ) : (
            <ComposedTrendChart
              data={data.profitTrend}
              xKey="label"
              series={[
                { key: 'revenue', label: 'Revenue', color: '#1a4731', kind: 'bar' },
                { key: 'profit', label: 'Profit', color: '#10b981', kind: 'line' },
                { key: 'expenses', label: 'Expenses', color: '#ef4444', kind: 'line' },
              ]}
            />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Orders by Status" subtitle="Current order pipeline">
          {data.ordersByStatus.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <DonutChart
              data={data.ordersByStatus.map((o) => ({ name: titleCase(o.status), value: o.count }))}
              nameKey="name"
              valueKey="value"
              format="number"
              centerLabel="Orders"
            />
          )}
        </ReportCard>

        <ReportCard title="Customer Growth" subtitle="New customers over time">
          {data.customerGrowth.length === 0 ? (
            <EmptyState title="No customer data" />
          ) : (
            <>
              <AreaTrendChart
                data={data.customerGrowth}
                xKey="label"
                series={[
                  { key: 'newCustomers', label: 'New Customers', color: '#10b981', format: 'number' },
                  { key: 'cumulative', label: 'Cumulative', color: '#8b5cf6', format: 'number' },
                ]}
                format="number"
              />
              <ChartLegend
                items={[
                  { label: 'New Customers', color: '#10b981' },
                  { label: 'Cumulative', color: '#8b5cf6' },
                ]}
              />
            </>
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Monthly Comparison" subtitle="Revenue by month">
          {data.monthlyComparison.length === 0 ? (
            <EmptyState title="No monthly data" />
          ) : (
            <BarTrendChart
              data={data.monthlyComparison.map((m) => ({ ...m, label: formatMonthKey(m.label) }))}
              xKey="label"
              series={[{ key: 'revenue', label: 'Revenue', color: '#f59e0b' }]}
              format="currency"
            />
          )}
        </ReportCard>

        <ReportCard title="Weekly Comparison" subtitle="Last 8 weeks revenue & orders">
          {data.weeklyComparison.length === 0 ? (
            <EmptyState title="No weekly data" />
          ) : (
            <BarTrendChart
              data={data.weeklyComparison}
              xKey="label"
              series={[
                { key: 'revenue', label: 'Revenue', color: '#1a4731' },
                { key: 'orders', label: 'Orders', color: '#3b82f6' },
              ]}
              format="currency"
            />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Best Selling Products" subtitle="Top products by revenue">
          {data.bestSellingProducts.length === 0 ? (
            <EmptyState title="No product sales" />
          ) : (
            <ReportTable<any> columns={productColumns} rows={data.bestSellingProducts} rowKey={(r) => r.productId} pageSize={8} searchText={search} searchKeys={(r) => r.name} />
          )}
        </ReportCard>

        <div className="space-y-6">
          <ReportCard title="Orders by Status Detail" subtitle="Count & value per status">
            <ReportTable<StatusCount> columns={statusColumns} rows={data.ordersByStatus} rowKey={(r) => r.status} pageSize={6} searchText={search} searchKeys={(r) => r.status} />
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
