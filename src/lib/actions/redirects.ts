'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type RedirectRow = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  hit_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listRedirects(): Promise<RedirectRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('redirects')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as RedirectRow[]) || [];
}

export async function saveRedirect(redirect: Partial<RedirectRow> & { from_path: string; to_path: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  if (redirect.id) {
    const { error } = await supabase
      .from('redirects')
      .update({ ...redirect, updated_at: new Date().toISOString() })
      .eq('id', redirect.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/redirects');
    return { ok: true, id: redirect.id };
  }

  const { id, ...insert } = redirect;
  const { data, error } = await supabase
    .from('redirects')
    .insert(insert)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/redirects');
  return { ok: true, id: data.id };
}

export async function deleteRedirect(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };
  const { error } = await supabase.from('redirects').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/redirects');
  return { ok: true };
}

export async function toggleRedirect(id: string, is_active: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };
  const { error } = await supabase.from('redirects').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/redirects');
  return { ok: true };
}

export async function findRedirect(path: string): Promise<{ to: string; status: number } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const { data } = await supabase
    .from('redirects')
    .select('to_path, status_code, hit_count')
    .eq('from_path', cleanPath)
    .eq('is_active', true)
    .maybeSingle();
  
  if (data) {
    // Increment hit count asynchronously (fire and forget)
    void (async () => {
      try {
        await supabase.from('redirects').update({ hit_count: (data.hit_count || 0) + 1, updated_at: new Date().toISOString() }).eq('from_path', cleanPath);
      } catch {}
    })();
    return { to: data.to_path, status: data.status_code };
  }
  return null;
}

export async function importRedirects(csvData: { from_path: string; to_path: string; status_code?: number }[]): Promise<{ ok: boolean; imported?: number; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };

  const rows = csvData.map(r => ({
    from_path: r.from_path.startsWith('/') ? r.from_path : `/${r.from_path}`,
    to_path: r.to_path.startsWith('/') ? r.to_path : `/${r.to_path}`,
    status_code: r.status_code || 301,
    is_active: true,
  }));

  const { error, count } = await supabase.from('redirects').upsert(rows, { onConflict: 'from_path' });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/redirects');
  return { ok: true, imported: count || rows.length };
}
