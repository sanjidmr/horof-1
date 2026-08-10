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
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.view');
  } catch {
    return [];
  }
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
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
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
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.manage');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
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
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.delete');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
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

// An offer's `expires_at` is a calendar day chosen by the admin, so it should
// cover the whole of that day. Rows saved as UTC midnight (older UI) are
// normalized to end-of-day so they don't expire at 06:00 BDT.
function offerExpiresAt(iso: string): number {
  const d = new Date(iso);
  const t = d.getTime();
  const isMidnightUtc =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return isMidnightUtc ? t + 24 * 60 * 60 * 1000 : t;
}

export async function checkFreeShippingEligibility(
  subtotal: number,
  district: string,
  appliedCouponCode?: string | null
): Promise<FreeShippingCheckResult> {
  if (subtotal <= 0) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: offers } = await supabase
    .from('free_shipping_offers')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!offers || offers.length === 0) return null;

  const now = Date.now();
  const raw = offers as FreeShippingRow[];
  for (const offer of raw) {
    if (offer.starts_at && new Date(offer.starts_at).getTime() > now) continue;
    if (offer.expires_at && offerExpiresAt(offer.expires_at) <= now) continue;
    if (subtotal < Number(offer.min_order_amount)) continue;
    if (
      offer.coupon_code &&
      (!appliedCouponCode ||
        appliedCouponCode.trim().toUpperCase() !== offer.coupon_code.trim().toUpperCase())
    ) continue;
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
