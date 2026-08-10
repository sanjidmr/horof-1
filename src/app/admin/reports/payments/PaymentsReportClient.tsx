'use client';

import { HandCoins, PiggyBank, Hourglass, Banknote, TrendingUp, TrendingDown, Scale, AlertTriangle } from 'lucide-react';
import { getReportPayments } from '@/lib/actions/reports';
import { useReportRange } from '@/components/admin/reports/useReportRange';
import { useReportData } from '@/components/admin/reports/useReportData';
import { ReportFilters } from '@/components/admin/reports/ReportFilters';
import { StatCard } from '@/components/admin/reports/StatCard';
import { ReportCard } from '@/components/admin/reports/ReportCard';
import { ReportTable } from '@/components/admin/reports/ReportTable';
import { AreaTrendChart, BarTrendChart, DonutChart, ChartLegend } from '@/components/admin/reports/LazyCharts';
import { ReportGridSkeleton } from '@/components/admin/reports/Skeletons';
import { EmptyState } from '@/components/admin/reports/EmptyState';
import { formatCurrency, formatNumber, titleCase } from '@/lib/reports/format';
import { exportCSV, exportExcel, openPrintable, buildPrintBlock, safeFilename, type PrintBlock } from '@/lib/reports/export';
import type { PaymentsReportData, ReportColumn } from '@/lib/reports/types';
import type { ExportFormat } from '@/components/admin/reports/ExportMenu';

export function PaymentsReportClient() {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key } = useReportRange('this_month');
  const { data, loading, error, reload } = useReportData<PaymentsReportData>(getReportPayments, range, key);

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
          <EmptyState icon={AlertTriangle} title="Unable to load payments report" message={error || 'Something went wrong. Please refresh and try again.'} />
        </ReportCard>
      </div>
    );
  }

  const k = data.kpis;
  const netUp = data.cashFlow.net >= 0;

  const collectionColumns: ReportColumn<any>[] = [
    { key: 'label', label: 'Date' },
    { key: 'orders', label: 'Orders', align: 'right' },
    { key: 'collected', label: 'Collected', align: 'right', render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.collected)}</span> },
    { key: 'pending', label: 'Pending', align: 'right', render: (r) => formatCurrency(r.pending) },
  ];
  const methodColumns: ReportColumn<any>[] = [
    { key: 'method', label: 'Payment Method', render: (r) => titleCase(r.method) },
    { key: 'count', label: 'Orders', align: 'right' },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
    { key: 'paid', label: 'Paid', align: 'right', render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.paid)}</span> },
    { key: 'pending', label: 'Pending', align: 'right', render: (r) => formatCurrency(r.pending) },
  ];

  const handleExport = (fmt: ExportFormat) => {
    const name = safeFilename('payments-report', range.label);
    if (fmt === 'csv') {
      exportCSV(`${name}.csv`, collectionColumns, data.dailyCollection);
      return;
    }
    if (fmt === 'excel') {
      exportExcel(`${name}.xlsx`, collectionColumns, data.dailyCollection);
      return;
    }
    const blocks: PrintBlock[] = [
      buildPrintBlock('Daily Collection', collectionColumns, data.dailyCollection),
      buildPrintBlock('Payment Methods', methodColumns, data.byMethod),
    ];
    openPrintable('Payments Report', `Period: ${range.label}`, blocks);
  };

  return (
    <div className="space-y-6">
      <ReportFilters preset={preset} onPresetChange={setPreset} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} search={search} setSearch={setSearch} rangeLabel={range.label} onRefresh={reload} loading={loading} onExport={handleExport} exportDisabled={data.dailyCollection.length === 0} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="COD Orders" value={formatNumber(k.codOrders)} icon={<HandCoins className="h-5 w-5" />} accent="slate" />
        <StatCard label="COD Collected" value={formatCurrency(k.codCollected)} icon={<PiggyBank className="h-5 w-5" />} accent="green" />
        <StatCard label="COD Pending" value={formatCurrency(k.codPending)} icon={<Hourglass className="h-5 w-5" />} accent="amber" />
        <StatCard label="Collected Today" value={formatCurrency(k.cashCollectedToday)} icon={<Banknote className="h-5 w-5" />} accent="blue" />
        <StatCard label="Collection Rate" value={`${k.collectionRatePct.toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5" />} accent="violet" sub="collected / expected" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cash Flow</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-500"><TrendingUp className="h-4 w-4 text-emerald-500" /> Inflow</span>
              <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(data.cashFlow.inflow)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-500"><TrendingDown className="h-4 w-4 text-red-500" /> Outflow</span>
              <span className="font-bold text-red-500 tabular-nums">{formatCurrency(data.cashFlow.outflow)}</span>
            </div>
            <div className="border-t border-dashed border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Scale className="h-4 w-4 text-slate-400" /> Net Cash Flow</span>
                <span className={`text-lg font-extrabold tabular-nums ${netUp ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(data.cashFlow.net)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Payment Methods</p>
          {data.byMethod.length === 0 ? (
            <EmptyState title="No payments" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <DonutChart
                data={data.byMethod.map((m) => ({ name: titleCase(m.method), value: m.count }))}
                nameKey="name"
                valueKey="value"
                format="number"
                centerLabel="Orders"
              />
              <div className="flex flex-col justify-center gap-2">
                {data.byMethod.map((m, i) => (
                  <div key={m.method} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#1a4731', '#10b981', '#f59e0b', '#3b82f6'][i % 4] }} />
                      {titleCase(m.method)}
                    </span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">{formatCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Daily Collection" subtitle="Collected vs pending per day">
          {data.dailyCollection.length === 0 ? (
            <EmptyState title="No collections" message="COD payments within this period will appear here." />
          ) : (
            <>
              <AreaTrendChart
                data={data.dailyCollection}
                xKey="label"
                series={[
                  { key: 'collected', label: 'Collected', color: '#10b981', format: 'currency' },
                  { key: 'pending', label: 'Pending', color: '#f59e0b', format: 'currency' },
                ]}
                format="currency"
              />
              <ChartLegend
                items={[
                  { label: 'Collected', color: '#10b981' },
                  { label: 'Pending', color: '#f59e0b' },
                ]}
              />
            </>
          )}
        </ReportCard>

        <ReportCard title="Collection Performance" subtitle="Orders vs amount collected daily">
          {data.dailyCollection.length === 0 ? (
            <EmptyState title="No collections" />
          ) : (
            <BarTrendChart
              data={data.dailyCollection}
              xKey="label"
              series={[
                { key: 'collected', label: 'Collected', color: '#10b981' },
                { key: 'pending', label: 'Pending', color: '#f59e0b' },
              ]}
              format="currency"
            />
          )}
        </ReportCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard title="Daily Collection Detail" subtitle="Day-by-day COD collection">
          <ReportTable<any> columns={collectionColumns} rows={data.dailyCollection} rowKey={(r) => r.date} pageSize={10} searchText={search} searchKeys={(r) => r.label} />
        </ReportCard>

        <ReportCard title="Payment Method Detail" subtitle="Per-method paid & pending amounts">
          <ReportTable<any> columns={methodColumns} rows={data.byMethod} rowKey={(r) => r.method} pageSize={8} searchText={search} searchKeys={(r) => r.method} />
        </ReportCard>
      </div>
    </div>
  );
}
