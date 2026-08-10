'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import type { ReportColumn } from '@/lib/reports/types';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

export interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  pageSize?: number;
  searchText?: string;
  searchKeys?: (row: T) => string;
  emptyMessage?: string;
  dense?: boolean;
  compactHeader?: boolean;
  footer?: React.ReactNode;
}

export function ReportTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  searchText,
  searchKeys,
  emptyMessage = 'No records match the current filters.',
  dense,
  compactHeader,
  footer,
}: ReportTableProps<T>) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!searchText || !searchKeys) return rows;
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => searchKeys(r).toLowerCase().includes(q));
  }, [rows, searchText, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={cn('border-b border-slate-100', compactHeader && 'bg-slate-50/60')}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={FileText}
                    title="No data available"
                    message={emptyMessage}
                  />
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 text-slate-600',
                        dense ? 'py-2' : 'py-2.5',
                        col.align === 'right' && 'text-right tabular-nums',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
          <p className="text-xs text-slate-400">
            Showing {start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-600">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {footer}
    </div>
  );
}

export function TableSearchBox({ value, onChange, placeholder = 'Search records...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#1a4731]/30 focus:ring-2 focus:ring-[#1a4731]/10"
      />
    </div>
  );
}
