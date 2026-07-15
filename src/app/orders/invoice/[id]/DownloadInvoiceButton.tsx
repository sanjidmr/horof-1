'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function DownloadInvoiceButton() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const original = document.getElementById('invoice-content');
      if (!original) return;

      await document.fonts.ready;

      const images = original.querySelectorAll('img');
      await Promise.allSettled(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else { img.onload = () => resolve(); img.onerror = () => resolve(); }
            }),
        ),
      );

      const clone = original.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '794px';
      clone.style.margin = '0';
      clone.style.padding = '40px 48px';
      clone.style.background = '#ffffff';
      clone.style.border = 'none';
      clone.style.borderRadius = '0';
      clone.style.boxShadow = 'none';
      clone.style.zIndex = '-1';
      document.body.appendChild(clone);

      const dataUrl = await toPng(clone, {
        pixelRatio: 4,
        cacheBust: true,
        quality: 1,
        width: 794,
        height: clone.scrollHeight,
        style: {
          margin: '0',
          padding: '0',
          background: '#ffffff',
        },
      });

      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = `invoice-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 h-10 px-6 bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold shadow-lg shadow-forest-900/10 transition-all cursor-pointer disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? 'Generating...' : 'Download Invoice'}
    </button>
  );
}
