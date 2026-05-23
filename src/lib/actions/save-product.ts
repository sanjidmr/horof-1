'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { productFormSchema, rowsToSpecification, type ProductFormParsed } from '@/lib/validation/product-form';
import { createNotification, checkLowStock } from './notifications';

export type SaveProductResult =
  | { ok: true; id: string }
  | { ok: false; message: string; issues?: { path: (string | number)[]; message: string }[] };

function buildPayload(d: ProductFormParsed) {
  const specObj = rowsToSpecification(d.specification ?? []);
  const perfectFor = (d.perfect_for_str ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const flashEnds =
    d.section === 'flash_sale' && d.flash_sale_ends_at
      ? new Date(d.flash_sale_ends_at).toISOString()
      : null;

  return {
    name: d.name.trim(),
    slug: d.slug.trim().toLowerCase(),
    sku: d.sku.trim(),
    price: d.price,
    offer_price: d.offer_price ?? null,
    stock: d.stock,
    description: d.description?.trim() || null,
    specification: specObj,
    perfect_for: perfectFor,
    section: d.section,
    is_best_selling: d.is_best_selling,
    is_new_arrival: d.is_new_arrival,
    is_product_of_the_day: d.is_product_of_the_day,
    flash_sale_ends_at: flashEnds,
    meta_title: d.meta_title?.trim() || null,
    meta_description: d.meta_description?.trim() || null,
    category_id: d.category_id ?? null,
    brand_id: d.brand_id ?? null,
  };
}

function cleanVariants(d: ProductFormParsed) {
  return (d.variants ?? []).filter(
    (v) => (v.size && v.size.trim()) || (v.color && v.color.trim()) || v.stock !== 0 || v.price_modifier !== 0
  );
}

export async function saveProduct(input: unknown): Promise<SaveProductResult> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Validation failed',
      issues: parsed.error.issues.map((i) => ({
        path: i.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number'),
        message: i.message,
      })),
    };
  }

  const d = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase is not configured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin only' };

  const payload = buildPayload(d);
  const imgs = (d.images ?? []).slice(0, 3);
  const variants = cleanVariants(d);

  if (d.id) {
    const { error: upErr } = await supabase
      .from('products')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', d.id);

    if (upErr) {
      if (upErr.code === '23505') return { ok: false, message: 'SKU or slug already exists' };
      return { ok: false, message: upErr.message };
    }

    await supabase.from('product_images').delete().eq('product_id', d.id);
    for (let i = 0; i < imgs.length; i++) {
      const { error: ie } = await supabase.from('product_images').insert({
        product_id: d.id,
        url: imgs[i].url,
        sort_order: i,
      });
      if (ie) return { ok: false, message: ie.message };
    }

    await supabase.from('product_variants').delete().eq('product_id', d.id);
    for (const v of variants) {
      const { error: ve } = await supabase.from('product_variants').insert({
        product_id: d.id,
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        stock: v.stock,
        price_modifier: v.price_modifier,
      });
      if (ve) return { ok: false, message: ve.message };
    }

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${d.id}/edit`);
    revalidatePath('/products');

    // Check for low stock
    await checkLowStock();

    return { ok: true, id: d.id };
  }

  const { data: inserted, error: insErr } = await supabase.from('products').insert(payload).select('id').single();

  if (insErr || !inserted) {
    if (insErr?.code === '23505') return { ok: false, message: 'SKU or slug already exists' };
    return { ok: false, message: insErr?.message ?? 'Insert failed' };
  }

  const pid = inserted.id as string;

  for (let i = 0; i < imgs.length; i++) {
    const { error: ie } = await supabase.from('product_images').insert({
      product_id: pid,
      url: imgs[i].url,
      sort_order: i,
    });
    if (ie) return { ok: false, message: ie.message };
  }

  for (const v of variants) {
    const { error: ve } = await supabase.from('product_variants').insert({
      product_id: pid,
      size: v.size?.trim() || null,
      color: v.color?.trim() || null,
      stock: v.stock,
      price_modifier: v.price_modifier,
    });
    if (ve) return { ok: false, message: ve.message };
  }

  revalidatePath('/admin/products');
  revalidatePath('/products');

  // Create notification
  await createNotification(
    'New Product Added',
    `Product "${payload.name}" has been added to the store.`,
    'product'
  );

  // Check for low stock
  await checkLowStock();

  return { ok: true, id: pid };
}
