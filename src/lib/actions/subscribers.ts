'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

export type SubscriberRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  source: string;
  tags: string[];
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at: string | null;
  unsubscribe_token: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSubscribers(): Promise<SubscriberRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as SubscriberRow[]) || [];
}

export async function saveSubscriber(
  s: Partial<SubscriberRow> & { email: string }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const payload = { ...s };
  if (payload.id) {
    const { error } = await supabase
      .from('subscribers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/subscribers');
    return { ok: true, id: payload.id };
  }
  const { id, ...insert } = payload;
  const { data, error } = await supabase
    .from('subscribers')
    .insert({ ...insert, unsubscribe_token: randomUUID() })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/subscribers');
  return { ok: true, id: data.id };
}

export async function deleteSubscriber(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase.from('subscribers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/subscribers');
  return { ok: true };
}

export async function toggleSubscriber(id: string, is_active: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase
    .from('subscribers')
    .update({ is_active, unsubscribed_at: is_active ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/subscribers');
  return { ok: true };
}

export async function subscribe(email: string, source = 'newsletter', full_name?: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { data: existing } = await supabase.from('subscribers').select('id, is_active').eq('email', email).maybeSingle();
  if (existing) {
    if (!existing.is_active) {
      const { error } = await supabase
        .from('subscribers')
        .update({ is_active: true, unsubscribed_at: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  }
  const { error } = await supabase.from('subscribers').insert({
    email, source, full_name: full_name || null, unsubscribe_token: randomUUID(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/subscribers');
  return { ok: true };
}

export async function unsubscribe(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { error } = await supabase
    .from('subscribers')
    .update({ is_active: false, unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('unsubscribe_token', token);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getSubscriberCountBySegment(segment: string, filter?: Record<string, any>): Promise<number> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;
  let query = supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('is_active', true);
  if (segment === 'subscribers') query = query.eq('source', 'newsletter');
  const { count } = await query;
  return count || 0;
}
