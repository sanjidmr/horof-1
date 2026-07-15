'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

interface FacebookPixelProps {
  pixelId: string;
}

export function FacebookPixel({ pixelId }: FacebookPixelProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined') return;

    if (!window.fbq) {
      window.fbq = function (...args: any[]) {
        (window._fbq = window._fbq || []).push(args);
      };
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }, [pixelId]);

  useEffect(() => {
    if (window.fbq && pixelId) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, pixelId]);

  return null;
}

export function trackAddToCart(pixelId: string, data: { content_name: string; content_ids: string[]; content_type: string; value: number; currency: string }) {
  if (typeof window !== 'undefined' && window.fbq && pixelId) {
    window.fbq('track', 'AddToCart', data);
  }
}

export function trackPurchase(pixelId: string, data: { value: number; currency: string; content_ids: string[]; content_type: string }) {
  if (typeof window !== 'undefined' && window.fbq && pixelId) {
    window.fbq('track', 'Purchase', data);
  }
}
