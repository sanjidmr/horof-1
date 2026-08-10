import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ReportColumn } from './types';

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function rowsFromColumns<T>(columns: ReportColumn<T>[], rows: T[]): Record<string, string | number | null | undefined>[] {
  return rows.map((row) => {
    const out: Record<string, string | number | null | undefined> = {};
    for (const col of columns) {
      let value: string | number | null | undefined;
      if (col.value) {
        value = col.value(row);
      } else if (col.render) {
        continue;
      } else {
        value = (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
      }
      if (value !== undefined && value !== null && typeof value === 'string') {
        value = value.replace(/<[^>]*>/g, '').trim();
      }
      out[col.label] = value ?? '';
    }
    return out;
  });
}

export function exportCSV(filename: string, columns: ReportColumn<any>[], rows: any[]): boolean {
  const data = rowsFromColumns(columns, rows);
  if (data.length === 0) return false;
  const csv = Papa.unparse(data);
  downloadBlob(filename, new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  return true;
}

export function exportExcel(filename: string, columns: ReportColumn<any>[], rows: any[]): boolean {
  const data = rowsFromColumns(columns, rows);
  if (data.length === 0) return false;
  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
  XLSX.writeFile(workbook, filename);
  return true;
}

export interface PrintBlock {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export function openPrintable(title: string, subtitle: string, blocks: PrintBlock[]) {
  const generated = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 40px; }
    .head { border-bottom: 3px solid #1a4731; padding-bottom: 16px; margin-bottom: 24px; }
    .head h1 { margin: 0; font-size: 24px; color: #1a4731; }
    .head p { margin: 6px 0 0; color: #64748b; font-size: 13px; }
    .block { margin-bottom: 28px; page-break-inside: avoid; }
    .block h2 { font-size: 15px; margin: 0 0 10px; color: #1a4731; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 10px; text-align: left; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
    td.num, th.num { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 30px; color: #94a3b8; font-size: 11px; text-align: center; }
    @media print { body { margin: 16px; } }
  </style></head><body>
  <div class="head">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <p>Generated on ${generated}</p>
  </div>
  ${blocks
    .filter((b) => b.rows.length > 0)
    .map(
      (b) => `<div class="block"><h2>${b.title}</h2>
      <table>
        <thead><tr>${b.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${b.rows
          .map(
            (r) =>
              `<tr>${r
                .map((cell, i) => {
                  const isNum = typeof cell === 'number' || (!isNaN(Number(String(cell).replace(/[,৳]/g, ''))) && String(cell).trim() !== '');
                  return `<td class="${isNum ? 'num' : ''}">${cell}</td>`;
                })
                .join('')}</tr>`
          )
          .join('')}</tbody>
      </table></div>`
    )
    .join('')}
  <div class="footer">Horof Admin — Reports & Analytics</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function buildPrintBlock<T>(
  title: string,
  columns: ReportColumn<T>[],
  rows: T[],
  formatter?: (row: T, col: ReportColumn<T>) => string | number
): PrintBlock {
  const cols = columns.map((c) => c.label);
  const data = rows.map((row) =>
    columns.map((col) => {
      if (formatter) return formatter(row, col);
      let value: string | number | null | undefined;
      if (col.value) value = col.value(row);
      else value = (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
      if (value === null || value === undefined) return '';
      return String(value).replace(/<[^>]*>/g, '').trim();
    })
  );
  return { title, columns: cols, rows: data };
}

export function safeFilename(prefix: string, rangeLabel: string): string {
  const slug = rangeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'range';
  return `${prefix}-${slug}`;
}
