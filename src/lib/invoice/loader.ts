/**
 * Invoice data loader — fetches a real order + line items from Supabase and
 * normalizes it into `InvoiceData` for the template, print pages, and PDF route.
 */
import type { InvoiceData, InvoiceItem, InvoicePricing } from './types';
import { computePricing, parseProductDetails } from './pricing';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from './format';

type Row = Record<string, any>;

/** Resolve the best product image URL from all available shapes. */
export function resolveProductImage(product: Row | null | undefined): string | null {
  if (!product) return null;

  const fromRelation = Array.isArray(product.product_images)
    ? [...product.product_images]
        .filter((i: any) => i?.url)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((i: any) => i.url)
    : [];

  const fromImages = Array.isArray(product.images)
    ? product.images.filter((u: any) => typeof u === 'string' && u.length > 0)
    : [];

  const fromSingle = typeof product.image === 'string' && product.image.length > 0 ? [product.image] : [];

  const candidates = [...fromRelation, ...fromImages, ...fromSingle];
  return candidates.find((u: string) => /^https?:\/\//.test(u)) ?? null;
}

export async function loadInvoiceData(
  supabase: any,
  orderId: string
): Promise<InvoiceData | null> {
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error || !order) return null;

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  // Prefer real order_items rows; fall back to product_details JSONB items.
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  const rawItems = Array.isArray(orderItems) ? orderItems : [];
  const hasItems = rawItems.length > 0;

  const sourceItems: any[] = hasItems
    ? rawItems
    : metaItems.length > 0
      ? metaItems
      : [];

  // Enrich with product + variant + category data in batch.
  const productIds = [...new Set(sourceItems.map((it: any) => it.product_id).filter(Boolean))];
  const productsById = new Map<string, Row>();
  if (productIds.length) {
    const { data: products } = await supabase
      .from('products')
      .select(
        'id,name,sku,image,images,offer_price,category_id,product_images(url,sort_order)'
      )
      .in('id', productIds);
    if (products) for (const p of products) productsById.set(String(p.id), p);
  }

  const categoryIds = [...new Set([...productsById.values()].map((p) => p.category_id).filter(Boolean))];
  const categoriesById = new Map<string, string>();
  if (categoryIds.length) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id,name')
      .in('id', categoryIds);
    if (categories) for (const c of categories) categoriesById.set(String(c.id), c.name);
  }

  const variantIds = [...new Set(sourceItems.map((it: any) => it.variant_id).filter(Boolean))];
  const variantsById = new Map<string, Row>();
  if (variantIds.length) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .in('id', variantIds);
    if (variants) for (const v of variants) variantsById.set(String(v.id), v);
  }

  const items: InvoiceItem[] = sourceItems.map((it: any, idx: number) => {
    const product = productsById.get(String(it.product_id));
    const variant = it.variant_id ? variantsById.get(String(it.variant_id)) : null;
    const quantity = Number(it.quantity || it.qty || 1);
    const unitPrice =
      Number(it.unit_price ?? it.unitPrice ?? it.price ?? product?.offer_price ?? product?.price ?? 0);
    const designCharge = Number(it.design_charge ?? it.designCharge ?? it.design_charge ?? 0);

    // Variant details: from product_variants row or the product_details specifications.
    const variantMap: Record<string, string> = {};
    if (variant) {
      if (variant.size) variantMap['Size'] = String(variant.size);
      if (variant.color) variantMap['Color'] = String(variant.color);
    }
    const specs = it.specifications || it.selectedSpecs || {};
    if (specs && typeof specs === 'object') {
      for (const [k, v] of Object.entries(specs)) {
        if (v !== null && v !== undefined && v !== '') variantMap[k] = String(v);
      }
    }

    return {
      productId: it.product_id ? String(it.product_id) : null,
      name: it.product_name || it.name || product?.name || 'Artisan Piece',
      sku: product?.sku || it.sku || '',
      category: categoriesById.get(String(product?.category_id)) || it.category || '',
      variant: variantMap,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      designCharge: Number.isFinite(designCharge) ? designCharge : 0,
      lineTotal: Number.isFinite(unitPrice) && quantity > 0 ? unitPrice * quantity + designCharge : 0,
      imageUrl: resolveProductImage(product),
    };
  });

  // Recompute subtotal from real items to cross-check the stored value.
  const pricing: InvoicePricing = computePricing(order, items);

  const invoiceNumber = order.invoice_number || (order.order_number ? `INV-${order.order_number}` : `INV-${String(order.id)}`);

  return {
    invoiceNumber,
    orderId: String(order.id),
    orderNumber: order.order_number || String(order.id),
    orderDate: order.created_at,
    invoiceDate: new Date().toISOString(),
    statuses: {
      orderStatus: orderStatusLabel(order.status),
      paymentStatus: paymentStatusLabel(order.payment_status),
    },
    customer: {
      name: order.customer_name || 'Valued Customer',
      email: order.customer_email || '',
      phone: order.customer_phone || '',
      address: order.customer_address || '',
    },
    shipping: {
      name: order.customer_name || 'Valued Customer',
      address: order.customer_address || '',
    },
    payment: {
      method: paymentMethodLabel(order.payment_method || 'cod'),
      status: paymentStatusLabel(order.payment_status),
      transactionId: order.transaction_id || order.val_id || null,
    },
    fulfillment: {
      courier: order.courier_name || '',
      tracking: order.tracking_number || '',
      estimatedDelivery: order.estimated_delivery || null,
    },
    items,
    pricing,
    notes: {
      customer: metadata.customer_notes || order.notes || '',
      internal: metadata.internal_notes || order.internal_notes || '',
    },
    trackingUrl: `/track-order?order=${encodeURIComponent(order.order_number || String(order.id))}`,
  };
}

/** Pure check: is this user an admin (or warehouse staff) who can view any invoice? */
export async function canManageInvoices(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_warehouse_staff')
    .eq('id', userId)
    .single();
  return Boolean(profile && (profile.role === 'admin' || profile.is_warehouse_staff === true));
}
