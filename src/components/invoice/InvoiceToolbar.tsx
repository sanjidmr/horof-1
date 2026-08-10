'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, Printer, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

type InvoiceToolbarProps = {
  orderId: string;
  backHref: string;
  backLabel: string;
  trackHref?: string;
  canDownload?: boolean;
  downloadLabel?: string;
};

export function InvoiceToolbar({
  orderId,
  backHref,
  backLabel,
  trackHref,
  canDownload = true,
  downloadLabel = 'Download PDF',
}: InvoiceToolbarProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoice/${encodeURIComponent(orderId)}/pdf`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to generate PDF (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Invoice PDF downloaded');
    } catch (err: any) {
      console.error('PDF download failed:', err);
      toast.error(err?.message || 'Could not download the invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>
      <div className="flex flex-wrap gap-2">
        {trackHref && (
          <Link
            href={trackHref}
            target="_blank"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5" /> Track Order
          </Link>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        {canDownload && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#1a4731] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-lg shadow-forest-900/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Generating…' : downloadLabel}
          </button>
        )}
      </div>
    </div>
  );
}
