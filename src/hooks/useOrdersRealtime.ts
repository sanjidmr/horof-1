'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscribe to order row changes for the signed-in customer.
 *
 * Production-safe:
 * - Unique channel name per hook instance (prevents duplicate channel errors)
 * - All postgres_changes callbacks registered BEFORE .subscribe()
 * - Proper cleanup on unmount (prevents memory leaks)
 */
export function useOrdersRealtime(
  supabase: SupabaseClient | null | undefined,
  userId: string | null | undefined,
  onInvalidate: () => void
): void {
  const invalidateRef = useRef(onInvalidate);
  invalidateRef.current = onInvalidate;

  // Unique channel name per hook instance to prevent duplicate channel errors
  // when the same user has multiple components subscribing simultaneously.
  const channelNameRef = useRef<string>(
    `orders-user-${userId || 'anon'}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (!supabase || !userId) return;

    let isMounted = true;
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        () => {
          if (isMounted) invalidateRef.current();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
}