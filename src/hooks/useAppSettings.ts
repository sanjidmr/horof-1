'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_GENERAL,
  DEFAULT_SHIPPING,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_EMAIL,
  DEFAULT_SOCIAL,
  type AppSettings,
} from '@/lib/settings/types';
import { mergeSettingsWithDefaults } from '@/lib/utils/safe-json';

/**
 * Loads the full app settings (admin) and keeps them in sync in real time.
 * When another admin saves settings, this hook re-fetches automatically.
 *
 * Production-safe:
 * - Unique channel name per hook instance (prevents duplicate channel errors)
 * - All postgres_changes callbacks registered BEFORE .subscribe()
 * - Proper cleanup on unmount (prevents memory leaks)
 * - Safe settings merging (never crashes on null/string/invalid JSONB)
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unique channel name per hook instance to prevent duplicate channel errors.
  const channelNameRef = useRef<string>(
    `app-settings-${Math.random().toString(36).slice(2, 10)}`
  );

  const refresh = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const keys = ['general', 'shipping', 'notifications', 'email', 'social'];
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', keys);
      const map: Record<string, unknown> = {};
      (data || []).forEach((row: any) => { map[row.key] = row.value; });

      setSettings({
        general: mergeSettingsWithDefaults(map.general, { ...DEFAULT_GENERAL }),
        shipping: mergeSettingsWithDefaults(map.shipping, { ...DEFAULT_SHIPPING }),
        notifications: mergeSettingsWithDefaults(map.notifications, { ...DEFAULT_NOTIFICATIONS }),
        email: mergeSettingsWithDefaults(map.email, { ...DEFAULT_EMAIL }),
        social: mergeSettingsWithDefaults(map.social, { ...DEFAULT_SOCIAL }),
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    refresh();

    // Register ALL postgres_changes callbacks BEFORE calling .subscribe().
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

  return { settings, loading, error, refresh };
}