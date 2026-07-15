'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { productFormSchema, rowsToSpecification, type ProductFormParsed } from '@/lib/validation/product-form';
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

function buildPayload(d: ProductFormParsed, firstImageUrl: string, allImageUrls: string[]) {
  const specObj = rowsToSpecification(d.specification ?? []);
  const perfectForStr = (d.perfect_for_str ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');

  return {
    name: d.name.trim(),
    slug: (d.slug || autoSlug(d.name)).trim().toLowerCase(),
    price: d.price,
    compare_price: d.offer_price ?? null,
    stock: d.stock,
    description: d.description?.trim() || '',
    image: firstImageUrl,
    images: allImageUrls,
    specification: specObj,
    perfect_for: perfectForStr || null,
    is_best_selling: d.is_best_selling,
    is_new_arrival: d.is_new_arrival,
    is_product_of_the_day: d.is_product_of_the_day,
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
        enabled: d.order_config?.design_charge?.enabled ?? false,
        amount: d.order_config?.design_charge?.amount ?? 0,
        description: d.order_config?.design_charge?.description ?? '',
      },
      customer_notes_settings: {
        enabled: d.order_config?.customer_notes_settings?.enabled ?? false,
        title: d.order_config?.customer_notes_settings?.title ?? 'Specification Need Details',
        placeholder: d.order_config?.customer_notes_settings?.placeholder ?? '',
      },
      pricing_config: {
        min_order_qty: d.order_config?.pricing_config?.min_order_qty ?? 1,
        max_order_qty: d.order_config?.pricing_config?.max_order_qty ?? null,
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

    if (upErr) {
      if (upErr.code === '23505') return { ok: false, message: 'Slug already exists' };
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

    // Check for low stock (non-fatal)
    try { await checkLowStock(); } catch (_) {}

    return { ok: true, id: String(d.id) };
  }

  const { data: inserted, error: insErr } = await supabase.from('products').insert(payload).select('id').single();

  if (insErr || !inserted) {
    if (insErr?.code === '23505') return { ok: false, message: 'Slug already exists' };
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

  // Create notification (non-fatal)
  try {
    await createNotification(
      'New Product Added',
      `Product "${payload.name}" has been added to the store.`,
      'product'
    );
  } catch (_) {}

  // Check for low stock (non-fatal)
  try { await checkLowStock(); } catch (_) {}

  return { ok: true, id: String(pid) };
}
