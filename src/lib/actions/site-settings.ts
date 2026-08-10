'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveSiteSetting(key: string, value: unknown): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('settings_center.manage');
  } catch {
    return { ok: false, message: 'Permission denied' };
  }

  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) return { ok: false, message: error.message };

  // Revalidate the canonical admin settings pages that consume site_settings.
  // (The legacy /admin/marketing/analytics and /admin/marketing/pixel routes
  // were superseded by google-analytics / meta-pixel.)
  revalidatePath('/admin/marketing/seo');
  revalidatePath('/admin/marketing/social-media');
  revalidatePath('/admin/marketing/google-analytics');
  revalidatePath('/admin/marketing/meta-pixel');
  return { ok: true };
}

export async function getSiteSetting(key: string): Promise<unknown> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}
