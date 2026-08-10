'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSettings } from './useAppSettings';
import type { AppSettings } from '@/lib/settings/types';

/**
 * Realtime-aware settings form state.
 *
 * Loads the section value, subscribes to live updates via useAppSettings and
 * applies remote changes automatically when the local form is NOT dirty
 * (i.e. the current admin hasn't started editing yet). This keeps multiple
 * open admin tabs in sync without clobbering in-progress edits.
 */
export function useRealtimeSettingsForm<T>(initial: T, section: keyof AppSettings) {
  const { settings, loading } = useAppSettings();
  const [form, setForm] = useState<T>({ ...initial });
  const [dirty, setDirty] = useState(false);
  const lastSyncedRef = useRef<string>(JSON.stringify(initial));

  useEffect(() => {
    setForm({ ...initial });
    lastSyncedRef.current = JSON.stringify(initial);
    setDirty(false);
  }, [initial]);

  useEffect(() => {
    if (!settings) return;
    const remote = settings[section] as unknown as T | undefined;
    if (!remote) return;
    const snapshot = JSON.stringify(remote);
    if (snapshot === lastSyncedRef.current) return;
    if (!dirty) {
      setForm({ ...remote });
      lastSyncedRef.current = snapshot;
    }
  }, [settings, section, dirty]);

  const set = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setForm((p) => ({ ...p, [field]: value }));
    setDirty(true);
  }, []);

  const markSaved = useCallback(() => {
    setForm((p) => {
      lastSyncedRef.current = JSON.stringify(p);
      return p;
    });
    setDirty(false);
  }, []);

  return { form, set, setForm, dirty, markSaved, loading, live: !dirty };
}
