'use client';

import { Calendar, RefreshCw, Search } from 'lucide-react';
import { REPORT_PRESETS } from '@/lib/reports/date-ranges';
import { ExportMenu, type ExportFormat } from './ExportMenu';
import { cn } from '@/lib/utils';

export interface ReportFiltersProps {
  preset: string;
  onPresetChange: (p: string) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  searchPlaceholder?: string;
  rangeLabel: string;
  onRefresh: () => void;
  loading?: boolean;
  onExport?: (fmt: ExportFormat) => void;
  exportDisabled?: boolean;
}

export function ReportFilters({
  preset,
  onPresetChange,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  search,
  setSearch,
  searchPlaceholder = 'Search this report...',
  rangeLabel,
  onRefresh,
  loading,
  onExport,
  exportDisabled,
}: ReportFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-[#1a4731]/40 focus:ring-2 focus:ring-[#1a4731]/10"
          >
            {REPORT_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">▼</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              if (e.target.value && !customTo) onPresetChange('custom');
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-[#1a4731]/40 focus:ring-2 focus:ring-[#1a4731]/10"
          />
          <span className="text-xs font-bold text-slate-300">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              if (e.target.value) onPresetChange('custom');
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-[#1a4731]/40 focus:ring-2 focus:ring-[#1a4731]/10"
          />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#1a4731]/30 focus:ring-2 focus:ring-[#1a4731]/10"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              'hidden items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider sm:inline-flex',
              loading ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', loading ? 'animate-pulse bg-emerald-500' : 'bg-slate-300')} />
            {rangeLabel}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh data"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-[#1a4731]/30 hover:text-[#1a4731] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          {onExport && <ExportMenu onExport={onExport} disabled={exportDisabled} loading={loading} />}
        </div>
      </div>
    </div>
  );
}
