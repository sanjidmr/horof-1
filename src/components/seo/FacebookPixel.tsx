'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

interface FacebookPixelProps {
  pixelId: string;
  debugMode?: boolean;
}

let lastEventKey = '';
let lastEventTime = 0;

function dedupEvent(key: string): boolean {
  const now = Date.now();
  if (key === lastEventKey && now - lastEventTime < 500) return true;
  lastEventKey = key;
  lastEventTime = now;
  return false;
}

export function FacebookPixel({ pixelId, debugMode }: FacebookPixelProps) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined' || initialized.current) return;

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
    initialized.current = true;
  }, [pixelId]);

  useEffect(() => {
    if (window.fbq && pixelId) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, pixelId]);

  return null;
}

export function trackFBEvent(eventName: string, params?: Record<string, any>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  
  const eventKey = `${eventName}_${eventId || JSON.stringify(params || {})}`;
  if (dedupEvent(eventKey)) return;
  
  const payload = { ...params };
  if (eventId) payload.eventID = eventId;
  
  window.fbq('track', eventName, payload);
}

export function trackFBEventCustom(eventName: string, params?: Record<string, any>, eventId?: string) {
  if (typeof window === 'undefined' || !window.fbq) return;
  
  const eventKey = `${eventName}_${eventId || JSON.stringify(params || {})}`;
  if (dedupEvent(eventKey)) return;
  
  const payload = { ...params };
  if (eventId) payload.eventID = eventId;
  
  window.fbq('trackCustom', eventName, payload);
}

export const fbTrack = {
  pageView: (eventId?: string) => trackFBEvent('PageView', {}, eventId),
  
  viewContent: (data: { content_name: string; content_category?: string; content_ids: string[]; content_type: string; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('ViewContent', data, eventId),
  
  search: (data: { search_string: string; content_category?: string; content_type?: string; content_ids?: string[]; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('Search', data, eventId),
  
  addToWishlist: (data: { content_name: string; content_ids: string[]; content_type: string; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('AddToWishlist', data, eventId),
  
  addToCart: (data: { content_name: string; content_ids: string[]; content_type: string; value: number; currency: string; num_items?: number }, eventId?: string) =>
    trackFBEvent('AddToCart', data, eventId),
  
  initiateCheckout: (data: { content_ids: string[]; content_type: string; value: number; currency: string; num_items: number }, eventId?: string) =>
    trackFBEvent('InitiateCheckout', data, eventId),
  
  addPaymentInfo: (data: { content_ids: string[]; content_type: string; value?: number; currency?: string; payment_type?: string }, eventId?: string) =>
    trackFBEvent('AddPaymentInfo', data, eventId),
  
  purchase: (data: { value: number; currency: string; content_ids: string[]; content_type: string; num_items?: number; order_id?: string }, eventId?: string) =>
    trackFBEvent('Purchase', data, eventId),
  
  lead: (data?: { content_name?: string; content_category?: string; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('Lead', data, eventId),
  
  contact: (data?: { content_name?: string; content_category?: string }, eventId?: string) =>
    trackFBEvent('Contact', data, eventId),
  
  completeRegistration: (data?: { content_name?: string; status?: string; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('CompleteRegistration', data, eventId),
  
  subscribe: (data?: { content_name?: string; value?: number; currency?: string }, eventId?: string) =>
    trackFBEvent('Subscribe', data, eventId),
};
