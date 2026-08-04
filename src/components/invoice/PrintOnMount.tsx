'use client';

import { useEffect } from 'react';

/** Auto-open the print dialog once the invoice has rendered and images loaded. */
export function PrintOnMount({ delay = 400 }: { delay?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready.then(() => window.print()).catch(() => window.print());
      } else {
        window.print();
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return null;
}
