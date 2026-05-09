'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { DbProductRow, DbWishlistRow } from '../../../lib/dashboard/types';
import { mapDbProductToProduct } from '../../../lib/dashboard/mapProduct';
import type { Product } from '../../../lib/types';
import { formatPrice } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';

export default function DashboardWishlistPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<Array<{ wl: DbWishlistRow; product: Product | null }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from('wishlist')
        .select('id,user_id,product_id,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const wl = (rows ?? []) as DbWishlistRow[];

      const ids = [...new Set(wl.map((w) => w.product_id).filter(Boolean))];

      let byId = new Map<string, DbProductRow>();

      if (ids.length) {
        const { data: prod, error: pe } = await supabase
          .from('products')
          .select('id,name,price,images')
          .in('id', ids);
        if (!pe && prod) {
          byId = new Map((prod as DbProductRow[]).map((p) => [String(p.id), p]));
        }
      }

      setItems(
        wl.map((row) => {
          const prodRow = byId.get(row.product_id);
          return {
            wl: row,
            product: prodRow ? mapDbProductToProduct(prodRow) : null,
          };
        })
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeRow = async (rowId: string) => {
    if (!supabase) return toast.error('Supabase not configured');
    const prev = [...items];

    try {
      setItems((curr) => curr.filter((entry) => entry.wl.id !== rowId));

      const { error } = await supabase.from('wishlist').delete().eq('id', rowId);
      if (error) throw error;
      toast.success('Removed from saved list');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove wishlist row';
      setItems(prev);
      toast.error(message);
    }
  };

  const handleAddToCart = (product: Product) => {
    try {
      addToCart(product, 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to update cart');
    }
  };

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-10 text-center text-sm font-semibold text-text-secondary shadow-xl shadow-accent-primary/5">
        Supabase credentials are missing — wishlist syncing is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
        <div className="flex items-center gap-3 text-accent-primary">
          <Heart className="h-6 w-6 text-gold" />
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-secondary">
            Boutique · Saves
          </p>
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-accent-primary">
          Wishlisted decor
        </h1>
        <p className="mt-3 max-w-xl text-sm text-text-secondary">
          Curate pieces quietly, then glide them straight into checkout when timing feels perfect.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-[2rem] border border-border-forest bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[2.5rem] border border-border-forest bg-white p-14 text-center text-sm font-medium text-text-secondary shadow-xl shadow-accent-primary/5">
          Hearts are patiently waiting — visit the storefront and preserve your favorites here.
          <div className="mt-8 flex justify-center">
            <Link href="/products">
              <Button className="rounded-2xl">Browse shop</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ wl, product }) => {
            if (!product) {
              return (
                <div key={wl.id} className="rounded-[2rem] border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
                  <p className="text-sm font-semibold text-accent-primary">Product unavailable offline</p>
                  <Button variant="ghost" className="mt-6 rounded-xl" onClick={() => removeRow(wl.id)}>
                    Remove stale entry
                  </Button>
                </div>
              );
            }

            const img = product.images?.[0];
            const priceShown = formatPrice(product.discountPrice ?? product.price);

            return (
              <article
                key={wl.id}
                className="flex flex-col overflow-hidden rounded-[2rem] border border-border-forest bg-white shadow-xl shadow-accent-primary/5"
              >
                <Link href={`/products/${product.id}`}>
                  <div className="relative aspect-[5/6] bg-bg-secondary">
                    {img ? (
                      <img src={img} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col justify-end p-6 text-accent-primary font-display font-bold italic">
                        {product.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex flex-col gap-4 p-7">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-accent-primary">{product.name}</h2>
                    <p className="mt-2 font-display text-xl font-bold text-gold">{priceShown}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button className="flex-1 rounded-2xl" onClick={() => handleAddToCart(product)}>
                      Add to cart
                    </Button>
                    <Button variant="danger" className="flex-1 rounded-2xl" onClick={() => removeRow(wl.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
