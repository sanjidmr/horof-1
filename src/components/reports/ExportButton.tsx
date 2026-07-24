'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, any>[];
  filename?: string;
  columns?: { key: string; label: string }[];
}

export function ExportButton({ data, filename = 'report', columns }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const cols = columns || (data.length > 0 ? Object.keys(data[0]).map((k) => ({ key: k, label: k })) : []);

  const toCsv = () => {
    const header = cols.map((c) => `"${c.label}"`).join(',');
    const rows = data.map((row) =>
      cols.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const downloadCsv = () => {
    const csv = toCsv();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const downloadJson = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const tableRows = data.map((row) =>
      `<tr>${cols.map((c) => `<td style="padding:6px 10px;border:1px solid #ddd;font-size:12px">${row[c.key] ?? ''}</td>`).join('')}</tr>`
    ).join('');
    w.document.write(`
      <html><head><title>${filename}</title></head><body>
      <h2 style="font-family:sans-serif">${filename}</h2>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
        <thead><tr>${cols.map((c) => `<th style="padding:8px 10px;border:1px solid #ddd;background:#f5f5f5;text-align:left;font-size:12px">${c.label}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <script>window.print();<\/script>
      </body></html>
    `);
    w.document.close();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300 transition-all"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-2 min-w-[180px]">
            {[
              { icon: FileSpreadsheet, label: 'Export CSV', onClick: downloadCsv },
              { icon: FileText, label: 'Export JSON', onClick: downloadJson },
              { icon: Printer, label: 'Print', onClick: print },
            ].map((opt) => (
              <button key={opt.label} onClick={opt.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <opt.icon className="w-4 h-4 text-slate-400" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
