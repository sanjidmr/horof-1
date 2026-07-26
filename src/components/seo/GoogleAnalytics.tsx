'use client';

import { useEffect, useRef } from 'react';
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
  const initialized = useRef(false);

  useEffect(() => {
    if (!measurementId || typeof window === 'undefined' || initialized.current) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: any[]) { window.dataLayer!.push(args); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    initialized.current = true;
  }, [measurementId]);

  useEffect(() => {
    if (window.gtag && measurementId) {
      window.gtag('config', measurementId, { page_path: pathname });
    }
  }, [pathname, measurementId]);

  return null;
}

export const gaTrack = {
  event: (action: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, params);
    }
  },

  addToCart: (items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_to_cart', { currency: 'BDT', value, items });
    }
  },

  removeFromCart: (items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'remove_from_cart', { currency: 'BDT', value, items });
    }
  },

  viewItem: (item: { item_id: string; item_name: string; price: number; category?: string }) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item', { currency: 'BDT', value: item.price, items: [item] });
    }
  },

  viewItemList: (items: { item_id: string; item_name: string; price: number }[], listName?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item_list', { items, item_list_name: listName || 'product_list' });
    }
  },

  beginCheckout: (items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', { currency: 'BDT', value, items });
    }
  },

  addShippingInfo: (items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_shipping_info', { currency: 'BDT', value, items });
    }
  },

  addPaymentInfo: (items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_payment_info', { currency: 'BDT', value, items });
    }
  },

  purchase: (transactionId: string, items: { item_id: string; item_name: string; price: number; quantity: number }[], value: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', { transaction_id: transactionId, currency: 'BDT', value, items });
    }
  },

  search: (searchTerm: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search', { search_term: searchTerm });
    }
  },

  viewPromotion: (items: { item_id: string; item_name: string; promotion_name: string }[]) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_promotion', { items });
    }
  },

  selectPromotion: (items: { item_id: string; item_name: string; promotion_name: string }[]) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_promotion', { items });
    }
  },
};
