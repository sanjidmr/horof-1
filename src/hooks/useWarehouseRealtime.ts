'use client';

import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subscribe to warehouse assignment changes for a specific warehouse.
 * Reacts to: warehouse_assignments (orders only), orders, products,
 * warehouse_activity_logs, and notifications — so the warehouse dashboard
 * updates instantly.
 *
 * NOTE: warehouse_assignments is EXCLUSIVELY for order management.
 * Products use their own warehouse fields (default_warehouse_id).
 *
 * Production-safe:
 * - Unique channel name per hook instance (prevents duplicate channel errors)
 * - All postgres_changes callbacks registered BEFORE .subscribe()
 * - Proper cleanup on unmount (prevents memory leaks)
 */
export function useWarehouseRealtime(
  supabase: SupabaseClient | null | undefined,
  warehouseId: string | null | undefined,
  onAnyChange: () => void
): void {
  const onChangeRef = useRef(onAnyChange);
  onChangeRef.current = onAnyChange;

  // Unique channel name per hook instance to prevent duplicate channel errors
  // when the same warehouse has multiple components subscribing simultaneously.
  const channelNameRef = useRef<string>(
    `warehouse-sync-${warehouseId || 'none'}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (!supabase || !warehouseId) return;

    let isMounted = true;
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warehouse_assignments',
          filter: `warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) onChangeRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warehouse_activity_logs',
          filter: `warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) onChangeRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warehouse_packing_files',
          filter: `warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) onChangeRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) onChangeRef.current();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, warehouseId]);
}

/**
 * Subscribe to order changes relevant to a warehouse (syncs order status).
 */
export function useWarehouseOrdersRealtime(
  supabase: SupabaseClient | null | undefined,
  warehouseId: string | null | undefined,
  onInvalidate: () => void
): void {
  const invalidateRef = useRef(onInvalidate);
  invalidateRef.current = onInvalidate;

  // Unique channel name per hook instance.
  const channelNameRef = useRef<string>(
    `warehouse-orders-${warehouseId || 'none'}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (!supabase || !warehouseId) return;

    let isMounted = true;
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) invalidateRef.current();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, warehouseId]);
}

/**
 * Subscribe to product changes relevant to a warehouse.
 */
export function useWarehouseProductsRealtime(
  supabase: SupabaseClient | null | undefined,
  warehouseId: string | null | undefined,
  onInvalidate: () => void
): void {
  const invalidateRef = useRef(onInvalidate);
  invalidateRef.current = onInvalidate;

  // Unique channel name per hook instance.
  const channelNameRef = useRef<string>(
    `warehouse-products-${warehouseId || 'none'}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (!supabase || !warehouseId) return;

    let isMounted = true;
    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `default_warehouse_id=eq.${warehouseId}`,
        },
        () => {
          if (isMounted) invalidateRef.current();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, warehouseId]);
}