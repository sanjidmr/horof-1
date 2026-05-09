'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Package, Heart, Wallet, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { fetchOrdersWithItemsForUser, summarizeOrders } from '../../lib/dashboard/fetchOrders';
import type { OrderWithItems } from '../../lib/dashboard/types';
import { normalizeOrderStatus } from '../../lib/dashboard/types';
import { orderRowTotal } from '../../lib/dashboard/orderHelpers';
import { fetchProfileForUser } from '../../lib/dashboard/fetchProfile';
import type { DbProductRow, DbProfileRow } from '../../lib/dashboard/types';
import { mapDbProductToProduct } from '../../lib/dashboard/mapProduct';
import { getRecentProductIds } from '../../lib/recentlyViewed';
import { useOrdersRealtime } from '../../hooks/useOrdersRealtime';
import { formatPrice, cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { OrderStatusBadge } from '../../components/dashboard/OrderStatusBadge';
import type { Product } from '../../lib/types';

function displayName(profile: DbProfileRow | null, fallbackEmail?: string | null): string {
  const fn = profile?.first_name?.trim();
  const ln = profile?.last_name?.trim();
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ');
  return fallbackEmail?.split('@')[0] ?? 'there';
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<DbProfileRow | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const wlResp = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const [prof, fetchedOrders] = await Promise.all([
        fetchProfileForUser(supabase, user.id),
        fetchOrdersWithItemsForUser(supabase, user.id),
      ]);

      setProfile(prof);
      setWishlistCount(wlResp.error ? 0 : wlResp.count ?? 0);
      setOrders(fetchedOrders ?? []);

      const recentIds = getRecentProductIds().slice(0, 4).filter(Boolean);
      if (!recentIds.length) {
        setRecentProducts([]);
        return;
      }

      const { data: rp, error: re } = await supabase
        .from('products')
        .select('id,name,price,images')
        .in('id', recentIds);

      if (!re && rp) {
        const byId = new Map<string, DbProductRow>(
          rp.map((row: DbProductRow) => [String(row.id), row as DbProductRow])
        );
        const ordered = recentIds
          .map((id) => byId.get(id))
          .filter((x): x is DbProductRow => !!x)
          .map((row) => mapDbProductToProduct(row));
        setRecentProducts(ordered);
      }
    } catch {
      /* table / RLS issues — dashboard still renders with empty totals */
      setWishlistCount(0);
      setOrders([]);
      setRecentProducts([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useOrdersRealtime(supabase, user?.id, () => void load());

  const { totalOrders, pendingOrders, totalSpent, recentFive } = useMemo(() => summarizeOrders(orders), [orders]);

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-8 text-center shadow-xl shadow-accent-primary/5">
        <p className="font-display text-xl font-bold text-accent-primary">Supabase unavailable</p>
        <p className="mt-3 text-sm text-text-secondary">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> then restart dev.
        </p>
      </div>
    );
  }

  const welcome = displayName(profile, user?.email);

  const statTiles = [
    {
      title: 'Total Orders',
      value: String(totalOrders),
      icon: Package,
      tone: 'text-accent-primary',
    },
    {
      title: 'Pending Orders',
      value: String(pendingOrders),
      icon: Clock,
      tone: 'text-gold',
    },
    {
      title: 'Wishlist Items',
      value: String(wishlistCount),
      icon: Heart,
      tone: 'text-accent-primary',
    },
    {
      title: 'Total Spent',
      value: formatPrice(totalSpent),
      icon: Wallet,
      tone: 'text-gold',
    },
  ] as const;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-secondary">
            Customer dashboard
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-accent-primary md:text-4xl">
            Welcome back,{' '}
            <span className="italic text-gold">{welcome}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            Track orders, curate wishlists, and manage your Horof shopping profile in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/orders">
            <Button className="rounded-2xl">View orders</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="rounded-2xl">
              Browse decor
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statTiles.map(({ title, value, icon: Icon, tone }) => (
          <div
            key={title}
            className="rounded-3xl border border-border-forest bg-white p-6 shadow-xl shadow-accent-primary/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={cn('rounded-2xl bg-bg-secondary p-3', tone)}>
                <Icon className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-8 flex-1 animate-pulse rounded-lg bg-bg-secondary" />
              ) : (
                <p className="font-display text-3xl font-bold text-accent-primary">{value}</p>
              )}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary">{title}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,360px]">
        <div className="rounded-3xl border border-border-forest bg-white p-6 shadow-xl shadow-accent-primary/5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-accent-primary">Recent Orders</h2>
              <p className="text-sm text-text-secondary">Latest five placements</p>
            </div>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-gold hover:underline"
            >
              All orders <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-bg-secondary" />)}</div>
          ) : recentFive.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                    <th className="pb-4 pr-4">Order ID</th>
                    <th className="pb-4 pr-4">Date</th>
                    <th className="pb-4 pr-4">Status</th>
                    <th className="pb-4 pr-4 text-right">Total</th>
                    <th className="pb-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-forest">
                  {recentFive.map((o) => {
                    const st = normalizeOrderStatus(o.status);
                    return (
                      <tr key={o.id}>
                        <td className="py-4 font-mono text-xs text-accent-primary">{o.id}</td>
                        <td className="py-4 text-sm text-text-secondary">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <OrderStatusBadge status={st} />
                        </td>
                        <td className="py-4 text-right font-display text-sm font-bold text-gold">
                          {formatPrice(orderRowTotal(o))}
                        </td>
                        <td className="py-4 text-right">
                          <Link href={`/dashboard/orders?order=${encodeURIComponent(o.id)}`}>
                            <Button variant="ghost" size="sm" className="rounded-xl text-accent-primary hover:text-accent-hover normal-case tracking-normal font-semibold">
                              View details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl bg-bg-secondary p-8 text-center text-sm font-medium text-text-secondary">
              No orders yet — start styling your spaces with handcrafted decor.
              <div className="mt-6 flex justify-center">
                <Link href="/products">
                  <Button className="rounded-2xl">Discover products</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border-forest bg-white p-6 shadow-xl shadow-accent-primary/5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-accent-primary">Wishlist peek</h2>
            <Link href="/dashboard/wishlist" className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold hover:underline">
              Open
            </Link>
          </div>
          {wishlistCount ? (
            <>
              <p className="text-sm text-text-secondary">
                You have <strong className="text-accent-primary">{wishlistCount}</strong> cherished pieces saved.
              </p>
              <Link href="/dashboard/wishlist">
                <Button variant="outline" className="mt-6 w-full rounded-2xl">
                  Manage wishlist
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              Hearts are empty — explore the boutique and tap the wishlist icons to curate inspirations.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-border-forest bg-white p-6 shadow-xl shadow-accent-primary/5">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-accent-primary">Recently viewed</h2>
            <p className="text-sm text-text-secondary">Pieces you admired last on the storefront</p>
          </div>
          <Link href="/products">
            <Button variant="outline" className="rounded-2xl self-start sm:self-auto">
              Keep exploring
            </Button>
          </Link>
        </div>

        {recentProducts.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-forest">
            {recentProducts.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="flex w-[210px] shrink-0 gap-4 rounded-2xl border border-border-forest bg-bg-secondary p-4 shadow-inner transition-all hover:border-accent-primary"
              >
                <div className="h-20 w-16 overflow-hidden rounded-xl bg-white">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-accent-primary">
                      Horof
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-semibold uppercase tracking-wide text-accent-primary">{p.name}</p>
                  <p className="mt-3 font-display text-sm font-bold text-gold">{formatPrice(p.discountPrice ?? p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            Wander through handcrafted categories — viewed items populate here automatically during your showroom visits.
          </p>
        )}
      </section>
    </div>
  );
}
