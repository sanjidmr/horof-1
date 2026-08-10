'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';
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

const DEFAULT_SETTINGS: PublicSettings = {
  general: { ...DEFAULT_GENERAL },
  shipping: { ...DEFAULT_SHIPPING },
  social: { ...DEFAULT_SOCIAL },
};

// ---------------------------------------------------------------------------
// Shared store: every consumer of usePublicSettings (Navbar, Footer,
// FloatingActions, checkout, etc.) reads the SAME snapshot and reuses ONE
// database fetch and ONE realtime channel instead of each mounting its own.
// This eliminates 3-4 duplicate `site_settings` reads per storefront page.
// ---------------------------------------------------------------------------

let currentSettings: PublicSettings = DEFAULT_SETTINGS;
let listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let sharedChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureRealtime();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentSettings;
}

function getServerSnapshot() {
  return DEFAULT_SETTINGS;
}

function ensureRealtime() {
  if (sharedChannel || typeof window === 'undefined') return;
  const supabase = createSupabaseBrowserClient();
  sharedChannel = supabase
    .channel('public-settings-shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
      void refresh();
    })
    .subscribe();
}

async function refresh() {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['general', 'shipping', 'social']);
    const map: Record<string, unknown> = {};
    (data || []).forEach((row: any) => { map[row.key] = row.value; });

    currentSettings = {
      general: mergeSettingsWithDefaults<GeneralSettings>(map.general, { ...DEFAULT_GENERAL }),
      shipping: mergeSettingsWithDefaults<ShippingSettings>(map.shipping, { ...DEFAULT_SHIPPING }),
      social: mergeSettingsWithDefaults<SocialSettings>(map.social, { ...DEFAULT_SOCIAL }),
    };
    emit();
  } catch {
    // keep defaults on failure
  }
}

function load() {
  if (!loadingPromise) {
    loadingPromise = refresh();
  }
  return loadingPromise;
}

/**
 * Storefront-safe settings hook used by Footer / Navbar / checkout.
 * All consumers share a single fetch and a single realtime subscription,
 * so mounting Navbar + Footer + FloatingActions costs ONE database read
 * instead of one per component.
 */
export function usePublicSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void load();
  }, []);

  const refreshSettings = useCallback(async () => {
    loadingPromise = refresh();
    await loadingPromise;
  }, []);

  return {
    settings,
    loaded: loadingPromise !== null && currentSettings !== DEFAULT_SETTINGS,
    refresh: refreshSettings,
  };
}
