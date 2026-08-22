'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type InvoiceDownloadButtonProps = {
  orderId: string;
  orderNumber?: string;
  className?: string;
};

export function InvoiceDownloadButton({
  orderId,
  orderNumber,
  className = '',
}: InvoiceDownloadButtonProps) {
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
      a.download = `invoice-${orderNumber || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Invoice PDF downloaded');
    } catch (err: any) {
      console.error('Invoice PDF download failed:', err);
      toast.error(err?.message || 'Could not download the invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center justify-center gap-2 h-11 px-5 border rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 ${className}`}
    >
      {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {downloading ? 'Generating…' : 'Download Invoice'}
    </button>
  );
}