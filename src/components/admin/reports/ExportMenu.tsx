'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'print';

export function ExportMenu({
  onExport,
  disabled,
  loading,
}: {
  onExport: (fmt: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const run = (fmt: ExportFormat) => {
    setOpen(false);
    if (disabled || loading) return;
    onExport(fmt);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-[#1a4731]/30 hover:text-[#1a4731] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          Export
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-100 bg-white p-1.5 shadow-2xl">
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Export Report
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-50" />
        <DropdownMenuItem onSelect={() => run('csv')} className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('excel')} className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-green-700" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('pdf')} className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold">
          <FileText className="h-4 w-4 text-red-500" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('print')} className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold">
          <Printer className="h-4 w-4 text-slate-500" />
          Print Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
