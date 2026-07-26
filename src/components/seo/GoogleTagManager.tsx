'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    dataLayer?: any[];
    google_tag_manager?: Record<string, any>;
  }
}

interface GoogleTagManagerProps {
  containerId: string;
}

export function GoogleTagManager({ containerId }: GoogleTagManagerProps) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!containerId || typeof window === 'undefined' || initialized.current) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    initialized.current = true;
  }, [containerId]);

  useEffect(() => {
    if (window.dataLayer && containerId) {
      window.dataLayer.push({ event: 'page_view', page_path: pathname });
    }
  }, [pathname, containerId]);

  return null;
}
