'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BundleOfferType } from '@/types/database';
import { revalidatePath } from 'next/cache';

export type BundleOfferRow = {
  id: string;
  name: string;
  description: string | null;
  type: BundleOfferType;
  buy_product_id: string | null;
  buy_quantity: number;
  get_product_id: string | null;
  get_quantity: number;
  get_discount_percent: number;
  fixed_price_products: string[];
  fixed_price_total: number | null;
  bundle_discount_percent: number | null;
  combination_products: string[];
  combination_discount_amount: number | null;
  applicable_products: string[];
  applicable_categories: string[];
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  per_user_limit: number;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listBundleOffers(): Promise<BundleOfferRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('bundle_offers')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  return (data as BundleOfferRow[]) || [];
}

export async function saveBundleOffer(
  offer: Partial<BundleOfferRow> & { name: string; type: BundleOfferType }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('system.disabled');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const payload = { ...offer };
  if (payload.id) {
    const { error } = await supabase
      .from('bundle_offers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/bundle-offers');
    return { ok: true, id: payload.id };
  }
  const { id, ...insert } = payload;
  const { data, error } = await supabase
    .from('bundle_offers')
    .insert(insert)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/bundle-offers');
  return { ok: true, id: data.id };
}

export async function toggleBundleOffer(
  id: string, is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('system.disabled');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { error } = await supabase
    .from('bundle_offers')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/bundle-offers');
  return { ok: true };
}

export async function deleteBundleOffer(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('system.disabled');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { error } = await supabase.from('bundle_offers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/bundle-offers');
  return { ok: true };
}

export type BundleDiscountResult = {
  discount: number;
  offerName: string;
  offerId: string;
  description: string;
} | null;

export async function findBestBundleDiscount(
  productIds: string[],
  subtotal: number,
  userId?: string
): Promise<BundleDiscountResult> {
  if (!productIds.length || subtotal <= 0) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data: offers } = await supabase
    .from('bundle_offers')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order('priority', { ascending: false });

  if (!offers || offers.length === 0) return null;

  const raw = offers as BundleOfferRow[];
  let best: BundleDiscountResult = null;

  for (const offer of raw) {
    if (offer.max_uses !== null && offer.used_count >= offer.max_uses) continue;
    if (subtotal < offer.min_subtotal) continue;

    let discount = 0;
    let eligible = false;

    if (offer.type === 'percent_discount') {
      if (offer.bundle_discount_percent) {
        const hasApplicable = offer.applicable_products.length === 0 ||
          productIds.some((pid) => offer.applicable_products.includes(pid));
        const hasCategories = offer.applicable_categories.length === 0;
        if (hasApplicable && hasCategories) {
          discount = (subtotal * offer.bundle_discount_percent) / 100;
          eligible = discount > 0;
        }
      }
    } else if (offer.type === 'buy_x_get_y') {
      if (offer.buy_product_id && offer.get_product_id) {
        const hasBuy = productIds.includes(offer.buy_product_id);
        const hasGet = productIds.includes(offer.get_product_id);
        if (hasBuy && hasGet) {
          const buyCount = productIds.filter((pid) => pid === offer.buy_product_id).length;
          if (buyCount >= offer.buy_quantity) {
            discount = subtotal * (offer.get_discount_percent / 100) * 0.3;
            eligible = discount > 0;
          }
        }
      }
    } else if (offer.type === 'fixed_price') {
      if (offer.fixed_price_total && offer.fixed_price_products.length > 0) {
        const allPresent = offer.fixed_price_products.every((pid) =>
          productIds.includes(pid)
        );
        if (allPresent) {
          discount = Math.max(0, subtotal - offer.fixed_price_total);
          eligible = discount > 0;
        }
      }
    } else if (offer.type === 'product_combination') {
      if (offer.combination_discount_amount && offer.combination_products.length > 0) {
        const allPresent = offer.combination_products.every((pid) =>
          productIds.includes(pid)
        );
        if (allPresent) {
          discount = Math.min(offer.combination_discount_amount, subtotal);
          eligible = discount > 0;
        }
      }
    }

    if (eligible && discount > 0) {
      const candidate: BundleDiscountResult = {
        discount,
        offerName: offer.name,
        offerId: offer.id,
        description: offer.description || offer.name,
      };
      if (!best || candidate.discount > best.discount) {
        best = candidate;
      }
    }
  }

  return best;
}
