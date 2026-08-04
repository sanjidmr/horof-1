'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_GENERAL,
  DEFAULT_SHIPPING,
  DEFAULT_SOCIAL,
  type GeneralSettings,
  type ShippingSettings,
  type SocialSettings,
} from '@/lib/settings/types';
import { mergeSettingsWithDefaults } from '@/lib/utils/safe-json';

export type PublicSettings = {
  general: GeneralSettings;
  shipping: ShippingSettings;
  social: SocialSettings;
};

/**
 * Storefront-safe settings hook used by Footer / Navbar / checkout.
 * Loads once, then subscribes to realtime so edits propagate live.
 *
 * Production-safe:
 * - Unique channel name per hook instance (prevents duplicate channel errors)
 * - All postgres_changes callbacks registered BEFORE .subscribe()
 * - Proper cleanup on unmount (prevents memory leaks)
 * - Safe settings merging (never crashes on null/string/invalid JSONB)
 */
export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>({
    general: { ...DEFAULT_GENERAL },
    shipping: { ...DEFAULT_SHIPPING },
    social: { ...DEFAULT_SOCIAL },
  });
  const [loaded, setLoaded] = useState(false);

  // Unique channel name per hook instance to prevent duplicate channel errors
  // when multiple components (Navbar, Footer, checkout) mount simultaneously.
  const channelNameRef = useRef<string>(
    `public-settings-${Math.random().toString(36).slice(2, 10)}`
  );

  const refresh = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['general', 'shipping', 'social']);
      const map: Record<string, unknown> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });

      setSettings((prev) => ({
        general: mergeSettingsWithDefaults<GeneralSettings>(map.general, {
          ...DEFAULT_GENERAL,
          ...prev.general,
        }),
        shipping: mergeSettingsWithDefaults<ShippingSettings>(map.shipping, {
          ...DEFAULT_SHIPPING,
          ...prev.shipping,
        }),
        social: mergeSettingsWithDefaults<SocialSettings>(map.social, {
          ...DEFAULT_SOCIAL,
          ...prev.social,
        }),
      }));
    } catch {
      // keep defaults on failure
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Initial load
    refresh();

    // Register ALL postgres_changes callbacks BEFORE calling .subscribe().
    // This is the only valid order — calling .on() after .subscribe() throws
    // "cannot add postgres_changes callbacks after subscribe()".
    channel = supabase
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        if (isMounted) refresh();
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [refresh]);

  return { settings, loaded, refresh };
}