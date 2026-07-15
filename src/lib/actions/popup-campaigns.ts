'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PopupType, PopupTrigger, PopupFrequency } from '@/types/database';

export type PopupCampaignRow = {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  popup_type: PopupType;
  trigger_type: PopupTrigger;
  trigger_value: number;
  frequency: PopupFrequency;
  image_url: string | null;
  background_color: string;
  text_color: string;
  button_text: string;
  button_color: string;
  button_text_color: string;
  coupon_code: string | null;
  product_id: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  display_pages: string[];
  display_devices: string[];
  show_to_new_visitors: boolean;
  show_to_returning_visitors: boolean;
  show_to_logged_in: boolean;
  show_to_guests: boolean;
  restricted_countries: string[];
  date_start: string | null;
  date_end: string | null;
  ab_test_enabled: boolean;
  ab_variant_a: Record<string, any> | null;
  ab_variant_b: Record<string, any> | null;
  ab_winner: string | null;
  views: number;
  conversions: number;
  closes: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
};

export async function listPopupCampaigns(): Promise<PopupCampaignRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('popup_campaigns')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  return (data as PopupCampaignRow[]) || [];
}

export async function savePopupCampaign(
  p: Partial<PopupCampaignRow> & { name: string; popup_type: PopupType }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const payload = { ...p };
  if (payload.id) {
    const { error } = await supabase
      .from('popup_campaigns')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/popup-campaigns');
    return { ok: true, id: payload.id };
  }
  const { id, ...insert } = payload;
  const { data, error } = await supabase
    .from('popup_campaigns')
    .insert(insert)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/popup-campaigns');
  return { ok: true, id: data.id };
}

export async function deletePopupCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase.from('popup_campaigns').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/popup-campaigns');
  return { ok: true };
}

export async function togglePopupCampaign(id: string, is_active: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase
    .from('popup_campaigns')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/popup-campaigns');
  return { ok: true };
}

export async function getActivePopups(): Promise<PopupCampaignRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('popup_campaigns')
    .select('*')
    .eq('is_active', true)
    .or(`date_start.is.null,date_start.lte.${now}`)
    .or(`date_end.is.null,date_end.gte.${now}`)
    .order('priority', { ascending: false });
  return (data as PopupCampaignRow[]) || [];
}

export async function recordPopupAction(
  id: string, action: 'view' | 'conversion' | 'close'
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const rpcMap: Record<string, string> = {
    view: 'increment_popup_views',
    conversion: 'increment_popup_conversions',
    close: 'increment_popup_closes',
  };
  const rpcName = rpcMap[action];
  if (!rpcName) return;
  try { await supabase.rpc(rpcName, { popup_id: id }); } catch {}
}
