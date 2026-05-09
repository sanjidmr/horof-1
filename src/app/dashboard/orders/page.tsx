'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Filter } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { fetchOrdersWithItemsForUser } from '../../../lib/dashboard/fetchOrders';
import type { DbAddressRow, OrderWithItems } from '../../../lib/dashboard/types';
import { normalizeOrderStatus } from '../../../lib/dashboard/types';
import type { OrderStatus } from '../../../lib/types';
import { formatPrice } from '../../../lib/utils';
import { orderRowTotal, parseProductImages } from '../../../lib/dashboard/orderHelpers';
import { useOrdersRealtime } from '../../../hooks/useOrdersRealtime';
import { OrderStatusBadge } from '../../../components/dashboard/OrderStatusBadge';
import { OrderDetailModal } from '../../../components/dashboard/OrderDetailModal';
import { downloadInvoiceFile } from '../../../lib/dashboard/invoiceHtml';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

type FilterKey = 'all' | OrderStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function OrdersContent() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [defaultAddressSummary, setDefaultAddressSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState<FilterKey>('all');

  const [detail, setDetail] = useState<OrderWithItems | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: addrRows } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);

      let summary = '';
      if (addrRows?.length) {
        const list = addrRows as DbAddressRow[];
        const defaulted = list.find((a) => a.is_default);
        const pick = defaulted ?? list[0];
        summary = `${pick.address}, ${pick.city} · ${pick.name}`;
      }

      setDefaultAddressSummary(summary);

      const fetched = await fetchOrdersWithItemsForUser(supabase, user.id);
      setOrders(fetched);
    } catch {
      setOrders([]);
      setDefaultAddressSummary('');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useOrdersRealtime(supabase, user?.id, () => void load());

  useEffect(() => {
    const idParam = searchParams?.get('order');

    if (!idParam) {
      setDetail(null);
      setDetailOpen(false);
      return;
    }

    if (orders.length === 0) return;

    const match = orders.find((o) => o.id === idParam) ?? null;

    if (!match) {
      setDetail(null);
      setDetailOpen(false);
      return;
    }

    setDetail(match);
    setDetailOpen(true);
  }, [orders, searchParams]);

  const filtered = useMemo(() => {
    if (filterKey === 'all') return orders;
    return orders.filter((o) => normalizeOrderStatus(o.status) === filterKey);
  }, [filterKey, orders]);

  const openDetail = (order: OrderWithItems) => {
    setDetail(order);
    setDetailOpen(true);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('order', order.id);
    router.replace(`/dashboard/orders?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('order');
    const qs = params.toString();
    router.replace(qs ? `/dashboard/orders?${qs}` : `/dashboard/orders`, { scroll: false });
  };

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-10 text-center text-sm font-semibold text-text-secondary shadow-xl shadow-accent-primary/5">
        Connect Supabase to load your Horof orders.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-secondary flex items-center gap-2">
          <Filter className="h-4 w-4 text-gold" />
          Purchases · Overview
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-accent-primary">My Orders</h1>
        <p className="mt-3 max-w-xl text-sm text-text-secondary">
          Watch status updates instantly — realtime keeps this list aligned with your packing team.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-3xl border border-border-forest bg-white p-3 shadow-xl shadow-accent-primary/5">
        {FILTERS.map(({ key, label }) => {
          const active = filterKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilterKey(key)}
              className={cn(
                'rounded-2xl px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all',
                active
                  ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                  : 'bg-bg-secondary text-accent-primary hover:bg-white'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-[2rem] border border-border-forest bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-border-forest bg-white p-16 text-center text-sm font-medium text-text-secondary shadow-xl shadow-accent-primary/5">
            Nothing in this lane yet — start a new heirloom journey from the storefront.
          </div>
        ) : (
          filtered.map((order) => {
            const status = normalizeOrderStatus(order.status);
            const thumbnailItem = order.items?.[0];
            const thumbs = thumbnailItem?.product?.images ? parseProductImages(thumbnailItem.product.images) : [];
            const thumb = thumbs[0];
            const name = thumbnailItem?.product?.name ?? 'Order items';

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-[2rem] border border-border-forest bg-white shadow-xl shadow-accent-primary/5"
              >
                <div className="flex flex-wrap items-center gap-4 px-6 py-4 text-xs uppercase tracking-[0.3em] text-text-secondary">
                  <span className="font-mono text-[11px] text-accent-primary">{order.id}</span>
                  <span>·</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>

                <div className="grid gap-6 border-t border-border-forest p-6 sm:grid-cols-[140px_1fr] md:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="h-36 overflow-hidden rounded-2xl bg-bg-secondary sm:h-auto">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full min-h-[120px] w-full flex-col justify-center px-6 text-[11px] font-bold uppercase tracking-widest text-accent-primary">
                        {name}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-accent-primary line-clamp-2">{name}</p>
                      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary">
                        {order.items?.length ?? 0} SKU · {status}
                      </p>
                      <div className="mt-4">
                        <OrderStatusBadge status={status} />
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <p className="font-display text-3xl font-bold text-gold">{formatPrice(orderRowTotal(order))}</p>
                      <Button
                        type="button"
                        className="rounded-2xl"
                        variant="outline"
                        onClick={() => openDetail(order)}
                      >
                        View details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <OrderDetailModal
        open={detailOpen}
        order={detail}
        onClose={closeDetail}
        shippingFallback={defaultAddressSummary}
        onDownloadInvoice={(o) => downloadInvoiceFile(o)}
      />
    </div>
  );
}

function OrdersFallback() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-[2rem] border border-border-forest bg-white" />
      ))}
    </div>
  );
}

export default function DashboardOrdersPage() {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <OrdersContent />
    </Suspense>
  );
}
