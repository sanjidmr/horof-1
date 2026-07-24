'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createNotification, checkLowStock } from './notifications';

export async function placeOrder(orderData: {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  delivery_charge: number;
  delivery_type: string;
  total: number;
  coupon_id?: string;
  coupon_code?: string;
  coupon_discount?: number;
  bundle_discount?: number;
  bundle_offer_id?: string;
  bundle_offer_name?: string;
  free_shipping_offer_id?: string;
  free_shipping_offer_name?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    name: string;
    selectedSpecs?: Record<string, string>;
    designCharge?: number;
    customerNotes?: string;
    originalPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    finalTotal?: number;
  }[];
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: 'Unauthorized. Please login first to place an order.' };
  }

  const summaryName = orderData.items.length === 1
    ? orderData.items[0].name
    : `${orderData.items[0].name} & ${orderData.items.length - 1} other${orderData.items.length > 2 ? 's' : ''}`;

  const totalQty = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalDiscount = (orderData.coupon_discount || 0) + (orderData.bundle_discount || 0);
  const finalTotal = orderData.total;

  const { data: orderRequest, error: requestErr } = await supabase
    .from('order_requests')
    .insert({
      product_id: orderData.items.length === 1 ? orderData.items[0].product_id : null,
      product_name: summaryName,
      user_id: user.id,
      customer_info: {
        name: orderData.customer_name,
        email: orderData.customer_email,
        phone: orderData.customer_phone,
        address: orderData.customer_address,
        items: orderData.items,
        delivery_charge: orderData.delivery_charge,
        delivery_type: orderData.delivery_type,
        coupon_code: orderData.coupon_code || null,
        coupon_discount: orderData.coupon_discount || 0,
        bundle_discount: orderData.bundle_discount || 0,
        bundle_offer_name: orderData.bundle_offer_name || null,
        free_shipping_offer_name: orderData.free_shipping_offer_name || null,
      },
      selected_specifications: {},
      quantity: totalQty,
      discount_percent: 0,
      discount_amount: 0,
      coupon_discount: totalDiscount,
      coupon_id: orderData.coupon_id || null,
      coupon_code: orderData.coupon_code || null,
      design_charge: 0,
      customer_notes: [orderData.free_shipping_offer_name ? `Free Shipping: ${orderData.free_shipping_offer_name}` : null, orderData.bundle_offer_name ? `Bundle: ${orderData.bundle_offer_name}` : null].filter(Boolean).join('; ') || null,
      final_total_price: Math.max(0, finalTotal),
      status: 'pending'
    })
    .select('id')
    .single();

  if (requestErr || !orderRequest) {
    return { ok: false, message: requestErr?.message || 'Failed to submit order request' };
  }

  // Record coupon usage if a coupon was applied
  if (orderData.coupon_id) {
    try {
      await supabase.from('coupon_usage').insert({
        coupon_id: orderData.coupon_id,
        user_id: user.id,
        order_request_id: orderRequest.id,
      });
      await supabase.rpc('increment_coupon_used_count', { p_coupon_id: orderData.coupon_id });
    } catch (err) {
      console.error('Failed to record coupon usage:', err);
    }
  }

  // Reserve stock for each item
  for (const item of orderData.items) {
    try {
      const { data: product } = await supabase.from('products').select('stock, reserved_stock').eq('id', item.product_id).single();
      if (product) {
        const qty = Math.min(item.quantity, product.stock - product.reserved_stock);
        if (qty > 0) {
          await supabase.from('products').update({
            reserved_stock: (product.reserved_stock || 0) + qty
          }).eq('id', item.product_id);

          await supabase.from('inventory_reservations').insert({
            product_id: item.product_id,
            quantity: qty,
            order_request_id: orderRequest.id,
            status: 'active',
          });

          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            movement_type: 'reservation',
            quantity_change: -qty,
            stock_before: product.stock,
            stock_after: product.stock - qty,
            reference_type: 'order_request',
            reference_id: orderRequest.id,
            notes: `Reserved for order request #${orderRequest.id.substring(0, 8)}`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to reserve stock for item:', item.product_id, err);
    }
  }

  // Clear database cart items
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id);
  } catch (clearCartErr) {
    console.error('Failed to clear database cart items:', clearCartErr);
  }

  await createNotification(
    'New Order Request',
    `A new order request (#${String(orderRequest.id).slice(0, 8)}) for ৳${Math.max(0, finalTotal).toLocaleString()} placed by ${orderData.customer_name}.${orderData.coupon_code ? ` Coupon: ${orderData.coupon_code}` : ''}${orderData.bundle_offer_name ? ` Bundle: ${orderData.bundle_offer_name}` : ''}${orderData.free_shipping_offer_name ? ` Free Shipping: ${orderData.free_shipping_offer_name}` : ''}`,
    'order'
  );

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/order-requests');

  // Check for low stock (non-fatal)
  try { await checkLowStock(); } catch (_) {}

  return { ok: true, orderId: orderRequest.id };
}
