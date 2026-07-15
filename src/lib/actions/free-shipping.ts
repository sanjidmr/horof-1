'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type FreeShippingRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  min_order_amount: number;
  coupon_code: string | null;
  applicable_products: string[];
  applicable_categories: string[];
  applicable_districts: string[];
  exclude_districts: string[];
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
};

export async function listFreeShippingOffers(): Promise<FreeShippingRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('free_shipping_offers')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  return (data as FreeShippingRow[]) || [];
}

export async function saveFreeShippingOffer(
  offer: Partial<FreeShippingRow> & { name: string }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const payload = { ...offer };
  if (payload.id) {
    const { error } = await supabase
      .from('free_shipping_offers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/free-shipping');
    return { ok: true, id: payload.id };
  }
  const { id, ...insert } = payload;
  const { data, error } = await supabase
    .from('free_shipping_offers')
    .insert(insert)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/free-shipping');
  return { ok: true, id: data.id };
}

export async function toggleFreeShippingOffer(
  id: string, is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase
    .from('free_shipping_offers')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/free-shipping');
  return { ok: true };
}

export async function deleteFreeShippingOffer(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase.from('free_shipping_offers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/free-shipping');
  return { ok: true };
}

export type FreeShippingCheckResult = {
  eligible: boolean;
  offerName: string;
  offerId: string;
  description: string | null;
} | null;

export async function checkFreeShippingEligibility(
  subtotal: number,
  district: string,
  appliedCouponCode?: string | null
): Promise<FreeShippingCheckResult> {
  if (subtotal <= 0) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data: offers } = await supabase
    .from('free_shipping_offers')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order('priority', { ascending: false });

  if (!offers || offers.length === 0) return null;

  const raw = offers as FreeShippingRow[];
  for (const offer of raw) {
    if (subtotal < offer.min_order_amount) continue;
    if (offer.coupon_code && appliedCouponCode !== offer.coupon_code) continue;
    if (offer.applicable_districts.length > 0 && !offer.applicable_districts.includes(district)) continue;
    if (offer.exclude_districts.length > 0 && offer.exclude_districts.includes(district)) continue;

    return {
      eligible: true,
      offerName: offer.name,
      offerId: offer.id,
      description: offer.description,
    };
  }

  return null;
}
