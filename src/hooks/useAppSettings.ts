'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';
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

// ---------------------------------------------------------------------------
// Shared store: AdminSidebar, SettingsOverview and any other admin consumer
// share ONE database fetch and ONE realtime channel for the full settings,
// instead of each mounting its own.
// ---------------------------------------------------------------------------

let currentSettings: AppSettings | null = null;
let loading = true;
let error: string | null = null;
let listeners = new Set<() => void>();
let loadingPromise: Promise<void> | null = null;
let sharedChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null = null;

type AppSettingsSnapshot = { settings: AppSettings | null; loading: boolean; error: string | null };

let cachedSnapshot: AppSettingsSnapshot | null = null;

const SERVER_SNAPSHOT: AppSettingsSnapshot = { settings: null, loading: true, error: null };

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

function getSnapshot(): AppSettingsSnapshot {
  if (
    !cachedSnapshot ||
    cachedSnapshot.settings !== currentSettings ||
    cachedSnapshot.loading !== loading ||
    cachedSnapshot.error !== error
  ) {
    cachedSnapshot = { settings: currentSettings, loading, error };
  }
  return cachedSnapshot;
}

function getServerSnapshot(): AppSettingsSnapshot {
  return SERVER_SNAPSHOT;
}

function ensureRealtime() {
  if (sharedChannel || typeof window === 'undefined') return;
  const supabase = createSupabaseBrowserClient();
  sharedChannel = supabase
    .channel('app-settings-shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
      void refresh();
    })
    .subscribe();
}

async function refresh() {
  loading = true;
  emit();
  try {
    const supabase = createSupabaseBrowserClient();
    const keys = ['general', 'shipping', 'notifications', 'email', 'social'];
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', keys);
    const map: Record<string, unknown> = {};
    (data || []).forEach((row: any) => { map[row.key] = row.value; });

    currentSettings = {
      general: mergeSettingsWithDefaults(map.general, { ...DEFAULT_GENERAL }),
      shipping: mergeSettingsWithDefaults(map.shipping, { ...DEFAULT_SHIPPING }),
      notifications: mergeSettingsWithDefaults(map.notifications, { ...DEFAULT_NOTIFICATIONS }),
      email: mergeSettingsWithDefaults(map.email, { ...DEFAULT_EMAIL }),
      social: mergeSettingsWithDefaults(map.social, { ...DEFAULT_SOCIAL }),
    };
    error = null;
  } catch (e: any) {
    error = e.message || 'Failed to load settings';
  } finally {
    loading = false;
    emit();
  }
}

function load() {
  if (!loadingPromise) {
    loadingPromise = refresh();
  }
  return loadingPromise;
}

/**
 * Loads the full app settings (admin) and keeps them in sync in real time.
 * All consumers share a single fetch and a single realtime subscription.
 */
export function useAppSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void load();
  }, []);

  const refreshSettings = useCallback(async () => {
    loadingPromise = refresh();
    await loadingPromise;
  }, []);

  return {
    settings: snapshot.settings,
    loading: snapshot.loading,
    error: snapshot.error,
    refresh: refreshSettings,
  };
}
