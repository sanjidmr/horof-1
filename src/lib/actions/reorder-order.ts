'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification, checkLowStock } from './notifications';

interface ReorderItem {
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  selectedSpecs?: Record<string, string>;
  customerNotes?: string;
}

export async function reorderOrder(originalOrderId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Please login first' };

  // 1. Fetch the original order with items
  const { data: originalOrder, error: orderErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', originalOrderId)
    .single();

  if (orderErr || !originalOrder) {
    return { ok: false, message: 'Original order not found' };
  }

  // 2. Verify ownership
  if (originalOrder.user_id !== user.id && originalOrder.customer_id !== user.id) {
    return { ok: false, message: 'You can only reorder your own orders' };
  }

  // 3. Verify order is eligible for reorder (completed, delivered, or cancelled)
  const eligibleStatuses = ['delivered', 'completed', 'cancelled', 'refunded', 'returned'];
  if (!eligibleStatuses.includes(originalOrder.status)) {
    return { ok: false, message: 'This order is not eligible for reorder' };
  }

  // 4. Build items from order_items or product_details
  let items: ReorderItem[] = [];

  if (originalOrder.order_items && originalOrder.order_items.length > 0) {
    for (const oi of originalOrder.order_items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, stock, is_active, product_images(url,sort_order)')
        .eq('id', oi.product_id)
        .single();

      if (!product || !product.is_active) {
        return {
          ok: false,
          message: `Product "${oi.products?.name || oi.product_id}" is no longer available`,
          unavailableProduct: oi.products?.name || oi.product_id,
        };
      }

      if ((product.stock || 0) < oi.quantity) {
        return {
          ok: false,
          message: `"${product.name}" only has ${product.stock} in stock (you need ${oi.quantity})`,
          unavailableProduct: product.name,
        };
      }

      items.push({
        product_id: product.id,
        quantity: oi.quantity,
        name: product.name,
        price: Number(product.price),
      });
    }
  } else {
    // Fall back to product_details
    const details = originalOrder.product_details as any[];
    if (details && Array.isArray(details)) {
      for (const d of details) {
        if (d.is_metadata) continue;

        const { data: product } = await supabase
          .from('products')
          .select('id, name, price, stock, is_active, product_images(url,sort_order)')
          .eq('id', d.product_id)
          .single();

        if (!product || !product.is_active) {
          return { ok: false, message: `Product "${d.product_name}" is no longer available`, unavailableProduct: d.product_name };
        }

        if ((product.stock || 0) < (d.quantity || 1)) {
          return { ok: false, message: `"${product.name}" only has ${product.stock} in stock`, unavailableProduct: product.name };
        }

        items.push({
          product_id: product.id,
          quantity: d.quantity || 1,
          name: product.name,
          price: Number(product.price),
          selectedSpecs: d.specifications || {},
          customerNotes: d.customer_notes || '',
        });
      }
    }
  }

  if (items.length === 0) {
    return { ok: false, message: 'No items found to reorder' };
  }

  // 5. Build customer info from original order
  const customerName = originalOrder.customer_name || 'Unknown';
  const customerEmail = originalOrder.customer_email || user.email || '';
  const customerPhone = originalOrder.customer_phone || '';
  const customerAddress = originalOrder.customer_address ||
    (typeof originalOrder.shipping_address === 'object' && originalOrder.shipping_address !== null
      ? [originalOrder.shipping_address.street, originalOrder.shipping_address.address_line, originalOrder.shipping_address.city, originalOrder.shipping_address.area].filter(Boolean).join(', ')
      : typeof originalOrder.shipping_address === 'string'
        ? originalOrder.shipping_address
        : '');

  // 6. Calculate totals using current prices
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCharge = Number(originalOrder.delivery_charge || originalOrder.shipping_charge || 0);
  const total = subtotal + deliveryCharge;

  const summaryName = items.length === 1 ? items[0].name : `${items[0].name} & ${items.length - 1} other${items.length > 2 ? 's' : ''}`;
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  // 7. Create order_request with original_order_id reference
  const { data: orderRequest, error: reqErr } = await supabase
    .from('order_requests')
    .insert({
      product_id: items.length === 1 ? items[0].product_id : null,
      product_name: summaryName,
      user_id: user.id,
      customer_info: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          name: i.name,
          unit_price: i.price,
          price: i.price,
          selectedSpecs: i.selectedSpecs || {},
          customerNotes: i.customerNotes || '',
        })),
        delivery_charge: deliveryCharge,
        delivery_type: originalOrder.delivery_type || 'online',
        coupon_code: null,
        coupon_discount: 0,
        bundle_discount: 0,
        bundle_offer_name: null,
        free_shipping_offer_name: null,
        is_reorder: true,
        original_order_id: originalOrderId,
      },
      selected_specifications: {},
      quantity: totalQty,
      discount_percent: 0,
      discount_amount: 0,
      coupon_discount: 0,
      coupon_id: null,
      coupon_code: null,
      design_charge: 0,
      customer_notes: `Reorder of Order #${originalOrder.order_number || originalOrderId.slice(0, 8).toUpperCase()}`,
      final_total_price: Math.max(0, total),
      status: 'pending',
      original_order_id: originalOrderId,
    })
    .select('id')
    .single();

  if (reqErr || !orderRequest) {
    return { ok: false, message: reqErr?.message || 'Failed to create reorder' };
  }

  // 8. Reserve stock for each item
  for (const item of items) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('stock, reserved_stock')
        .eq('id', item.product_id)
        .single();
      if (product) {
        const qty = Math.min(item.quantity, (product.stock || 0) - (product.reserved_stock || 0));
        if (qty > 0) {
          await supabase.from('products')
            .update({ reserved_stock: (product.reserved_stock || 0) + qty })
            .eq('id', item.product_id);

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
            stock_after: (product.stock || 0) - qty,
            reference_type: 'order_request',
            reference_id: orderRequest.id,
            notes: `Reorder reserved for order request #${orderRequest.id.substring(0, 8)}`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to reserve stock for item:', item.product_id, err);
    }
  }

  // 9. Notify admin
  try {
    await createNotification({
      title: 'New Reorder Request',
      message: `Reorder from ${customerName} — original order #${originalOrder.order_number || originalOrderId.slice(0, 8).toUpperCase()}`,
      type: 'order',
    });
  } catch {}

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/order-requests');

  return {
    ok: true,
    orderId: orderRequest.id,
    orderNumber: orderRequest.id.slice(0, 8).toUpperCase(),
  };
}
