/**
 * Packing slip data loader — fetches a real order + line items from Supabase
 * and normalizes it into `PackingSlipData` for the template and PDF route.
 */
import type { PackingSlipData, PackingSlipItem } from './template';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from '@/lib/invoice/format';
import { extractProductImages } from '@/lib/store/extract-images';

export async function loadPackingSlipData(
  supabase: any,
  orderId: string
): Promise<PackingSlipData | null> {
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error || !order) return null;

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  // Prefer real order_items rows; fall back to product_details JSONB items.
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, products(name, sku, product_images(url,sort_order)), product_variants(size, color)')
    .eq('order_id', orderId);
  const rawItems = Array.isArray(orderItems) ? orderItems : [];
  const hasItems = rawItems.length > 0;

  const sourceItems: any[] = hasItems ? rawItems : metaItems.length > 0 ? metaItems : [];

  const items: PackingSlipItem[] = sourceItems.map((it: any) => {
    const detail = metaItems.find((d: any) => String(d.product_id) === String(it.product_id));
    const specs = detail?.specifications || detail?.selectedSpecs || it.specifications || it.selectedSpecs || {};
    const note = detail?.customer_notes || detail?.customerNotes || it.customer_notes || '';
    const images = extractProductImages(it.products?.product_images);

    return {
      id: it.id,
      product_id: it.product_id ? String(it.product_id) : null,
      product_name: it.products?.name || detail?.product_name || it.product_name || it.name || 'Product',
      sku: it.products?.sku || detail?.sku || it.sku || '',
      quantity: Number(it.quantity || it.qty || 1),
      specifications: specs && typeof specs === 'object' ? specs : {},
      customer_notes: note || '',
      image_url: images[0] || null,
    };
  });

  const subtotal = Number(order.subtotal || metadata.subtotal || order.total_price || order.amount || 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const discount = Number(metadata.discount || 0);
  const grandTotal = Number(order.total_price || order.amount || 0);

  return {
    orderId: String(order.id),
    orderNumber: order.order_number || String(order.id),
    orderDate: order.created_at,
    orderStatus: orderStatusLabel(order.status),
    paymentMethod: paymentMethodLabel(order.payment_method || 'cod'),
    paymentStatus: paymentStatusLabel(order.payment_status),
    customerName: order.customer_name || 'Valued Customer',
    customerAddress: order.customer_address || '',
    customerPhone: order.customer_phone || '',
    customerEmail: order.customer_email || '',
    courierName: order.courier_name || metadata.courier_name || '',
    trackingNumber: order.tracking_number || metadata.tracking_number || '',
    items,
    subtotal,
    deliveryCharge,
    discount,
    couponCode: metadata.coupon_code || '',
    grandTotal,
    internalNotes: metadata.internal_notes || order.internal_notes || '',
  };
}