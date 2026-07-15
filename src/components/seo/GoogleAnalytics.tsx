'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: any[]) { window.dataLayer!.push(args); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }, [measurementId]);

  useEffect(() => {
    if (window.gtag && measurementId) {
      window.gtag('config', measurementId, { page_path: pathname });
    }
  }, [pathname, measurementId]);

  return null;
}

export function trackGAEvent(measurementId: string, action: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag && measurementId) {
    window.gtag('event', action, params);
  }
}
