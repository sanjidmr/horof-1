'use client';

import {
  Banknote,
  ShoppingCart,
  TrendingUp,
  PackageOpen,
  CheckCircle2,
  XCircle,
  Clock,
  ReceiptText,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { getReportSales } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { AreaTrendChart, BarTrendChart, ChartLegend } from '@/components/admin/reports/charts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatMonthKey } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { SalesReportData, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

export function SalesReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('last7');
  const { data, loading, error, reload } = useReportData<SalesReportData>(getReportSales, range, key);

  if (loading || (!data && !error)) {
    return (
      <div className="space-y-6">
        <ReportFilters
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          search={search}
          setSearch={setSearch}
          rangeLabel={range.label}
          onRefresh={reload}
          loading
          exportDisabled
        />
        <ReportGridSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <ReportFilters
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          search={search}
          setSearch={setSearch}
          rangeLabel={range.label}
          onRefresh={reload}
        />
        <ReportCard>
          <EmptyState icon={AlertTriangle} title="Unable to load sales report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;
  const growth = k.salesGrowthPct;
  const growthTrend = { value: `${Math.abs(growth)}% vs previous period`, up: growth >= 0 };

  const statusColumns: ReportColumn<any>[] = [
    { key: 'status', label: 'Order Status' },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total Value', align: 'right', render: (r) => formatCurrency(r.total) },
  ];
  const paymentColumns: ReportColumn<any>[] = [
    { key: 'status', label: 'Payment Status' },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total Value', align: 'right', render: (r) => formatCurrency(r.total) },
  ];

  const dailyColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Date' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
    { key: 'itemsSold', label: 'Items Sold', align: 'right', render: (r) => formatNumber(r.itemsSold ?? 0) },
  ];
  const monthlyColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Month', render: (r) => formatMonthKey(r.label) },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('sales-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, dailyColumns, data.dailyTrend);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, dailyColumns, data.dailyTrend);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Daily Sales Trend', dailyColumns, data.dailyTrend),
      buildPrintBlock('Order Status Breakdown', statusColumns, data.statusBreakdown),
      buildPrintBlock('Payment Status Breakdown', paymentColumns, data.paymentBreakdown),
      buildPrintBlock('Monthly Sales', monthlyColumns, data.monthlyTrend),
    ];
    openPrintable(
      'Sales Report',
      `Period: ${range.label}`,
      blocks
    );
  };

  return (
    <div className="space-y-6">
      <ReportFilters
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        search={search}
        setSearch={setSearch}
        rangeLabel={range.label}
        onRefresh={reload}
        loading={loading}
        onExport={handleExport}
        exportDisabled={data.dailyTrend.length === 0}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Gross Revenue" value={formatCurrency(k.grossRevenue)} icon={<Banknote className="h-5 w-5" />} accent="green" trend={growthTrend} />
        <StatCard label="Net Revenue" value={formatCurrency(k.netRevenue)} icon={<ReceiptText className="h-5 w-5" />} accent="blue" sub={`Refunds: ${formatCurrency(k.refunds)}`} />
        <StatCard label="Total Orders" value={formatNumber(k.totalOrders)} icon={<ShoppingCart className="h-5 w-5" />} accent="violet" />
        <StatCard label="Avg Order Value" value={formatCurrency(k.avgOrderValue)} icon={<TrendingUp className="h-5 w-5" />} accent="amber" />
        <StatCard label="Items Sold" value={formatNumber(k.itemsSold)} icon={<PackageOpen className="h-5 w-5" />} accent="slate" />
        <StatCard label="Successful Orders" value={formatNumber(k.successfulOrders)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" sub={`${formatNumber(k.deliveredOrders)} delivered`} />
        <StatCard label="Pending Orders" value={formatNumber(k.pendingOrders)} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Processing" value={formatNumber(k.processingOrders)} icon={<PackageOpen className="h-5 w-5" />} accent="blue" />
        <StatCard label="Delivered" value={formatNumber(k.deliveredOrders)} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
        <StatCard label="Returned" value={formatNumber(k.returnedOrders)} icon={<Undo2 className="h-5 w-5" />} accent="violet" />
        <StatCard label="Cancelled" value={formatNumber(k.cancelledOrders)} icon={<XCircle className="h-5 w-5" />} accent="red" />
        <StatCard label="Sales Growth" value={`${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5" />} accent={growth >= 0 ? 'green' : 'red'} sub="vs previous period" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Sales Trend" subtitle={`Daily revenue & orders for ${range.label}`}>
          {data.dailyTrend.length === 0 ? (
            <EmptyState title="No sales in this period" message="Orders placed during this date range will appear here." />
          ) : (
            <>
              <AreaTrendChart
                data={data.dailyTrend}
                xKey="label"
                series={[
                  { key: 'revenue', label: 'Revenue', color: '#1a4731', kind: 'area', format: 'currency' },
                  { key: 'orders', label: 'Orders', color: '#10b981', kind: 'area', format: 'number' },
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

        <ReportCard title="Hourly Sales" subtitle="Sales by hour of day">
          {data.hourlySales.every((h) => h.orders === 0) ? (
            <EmptyState title="No hourly data" message="No orders recorded within this period." />
          ) : (
            <>
              <BarTrendChart
                data={data.hourlySales}
                xKey="label"
                series={[{ key: 'revenue', label: 'Revenue', color: '#1a4731' }]}
                format="currency"
              />
              <ChartLegend items={[{ label: 'Revenue by hour', color: '#1a4731' }]} />
            </>
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Monthly Sales Trend" subtitle="Revenue per month">
          {data.monthlyTrend.length === 0 ? (
            <EmptyState title="No monthly data" />
          ) : (
            <BarTrendChart
              data={data.monthlyTrend.map((m) => ({ ...m, label: formatMonthKey(m.label) }))}
              xKey="label"
              series={[{ key: 'revenue', label: 'Revenue', color: '#f59e0b' }]}
              format="currency"
            />
          )}
        </ReportCard>

        <ReportCard title="Weekly Comparison" subtitle="Last 8 weeks revenue & orders">
          <BarTrendChart
            data={data.weeklyComparison}
            xKey="label"
            series={[
              { key: 'revenue', label: 'Revenue', color: '#1a4731' },
              { key: 'orders', label: 'Orders', color: '#3b82f6' },
            ]}
            format="currency"
          />
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Order Status Breakdown" subtitle="Orders by fulfillment status">
          {data.statusBreakdown.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <ReportTable<any> columns={statusColumns} rows={data.statusBreakdown} rowKey={(r) => r.status} pageSize={8} searchText={search} searchKeys={(r) => r.status} />
          )}
        </ReportCard>

        <ReportCard title="Payment Status Breakdown" subtitle="Orders by payment status">
          {data.paymentBreakdown.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <ReportTable<any> columns={paymentColumns} rows={data.paymentBreakdown} rowKey={(r) => r.status} pageSize={8} searchText={search} searchKeys={(r) => r.status} />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Daily Sales Detail" subtitle="Day-by-day revenue breakdown">
          <ReportTable<any> columns={dailyColumns} rows={data.dailyTrend} rowKey={(r) => r.label} pageSize={10} searchText={search} searchKeys={(r) => r.label} />
        </ReportCard>

        <ReportCard title="Monthly Sales Detail" subtitle="Month-by-month revenue breakdown">
          <ReportTable<any> columns={monthlyColumns} rows={data.monthlyTrend} rowKey={(r) => r.label} pageSize={12} searchText={search} searchKeys={(r) => formatMonthKey(r.label)} />
        </ReportCard>
      </div>
    </div>
  );
}
