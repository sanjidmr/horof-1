'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscribe to order row changes for the signed-in customer.
 */
export function useOrdersRealtime(
  supabase: SupabaseClient | null | undefined,
  userId: string | null | undefined,
  onInvalidate: () => void
): void {
  const invalidateRef = useRef(onInvalidate);
  invalidateRef.current = onInvalidate;

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        () => invalidateRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
}
