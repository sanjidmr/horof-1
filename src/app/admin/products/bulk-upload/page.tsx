'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  XCircle, Loader2, FileText, ArrowRight, ArrowLeft, Ban, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Separator } from '@/components/shadcn/separator';
import {
  parseUploadFile, downloadSampleTemplate, importProducts, getUploadHistory,
  type PreviewRow, type ValidationError, type ImportResult,
} from '@/lib/actions/admin/bulk-upload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'importing' | 'results';

type HistoryEntry = {
  id: string;
  file_name: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  status: string;
  duration_ms: number;
  errors: ValidationError[];
  created_at: string;
};

export default function BulkUploadPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const h = await getUploadHistory();
      setHistory(h as any);
    } catch { /* ignore */ }
  }, []);

  const handleFileSelect = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('Only CSV, XLSX, XLS files are supported');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('File exceeds 20MB limit');
      return;
    }
    setFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('duplicateHandling', duplicateHandling);
      const res = await parseUploadFile(fd);
      setPreview(res.preview);
      setTotalRows(res.totalRows);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file || preview.length === 0) return;
    setImporting(true);
    setStep('importing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('duplicateHandling', duplicateHandling);
      const res = await importProducts(fd);
      setResult(res);
      setStep('results');
      loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const csv = await downloadSampleTemplate();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-product-template.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleShowHistory = async () => {
    setShowHistory(v => !v);
    if (!showHistory) loadHistory();
  };

  const validCount = preview.filter(p => p.valid).length;
  const invalidCount = preview.filter(p => !p.valid).length;
  const duplicateCount = preview.filter(p => p.isDuplicate).length;
  const hasWarnings = preview.some(p => p.warnings.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Bulk Product Upload</h1>
          <p className="text-slate-500 mt-1">Import hundreds of products at once using CSV or Excel files</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Sample Template
          </Button>
          <Button variant="outline" size="sm" onClick={handleShowHistory} className="gap-2">
            <FileText className="h-4 w-4" /> {showHistory ? 'Hide' : 'Upload'} History
          </Button>
        </div>
      </div>

      {/* Upload History */}
      {showHistory && (
        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1a4731]" /> Upload History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No uploads yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-5 py-3">File</th>
                      <th className="px-5 py-3">Rows</th>
                      <th className="px-5 py-3">Success</th>
                      <th className="px-5 py-3">Failed</th>
                      <th className="px-5 py-3">Skipped</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-700 max-w-[200px] truncate">{entry.file_name}</td>
                        <td className="px-5 py-3 text-slate-600">{entry.total_rows}</td>
                        <td className="px-5 py-3 text-emerald-600 font-semibold">{entry.successful_rows}</td>
                        <td className="px-5 py-3 text-red-500">{entry.failed_rows}</td>
                        <td className="px-5 py-3 text-slate-500">{entry.skipped_rows}</td>
                        <td className="px-5 py-3 text-slate-500">{(entry.duration_ms / 1000).toFixed(1)}s</td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            entry.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            entry.status === 'partial' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          )}>
                            {entry.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {entry.status === 'partial' && <AlertTriangle className="h-3 w-3" />}
                            {entry.status === 'failed' && <XCircle className="h-3 w-3" />}
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs">
                          {new Date(entry.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-0 bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
        {[
          { key: 'upload', label: 'Upload File', icon: Upload },
          { key: 'preview', label: 'Validate & Preview', icon: FileSpreadsheet },
          { key: 'importing', label: 'Import', icon: Loader2 },
          { key: 'results', label: 'Results', icon: CheckCircle2 },
        ].map((s, idx) => {
          const active = step === s.key;
          const done = ['preview', 'importing', 'results'].includes(step) && ['upload'].includes(s.key) ||
                       ['importing', 'results'].includes(step) && ['upload', 'preview'].includes(s.key) ||
                       step === 'results' && ['upload', 'preview', 'importing'].includes(s.key) ||
                       step === s.key;
          return (
            <React.Fragment key={s.key}>
              {idx > 0 && <div className="h-px flex-1 bg-slate-100 mx-1" />}
              <div className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs font-bold uppercase tracking-wider',
                active ? 'bg-[#1a4731] text-white shadow-sm' :
                done ? 'text-emerald-600' : 'text-slate-400'
              )}>
                <s.icon className={cn('h-4 w-4', active && 'animate-pulse')} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardContent className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                dragOver ? 'border-[#1a4731] bg-[#f0fdf4]/30' : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
              <div className="w-16 h-16 rounded-2xl bg-[#1a4731]/5 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-7 w-7 text-[#1a4731]" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Drop your file here or click to browse</h3>
              <p className="text-sm text-slate-500 mb-6">Supports CSV, XLSX, XLS files up to 20MB</p>
              {file && (
                <div className="inline-flex items-center gap-3 px-4 py-3 bg-[#f0fdf4] border border-[#1a4731]/10 rounded-xl">
                  <FileSpreadsheet className="h-5 w-5 text-[#1a4731]" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Duplicate handling */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 shrink-0">
                <Ban className="h-4 w-4 text-slate-400" /> Duplicate SKU Handling
              </div>
              <div className="flex gap-3">
                <label className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium',
                  duplicateHandling === 'skip' ? 'border-[#1a4731] bg-white text-[#1a4731]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}>
                  <input type="radio" name="dup" value="skip" checked={duplicateHandling === 'skip'} onChange={() => setDuplicateHandling('skip')} className="sr-only" />
                  <CheckCircle2 className={cn('h-4 w-4', duplicateHandling === 'skip' ? 'text-[#1a4731]' : 'text-slate-300')} />
                  Skip Duplicates
                </label>
                <label className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium',
                  duplicateHandling === 'update' ? 'border-[#1a4731] bg-white text-[#1a4731]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}>
                  <input type="radio" name="dup" value="update" checked={duplicateHandling === 'update'} onChange={() => setDuplicateHandling('update')} className="sr-only" />
                  <Upload className={cn('h-4 w-4', duplicateHandling === 'update' ? 'text-[#1a4731]' : 'text-slate-300')} />
                  Update Existing
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleParse} disabled={!file || parsing} className="gap-2 h-11 px-6">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {parsing ? 'Parsing File...' : 'Validate & Preview'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-bold text-slate-700">Data Preview</CardTitle>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{totalRows} total rows</span>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">{validCount} valid</span>
              {invalidCount > 0 && (
                <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-md font-semibold">{invalidCount} invalid</span>
              )}
              {duplicateCount > 0 && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">{duplicateCount} duplicates</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0 || importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import {validCount} Products
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 sticky top-0">
                    <th className="px-5 py-3 w-12">#</th>
                    <th className="px-5 py-3 min-w-[180px]">Product Name</th>
                    <th className="px-5 py-3">SKU</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 min-w-[200px]">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.map((row) => (
                    <tr key={row.rowNumber} className={cn(
                      'hover:bg-slate-50/50 transition-colors',
                      !row.valid && 'bg-red-50/20'
                    )}>
                      <td className="px-5 py-3 text-slate-400 text-xs">{row.rowNumber}</td>
                      <td className="px-5 py-3">
                        <span className={cn('font-medium', row.valid ? 'text-slate-800' : 'text-red-600')}>
                          {row.name}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{row.sku}</code>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-700">৳{row.price.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        {row.valid && !row.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                            <AlertTriangle className="h-3 w-3" /> Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider border border-red-100">
                            <XCircle className="h-3 w-3" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.errors.map((e, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded border border-red-100">
                              <XCircle className="h-2.5 w-2.5" /> {e}
                            </span>
                          ))}
                          {row.warnings.map((w, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded border border-amber-100">
                              <AlertTriangle className="h-2.5 w-2.5" /> {w}
                            </span>
                          ))}
                          {row.errors.length === 0 && row.warnings.length === 0 && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <Card className="border border-slate-100 shadow-sm rounded-2xl">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-[#1a4731]/5 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-10 w-10 text-[#1a4731] animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Importing Products...</h3>
            <p className="text-slate-500 mb-6">Processing your file. Please wait while we import your products.</p>
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1a4731] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Each product is processed safely. Existing data will not be corrupted.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Results */}
      {step === 'results' && result && (
        <div className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <div className={cn(
              'p-8 text-center',
              result.failed === 0 ? 'bg-gradient-to-br from-emerald-50 to-white' : 'bg-gradient-to-br from-amber-50 to-white'
            )}>
              {result.failed === 0 ? (
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-10 w-10 text-amber-600" />
                </div>
              )}
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {result.failed === 0 ? 'Import Complete!' : 'Import Completed with Errors'}
              </h3>
              <p className="text-slate-500">Processed in {(result.durationMs / 1000).toFixed(1)} seconds</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
              <div className="p-6 text-center">
                        <p className="text-3xl font-black text-slate-800">{result.totalRows}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Total Rows</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-black text-emerald-600">{result.successful}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Imported</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-black text-red-500">{result.failed}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Failed</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-3xl font-black text-amber-500">{result.skipped}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Skipped</p>
              </div>
            </div>
          </Card>

          {/* Error report */}
          {result.errors.length > 0 && (
            <Card className="border border-slate-100 shadow-sm rounded-2xl">
              <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Error Report ({result.errors.length} errors)
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = [
                      ['Row', 'Product Name', 'Error'].join(','),
                      ...result.errors.map(e =>
                        [e.row, `"${e.productName}"`, `"${e.errors.join('; ')}"`].join(',')
                      ),
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'import-errors.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-2 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download Error Report
                </Button>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 sticky top-0">
                        <th className="px-5 py-3">Row</th>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {result.errors.map((err, i) => (
                        <tr key={i} className="hover:bg-red-50/20 transition-colors">
                          <td className="px-5 py-3 text-slate-400 text-xs">{err.row}</td>
                          <td className="px-5 py-3 font-medium text-slate-700">{err.productName}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {err.errors.map((e, j) => (
                                <span key={j} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] rounded border border-red-100">
                                  {e}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setPreview([]); setResult(null); }} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Upload Another File
            </Button>
            <Button onClick={() => { setStep('upload'); setFile(null); setPreview([]); setResult(null); }} className="gap-2">
              <Upload className="h-4 w-4" /> New Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
