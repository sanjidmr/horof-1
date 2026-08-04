'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SubcategoryFormData = {
  id?: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active?: boolean;
};

export async function upsertSubcategory(data: SubcategoryFormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' } as const;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin only' } as const;

  const { requirePermission } = await import('./security');
  try {
    await requirePermission(data.id ? 'subcategories.edit' : 'subcategories.create');
  } catch {
    return { ok: false, message: 'Permission denied' } as const;
  }

  if (data.id) {
    const { error } = await supabase.from('subcategories').update({
      category_id: data.category_id,
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase(),
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    }).eq('id', data.id);

    if (error) {
      if (error.code === '23505') return { ok: false, message: 'Slug already exists in this category' } as const;
      return { ok: false, message: error.message } as const;
    }
  } else {
    const { error } = await supabase.from('subcategories').insert({
      category_id: data.category_id,
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase(),
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });

    if (error) {
      if (error.code === '23505') return { ok: false, message: 'Slug already exists in this category' } as const;
      return { ok: false, message: error.message } as const;
    }
  }

  revalidatePath('/admin/categories');
  revalidatePath('/admin/products/categories');
  revalidatePath('/products');
  return { ok: true } as const;
}

export async function deleteSubcategory(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' } as const;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin only' } as const;

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('subcategories.delete');
  } catch {
    return { ok: false, message: 'Permission denied' } as const;
  }

  const { error } = await supabase.from('subcategories').delete().eq('id', id);
  if (error) return { ok: false, message: error.message } as const;

  revalidatePath('/admin/categories');
  revalidatePath('/admin/products/categories');
  revalidatePath('/products');
  return { ok: true } as const;
}

export async function reorderSubcategories(items: { id: string; sort_order: number }[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' } as const;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' } as const;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin only' } as const;

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('subcategories.edit');
  } catch {
    return { ok: false, message: 'Permission denied' } as const;
  }

  for (const item of items) {
    const { error } = await supabase.from('subcategories').update({ sort_order: item.sort_order }).eq('id', item.id);
    if (error) return { ok: false, message: error.message } as const;
  }

  return { ok: true } as const;
}
