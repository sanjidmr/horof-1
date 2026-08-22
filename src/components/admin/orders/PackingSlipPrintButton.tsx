'use client';

import { Printer } from 'lucide-react';

export function PackingSlipPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 h-10 px-5 border rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <Printer size={15} /> Print
    </button>
  );
}