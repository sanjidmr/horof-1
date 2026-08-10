'use client';

import { ShoppingCart, Banknote, Clock, CheckCircle2, Package, PackageCheck, Truck, Undo2, XCircle, AlertTriangle } from 'lucide-react';
import { getReportOrders } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { BarTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/LazyCharts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, formatDateTime, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { OrdersReportData, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-blue-50 text-blue-600',
  processing: 'bg-sky-50 text-sky-600',
  packed: 'bg-violet-50 text-violet-600',
  shipped: 'bg-indigo-50 text-indigo-600',
  in_transit: 'bg-indigo-50 text-indigo-600',
  out_for_delivery: 'bg-cyan-50 text-cyan-600',
  delivered: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-600',
  returned: 'bg-orange-50 text-orange-600',
  refunded: 'bg-rose-50 text-rose-600',
};

export function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  const cls = statusColors[s] ?? 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{titleCase(s)}</span>;
}

export function OrdersReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('last7');
  const { data, loading, error, reload } = useReportData<OrdersReportData>(getReportOrders, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load orders report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;

  const statusColumns: ReportColumn<any>[] = [
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total Value', align: 'right', render: (r) => formatCurrency(r.total) },
  ];
  const methodColumns: ReportColumn<any>[] = [
    { key: 'method', label: 'Payment Method', render: (r) => titleCase(r.method) },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total Value', align: 'right', render: (r) => formatCurrency(r.total) },
  ];
  const recentColumns: ReportColumn<any>[] = [
    { key: 'orderNumber', label: 'Order #', render: (r) => <span className="font-bold text-slate-700">{r.orderNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.total)}</span> },
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'paymentStatus', label: 'Payment', render: (r) => <span className={r.paymentStatus === 'paid' ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600' : 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600'}>{titleCase(r.paymentStatus)}</span> },
  ];
  const volumeColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Date' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('orders-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, recentColumns, data.recentOrders);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, recentColumns, data.recentOrders);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Orders by Status', statusColumns, data.byStatus),
      buildPrintBlock('Orders by Payment Method', methodColumns, data.byPaymentMethod),
      buildPrintBlock('Recent Orders', recentColumns, data.recentOrders),
    ];
    openPrintable('Orders Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.recentOrders.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Orders" value={formatNumber(k.totalOrders)} icon={<ShoppingCart className="h-5 w-5" />} accent="slate" />
        <StatCard label="Total Revenue" value={formatCurrency(k.totalRevenue)} icon={<Banknote className="h-5 w-5" />} accent="green" />
        <StatCard label="Pending" value={formatNumber(k.pending)} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Confirmed" value={formatNumber(k.confirmed)} icon={<CheckCircle2 className="h-5 w-5" />} accent="blue" />
        <StatCard label="Processing" value={formatNumber(k.processing)} icon={<Package className="h-5 w-5" />} accent="blue" />
        <StatCard label="Packed" value={formatNumber(k.packed)} icon={<PackageCheck className="h-5 w-5" />} accent="violet" />
        <StatCard label="Shipped" value={formatNumber(k.shipped)} icon={<Truck className="h-5 w-5" />} accent="blue" />
        <StatCard label="Delivered" value={formatNumber(k.delivered)} icon={<PackageCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Returned" value={formatNumber(k.returned)} icon={<Undo2 className="h-5 w-5" />} accent="violet" />
        <StatCard label="Cancelled" value={formatNumber(k.cancelled)} icon={<XCircle className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Order Volume" subtitle="Daily orders & revenue">
          {data.dailyVolume.length === 0 ? (
            <EmptyState title="No orders" message="No orders placed within this period." />
          ) : (
            <BarTrendChart
              data={data.dailyVolume}
              xKey="label"
              series={[
                { key: 'orders', label: 'Orders', color: '#3b82f6', format: 'number' },
                { key: 'revenue', label: 'Revenue', color: '#1a4731' },
              ]}
              format="number"
            />
          )}
        </ReportCard>

        <ReportCard title="Orders by Status" subtitle="Distribution across statuses">
          {data.byStatus.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <>
              <DonutChart
                data={data.byStatus.map((s) => ({ name: titleCase(s.status), value: s.count }))}
                nameKey="name"
                valueKey="value"
                format="number"
                centerLabel="Orders"
              />
              <ChartLegend items={data.byStatus.slice(0, 6).map((s) => ({ label: titleCase(s.status), color: ['#1a4731', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'][data.byStatus.indexOf(s) % 6] }))} />
            </>
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Order Status Detail" subtitle="Count & value per status">
          <ReportTable<any> columns={statusColumns} rows={data.byStatus} rowKey={(r) => r.status} pageSize={8} searchText={search} searchKeys={(r) => r.status} />
        </ReportCard>

        <ReportCard title="Payment Methods" subtitle="Orders grouped by payment method">
          {data.byPaymentMethod.length === 0 ? (
            <EmptyState title="No orders" />
          ) : (
            <ReportTable<any> columns={methodColumns} rows={data.byPaymentMethod} rowKey={(r) => r.method} pageSize={8} searchText={search} searchKeys={(r) => r.method} />
          )}
        </ReportCard>
      </div>

      <ReportCard title="Recent Orders" subtitle="Latest 100 orders in this period">
        {data.recentOrders.length === 0 ? (
          <EmptyState title="No orders" />
        ) : (
          <ReportTable<any> columns={recentColumns} rows={data.recentOrders} rowKey={(r) => r.id} pageSize={10} searchText={search} searchKeys={(r) => `${r.orderNumber} ${r.customerName}`} />
        )}
      </ReportCard>
    </div>
  );
}
