'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { subscribe } from '@/lib/actions/subscribers';
import { toast } from 'react-hot-toast';

type Popup = {
  id: string; name: string; title: string | null; description: string | null;
  popup_type: string; trigger_type: string; trigger_value: number; frequency: string;
  image_url: string | null; background_color: string; text_color: string;
  button_text: string; button_color: string; button_text_color: string;
  coupon_code: string | null; discount_percent: number | null; discount_amount: number | null;
  views: number; conversions: number; closes: number;
  is_active: boolean; priority: number;
};

export function PopupDisplay() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const hasShownRef = useRef(false);
  const dismissedRef = useRef(false);

  const recordAction = useCallback(async (id: string, action: 'view' | 'conversion' | 'close') => {
    try {
      const supabase = createSupabaseBrowserClient();
      const rpcMap: Record<string, string> = {
        view: 'increment_popup_views', conversion: 'increment_popup_conversions', close: 'increment_popup_closes',
      };
      await supabase.rpc(rpcMap[action], { popup_id: id });
    } catch {}
  }, []);

  const dismiss = useCallback(() => {
    if (popup) {
      dismissedRef.current = true;
      recordAction(popup.id, 'close');
    }
    setVisible(false);
  }, [popup, recordAction]);

  const handleConversion = useCallback(async () => {
    if (!popup) return;
    if (email && popup.popup_type === 'newsletter_signup') {
      try {
        const res = await subscribe(email, 'popup');
        if (res.ok) {
          toast.success('Subscribed successfully!');
          recordAction(popup.id, 'conversion');
          setVisible(false);
        } else {
          toast.error(res.error || 'Failed to subscribe');
        }
      } catch {
        toast.error('Failed to subscribe');
      }
    } else {
      recordAction(popup.id, 'conversion');
      setVisible(false);
    }
  }, [popup, email, recordAction]);

  useEffect(() => {
    const fetchPopup = async () => {
      const supabase = createSupabaseBrowserClient();
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('popup_campaigns')
        .select('*')
        .eq('is_active', true)
        .or(`date_start.is.null,date_start.lte.${now}`)
        .or(`date_end.is.null,date_end.gte.${now}`)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const p = data as Popup;
        const dismissed = localStorage.getItem(`popup_dismissed_${p.id}`);
        if (dismissed) {
          if (p.frequency === 'once') return;
          const dismissedTime = parseInt(dismissed, 10);
          const nowTime = Date.now();
          if (p.frequency === 'daily' && nowTime - dismissedTime < 86400000) return;
          if (p.frequency === 'weekly' && nowTime - dismissedTime < 604800000) return;
        }
        setPopup(p);
      }
    };
    fetchPopup();
  }, []);

  useEffect(() => {
    if (!popup || hasShownRef.current) return;

    const show = () => {
      hasShownRef.current = true;
      setVisible(true);
      recordAction(popup.id, 'view');
    };

    if (popup.trigger_type === 'on_load') {
      const timeout = setTimeout(show, popup.trigger_value * 1000 || 500);
      return () => clearTimeout(timeout);
    }

    if (popup.trigger_type === 'after_seconds') {
      const timeout = setTimeout(show, (popup.trigger_value || 5) * 1000);
      return () => clearTimeout(timeout);
    }

    if (popup.trigger_type === 'exit_intent') {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 0) show();
      };
      document.addEventListener('mouseleave', handler);
      return () => document.removeEventListener('mouseleave', handler);
    }

    if (popup.trigger_type === 'scroll_percentage') {
      const handler = () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrolled >= (popup.trigger_value || 50)) show();
      };
      window.addEventListener('scroll', handler, { once: true });
      return () => window.removeEventListener('scroll', handler);
    }

    show();
  }, [popup, recordAction]);

  if (!visible || !popup) return null;

  const handleDismiss = () => {
    localStorage.setItem(`popup_dismissed_${popup.id}`, String(Date.now()));
    dismiss();
  };

  const showCoupon = ['discount_offer', 'coupon_popup', 'flash_sale'].includes(popup.popup_type);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative max-w-lg w-full mx-4 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: popup.background_color, color: popup.text_color }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
          style={{ color: popup.text_color }}
        >
          <X className="w-4 h-4" />
        </button>

        {popup.image_url && (
          <div className="w-full h-48 overflow-hidden">
            <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-8 text-center">
          {popup.title && (
            <h2 className="text-2xl font-bold mb-2" style={{ color: popup.text_color }}>
              {popup.title}
            </h2>
          )}
          {popup.description && (
            <p className="text-sm mb-6 opacity-80" style={{ color: popup.text_color }}>
              {popup.description}
            </p>
          )}

          {showCoupon && popup.coupon_code && (
            <div className="mb-6 p-4 rounded-2xl bg-black/5 border-2 border-dashed" style={{ borderColor: popup.text_color + '40' }}>
              <p className="text-xs uppercase tracking-widest font-bold mb-1 opacity-60">Use Coupon</p>
              <p className="text-3xl font-black tracking-wider" style={{ color: popup.button_color }}>
                {popup.coupon_code}
              </p>
              {popup.discount_percent && <p className="text-sm mt-1 font-bold">{popup.discount_percent}% OFF</p>}
            </div>
          )}

          {popup.popup_type === 'newsletter_signup' && (
            <div className="flex gap-2 mb-4">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-all"
                style={{ borderColor: popup.text_color + '30', color: popup.text_color, backgroundColor: popup.background_color }}
              />
              <button
                onClick={handleConversion}
                className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: popup.button_color, color: popup.button_text_color }}
              >
                {popup.button_text || 'Subscribe'}
              </button>
            </div>
          )}

          {popup.popup_type !== 'newsletter_signup' && (
            <button
              onClick={handleConversion}
              className="w-full px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: popup.button_color, color: popup.button_text_color }}
            >
              {popup.button_text || 'Get Offer'}
            </button>
          )}

          <button onClick={handleDismiss} className="mt-4 text-xs opacity-50 hover:opacity-100 transition-opacity" style={{ color: popup.text_color }}>
            No thanks, I&apos;ll browse
          </button>
        </div>
      </div>
    </div>
  );
}
