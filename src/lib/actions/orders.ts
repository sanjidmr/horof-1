'use server';

import { createSupabaseServerClient } from '../supabase/server';
import { parseProductDetails, buildProductDetails } from '@/lib/utils/order-helpers';
import { revalidatePath } from 'next/cache';

/**
 * 1. Update Order Status (Pending, Confirmed, Processing, Packed, Ready for Pickup, Shipped, In Transit, Out for Delivery, Delivered, Cancelled, Returned, Refunded)
 */
export async function updateOrderStatusAction(
  orderId: number,
  newStatus: string,
  note?: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  // Fetch current order state to check status and load product_details
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    throw new Error('Order not found: ' + (fetchErr?.message || ''));
  }

  const prevStatus = order.status;
  if (prevStatus === newStatus) {
    return { success: true, message: 'Status is already ' + newStatus };
  }

  const { items, metadata } = parseProductDetails(order.product_details);

  // Update fulfillment status based on new order status
  if (['shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(newStatus.toLowerCase())) {
    metadata.fulfillment_status = 'Fulfilled';
  } else if (['processing', 'packed', 'ready_for_pickup'].includes(newStatus.toLowerCase())) {
    metadata.fulfillment_status = 'Partially Fulfilled';
  } else if (['cancelled', 'returned'].includes(newStatus.toLowerCase())) {
    // Keep or adjust
  }

  const updatedProductDetails = buildProductDetails(items, metadata);

  // Perform order update
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: newStatus.toLowerCase(),
      product_details: updatedProductDetails
    })
    .eq('id', orderId);

  if (updateErr) {
    throw new Error('Failed to update order status: ' + updateErr.message);
  }

  // Insert timeline event
  const timelineNote = `${note || `Status updated to ${newStatus}`}${adminName ? ` (by Admin: ${adminName})` : ' (by System)'}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: newStatus.toLowerCase(),
    note: timelineNote
  });

  // Handle stock adjustments for returned items
  if (newStatus.toLowerCase() === 'returned' && prevStatus !== 'returned') {
    // Replenish stock
    await adjustStock(supabase, orderId, items, 'add');
  } else if (prevStatus === 'returned' && newStatus.toLowerCase() !== 'returned') {
    // Re-deduct stock
    await adjustStock(supabase, orderId, items, 'deduct');
  }

  // Handle stock adjustments for cancelled items
  if (newStatus.toLowerCase() === 'cancelled' && prevStatus !== 'cancelled') {
    await adjustStock(supabase, orderId, items, 'add');
  } else if (prevStatus === 'cancelled' && newStatus.toLowerCase() !== 'cancelled') {
    await adjustStock(supabase, orderId, items, 'deduct');
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/orders');
  revalidatePath('/track-order');

  return { success: true, status: newStatus.toLowerCase() };
}

/**
 * 2. Update Payment Status (Pending, Paid, Failed, Refund Pending, Refunded, Partially Refunded)
 */
export async function updateOrderPaymentStatusAction(
  orderId: number,
  newPaymentStatus: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ payment_status: newPaymentStatus.toLowerCase() })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to update payment status: ' + updateErr.message);

  // Log timeline
  const timelineNote = `Payment status updated to ${newPaymentStatus}${adminName ? ` (by Admin: ${adminName})` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: order.status,
    note: timelineNote
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true, paymentStatus: newPaymentStatus.toLowerCase() };
}

/**
 * 3. Assign Courier / Tracking details
 */
export async function assignCourierAction(
  orderId: number,
  courierName: string,
  trackingNumber: string,
  estimatedDelivery?: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { items, metadata } = parseProductDetails(order.product_details);
  metadata.courier_name = courierName;
  metadata.tracking_number = trackingNumber;
  if (estimatedDelivery) {
    metadata.estimated_delivery = estimatedDelivery;
  }

  const updatedProductDetails = buildProductDetails(items, metadata);

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ product_details: updatedProductDetails })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to assign courier: ' + updateErr.message);

  // Insert timeline event
  const timelineNote = `Assigned courier ${courierName} with tracking number ${trackingNumber}${adminName ? ` (by Admin: ${adminName})` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: order.status,
    note: timelineNote
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/track-order');
  return { success: true };
}

/**
 * 4. Update Internal or Customer Notes
 */
export async function updateOrderNotesAction(
  orderId: number,
  type: 'internal' | 'customer',
  notesText: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { items, metadata } = parseProductDetails(order.product_details);
  if (type === 'internal') {
    metadata.internal_notes = notesText;
  } else {
    metadata.customer_notes = notesText;
  }

  const updatedProductDetails = buildProductDetails(items, metadata);

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ product_details: updatedProductDetails })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to update notes: ' + updateErr.message);

  // Log timeline
  const timelineNote = `Updated ${type} notes${adminName ? ` (by Admin: ${adminName})` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: order.status,
    note: timelineNote
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

/**
 * 5. Request Return (Customer)
 */
export async function requestOrderReturnAction(orderId: number, reason: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  // Verify eligibility (e.g., status is delivered)
  if (order.status !== 'delivered') {
    throw new Error('Returns can only be requested for delivered orders');
  }

  const { items, metadata } = parseProductDetails(order.product_details);
  metadata.return_status = 'Requested';
  metadata.return_reason = reason;

  const updatedProductDetails = buildProductDetails(items, metadata);

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ product_details: updatedProductDetails })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to request return: ' + updateErr.message);

  // Log timeline
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: order.status,
    note: `Return requested by customer. Reason: ${reason}`
  });

  revalidatePath('/orders');
  revalidatePath('/track-order');
  return { success: true };
}

/**
 * 6. Approve or Reject Return (Admin)
 */
export async function handleReturnAction(
  orderId: number,
  approve: boolean,
  note?: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { items, metadata } = parseProductDetails(order.product_details);
  metadata.return_status = approve ? 'Approved' : 'Rejected';

  const updatedProductDetails = buildProductDetails(items, metadata);

  // If approved, transition order status to 'returned'
  const newStatus = approve ? 'returned' : order.status;

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      product_details: updatedProductDetails
    })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to process return: ' + updateErr.message);

  // Log timeline
  const timelineNote = `Return ${approve ? 'Approved' : 'Rejected'}${adminName ? ` (by Admin: ${adminName})` : ''}.${note ? ` Note: ${note}` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: newStatus,
    note: timelineNote
  });

  // If approved, replenish stock
  if (approve && order.status !== 'returned') {
    await adjustStock(supabase, orderId, items, 'add');
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

/**
 * 7. Approve or Reject Refund (Admin)
 */
export async function handleRefundAction(
  orderId: number,
  approve: boolean,
  note?: string,
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  const { items, metadata } = parseProductDetails(order.product_details);
  metadata.refund_status = approve ? 'Approved' : 'Rejected';

  const updatedProductDetails = buildProductDetails(items, metadata);

  // If approved, update payment status to 'refunded'
  const newPaymentStatus = approve ? 'refunded' : order.payment_status;

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      payment_status: newPaymentStatus,
      status: approve ? 'refunded' : order.status,
      product_details: updatedProductDetails
    })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to process refund: ' + updateErr.message);

  // Log timeline
  const timelineNote = `Refund ${approve ? 'Approved' : 'Rejected'}${adminName ? ` (by Admin: ${adminName})` : ''}.${note ? ` Note: ${note}` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: approve ? 'refunded' : order.status,
    note: timelineNote
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

/**
 * 8. Cancel Order (Customer or Admin)
 */
export async function cancelOrderAction(
  orderId: number,
  reason?: string,
  userRole: 'customer' | 'admin' = 'customer',
  adminName?: string
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  // Verify eligibility (customer can only cancel pending)
  if (userRole === 'customer' && order.status !== 'pending') {
    throw new Error('Customers can only cancel pending orders');
  }

  const { items } = parseProductDetails(order.product_details);

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);

  if (updateErr) throw new Error('Failed to cancel order: ' + updateErr.message);

  // Log timeline
  const cancelBy = userRole === 'admin' ? `Admin: ${adminName || 'System'}` : 'Customer';
  const timelineNote = `Order Cancelled by ${cancelBy}.${reason ? ` Reason: ${reason}` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: 'cancelled',
    note: timelineNote
  });

  // Replenish stock
  if (order.status !== 'cancelled' && order.status !== 'returned') {
    await adjustStock(supabase, orderId, items, 'add');
  }

  revalidatePath('/orders');
  revalidatePath('/track-order');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

// Private helper to adjust stock
async function adjustStock(supabase: any, orderId: number, items: any[], type: 'add' | 'deduct') {
  try {
    // Try using order_items first
    const { data: dbItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    const itemsToProcess = dbItems && dbItems.length > 0 ? dbItems : items;

    for (const item of itemsToProcess) {
      if (!item.product_id) continue;
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const currentStock = Number(product.stock || 0);
        const qty = Number(item.quantity || 0);
        const newStock = type === 'add' ? currentStock + qty : Math.max(0, currentStock - qty);

        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.product_id);
      }
    }
  } catch (err) {
    console.error('Error adjusting stock for order ' + orderId + ':', err);
  }
}
