'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveSiteSetting(key: string, value: unknown): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin only' };

  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) return { ok: false, message: error.message };

  revalidatePath('/admin/marketing/pixel');
  revalidatePath('/admin/marketing/analytics');
  return { ok: true };
}

export async function getSiteSetting(key: string): Promise<unknown> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}
