'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { productFormSchema, rowsToSpecification, detailsToObject, type ProductFormParsed } from '@/lib/validation/product-form';
import { createNotification, checkLowStock } from './notifications';

export type SaveProductResult =
  | { ok: true; id: string }
  | { ok: false; message: string; issues?: { path: (string | number)[]; message: string }[] };

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(d: ProductFormParsed, firstImageUrl: string, allImageUrls: string[]) {
  const specObj = rowsToSpecification(d.specification ?? []);
  const detailsObj = detailsToObject(d.product_details ?? []);
  const perfectForStr = (d.perfect_for_tags ?? []).length > 0
    ? (d.perfect_for_tags ?? []).map((s: string) => s.trim()).filter(Boolean).join(', ')
    : (d.perfect_for_str ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');

  return {
    name: d.name.trim(),
    slug: (d.slug || autoSlug(d.name)).trim().toLowerCase(),
    price: toInt(d.price),
    compare_price: toNum(d.offer_price),
    stock: toInt(d.stock),
    is_active: true,
    description: d.description?.trim() || '',
    image: firstImageUrl,
    images: allImageUrls,
    specification: specObj,
    product_details: detailsObj,
    perfect_for: perfectForStr || null,
    is_best_selling: !!d.is_best_selling,
    is_new_arrival: !!d.is_new_arrival,
    is_product_of_the_day: !!d.is_product_of_the_day,
    category_id: d.category_id ?? null,
    subcategory_id: d.subcategory_id ?? null,
    sku: d.sku ?? '',
    section: d.section,
    flash_sale_ends_at: d.section === 'flash_sale' && d.flash_sale_ends_at
      ? new Date(d.flash_sale_ends_at).toISOString()
      : null,
    meta_title: d.meta_title ?? '',
    meta_description: d.meta_description ?? '',
    brand_id: d.brand_id ?? null,
    order_config: {
      quantity_discounts: d.order_config?.quantity_discounts ?? [],
      specification_steps: d.order_config?.specification_steps ?? [],
      design_charge: {
        enabled: !!d.order_config?.design_charge?.enabled,
        amount: toNum(d.order_config?.design_charge?.amount) ?? 0,
        description: d.order_config?.design_charge?.description ?? '',
      },
      customer_notes_settings: {
        enabled: !!d.order_config?.customer_notes_settings?.enabled,
        title: d.order_config?.customer_notes_settings?.title || 'Specification Need Details',
        placeholder: d.order_config?.customer_notes_settings?.placeholder ?? '',
      },
      pricing_config: {
        min_order_qty: toInt(d.order_config?.pricing_config?.min_order_qty),
        max_order_qty: toInt(d.order_config?.pricing_config?.max_order_qty) || null,
      },
      order_request_settings: d.order_config?.order_request_settings ?? {
        enable_order_requests: true,
        enable_add_to_cart: true,
        enable_direct_order: false,
        auto_approval: false,
      },
      display_controls: d.order_config?.display_controls ?? {
        show_discount_table: true,
        show_specifications: true,
        show_customer_notes: true,
        show_quantity_selector: true,
        show_design_charge: true,
        show_total_price: true,
        show_send_request: true,
        show_add_to_cart: true,
      },
    },
  };
}

function cleanVariants(d: ProductFormParsed) {
  return (d.variants ?? []).filter(
    (v) => (v.size && v.size.trim()) || (v.color && v.color.trim()) || v.stock !== 0 || v.price_modifier !== 0
  );
}

const DB_TIMEOUT = 30000;

async function dbInsert<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<{ data: T | null; error: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DB_TIMEOUT);
  try {
    const result = await fn();
    return result;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { data: null, error: { message: 'Database operation timed out. Please try again.' } };
    }
    return { data: null, error: { message: e?.message || 'Unexpected database error' } };
  } finally {
    clearTimeout(timer);
  }
}

function translateDbError(err: { code?: string; message?: string; details?: string } | null): string {
  if (!err) return 'Unknown database error';
  const msg = err.message || '';
  const code = err.code || '';

  if (code === '23505') return 'A product with this slug already exists';
  if (code === '23503') return 'Referenced category, brand, or related record not found';
  if (code === '23502') return `Required field missing: ${msg}`;
  if (code === '22P02') return 'Invalid data format. Check price, stock, or numeric fields';
  if (code === '42P01') return 'Database table not found. Contact support';
  if (code === '42501') return 'Permission denied. You may not have access to perform this action';

  if (/network|timeout|fetch/i.test(msg)) return 'Network error. Check your connection and try again';
  if (/duplicate|unique/i.test(msg)) return 'A product with this name or slug already exists';
  if (/foreign key/i.test(msg)) return 'Referenced record not found (category, brand, etc.)';
  if (/not null/i.test(msg)) return `Required field missing: ${msg}`;

  return msg || 'An unexpected database error occurred';
}

export async function saveProduct(input: unknown): Promise<SaveProductResult> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Form validation failed. Check all required fields.',
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
  if (!user) return { ok: false, message: 'You must be signed in to save products' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false, message: 'Admin access required' };

  const imgs = (d.images ?? []).slice(0, 3);
  const firstImageUrl = imgs[0]?.url || '';
  const allImageUrls = imgs.map((img) => img.url);

  const payload = buildPayload(d, firstImageUrl, allImageUrls);
  const variants = cleanVariants(d);

  if (d.id) {
    const { error: upErr } = await supabase
      .from('products')
      .update(payload)
      .eq('id', d.id);

    if (upErr) return { ok: false, message: translateDbError(upErr) };

    const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', d.id);
    if (delImgErr) return { ok: false, message: translateDbError(delImgErr) };

    for (let i = 0; i < imgs.length; i++) {
      const { error: ie } = await supabase.from('product_images').insert({
        product_id: d.id,
        url: imgs[i].url,
        sort_order: i,
      });
      if (ie) return { ok: false, message: `Image save failed: ${ie.message}` };
    }

    const { error: delVarErr } = await supabase.from('product_variants').delete().eq('product_id', d.id);
    if (delVarErr) return { ok: false, message: translateDbError(delVarErr) };

    for (const v of variants) {
      const { error: ve } = await supabase.from('product_variants').insert({
        product_id: d.id,
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        stock: toInt(v.stock),
        price_modifier: toNum(v.price_modifier) ?? 0,
      });
      if (ve) return { ok: false, message: `Variant save failed: ${ve.message}` };
    }

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${d.id}/edit`);
    revalidatePath('/products');

    try { await checkLowStock(); } catch (_) { }

    return { ok: true, id: String(d.id) };
  }

  const { data: inserted, error: insErr } = await supabase.from('products').insert(payload).select('id').single();

  if (insErr || !inserted) {
    return { ok: false, message: translateDbError(insErr) || 'Failed to create product' };
  }

  const pid = inserted.id as string;

  for (let i = 0; i < imgs.length; i++) {
    const { error: ie } = await supabase.from('product_images').insert({
      product_id: d.id,
      url: imgs[i].url,        // image_url থেকে url করুন
      sort_order: i,
    });
    if (ie) {
      await supabase.from('products').delete().eq('id', pid);
      return { ok: false, message: `Image save failed: ${ie.message}. Product creation rolled back.` };
    }
  }

  for (const v of variants) {
    const { error: ve } = await supabase.from('product_variants').insert({
      product_id: pid,
      size: v.size?.trim() || null,
      color: v.color?.trim() || null,
      stock: toInt(v.stock),
      price_modifier: toNum(v.price_modifier) ?? 0,
    });
    if (ve) {
      await supabase.from('product_images').delete().eq('product_id', pid);
      await supabase.from('products').delete().eq('id', pid);
      return { ok: false, message: `Variant save failed: ${ve.message}. Product creation rolled back.` };
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/products');

  try {
    await createNotification(
      'New Product Added',
      `Product "${payload.name}" has been added to the store.`,
      'product'
    );
  } catch (_) { }

  try { await checkLowStock(); } catch (_) { }

  return { ok: true, id: String(pid) };
}
