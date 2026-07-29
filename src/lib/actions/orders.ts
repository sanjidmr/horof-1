'use server';

import { createSupabaseServerClient } from '../supabase/server';
import { parseProductDetails, buildProductDetails } from '@/lib/utils/order-helpers';
import { revalidatePath } from 'next/cache';
import { sendOrderStatusEmail } from './send-order-email';
import { logSystemTransaction } from './accounting';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Forbidden');
  return { supabase, user };
}

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}

/**
 * 1. Update Order Status (Pending, Confirmed, Processing, Packed, Ready for Pickup, Shipped, In Transit, Out for Delivery, Delivered, Cancelled, Returned, Refunded)
 */
export async function updateOrderStatusAction(
  orderId: number,
  newStatus: string,
  note?: string,
  adminName?: string,
  sendEmail?: boolean
) {
  const { supabase } = await requireAdmin();

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
    await adjustStock(supabase, orderId, items, 'add');
  } else if (prevStatus === 'returned' && newStatus.toLowerCase() !== 'returned') {
    await adjustStock(supabase, orderId, items, 'deduct');
  }

  // Handle stock adjustments for cancelled items
  if (newStatus.toLowerCase() === 'cancelled' && prevStatus !== 'cancelled') {
    await adjustStock(supabase, orderId, items, 'add');
  } else if (prevStatus === 'cancelled' && newStatus.toLowerCase() !== 'cancelled') {
    await adjustStock(supabase, orderId, items, 'deduct');
  }

  // ── Auto Log System Transaction ──
  const orderTotal = Number(order.total ?? 0);
  const orderLabel = order.order_number || `#${orderId}`;
  if (newStatus.toLowerCase() === 'delivered' || newStatus.toLowerCase() === 'completed') {
    logSystemTransaction({
      type: 'income',
      reference_id: String(orderId),
      reference_type: 'order',
      description: `Order ${orderLabel} marked as ${newStatus}`,
      amount: orderTotal,
      status: 'completed',
    }).catch(() => {});
  } else if (newStatus.toLowerCase() === 'cancelled' && prevStatus !== 'cancelled') {
    logSystemTransaction({
      type: 'cancellation',
      reference_id: String(orderId),
      reference_type: 'order',
      description: `Order ${orderLabel} cancelled${note ? `: ${note}` : ''}`,
      amount: orderTotal,
      status: 'completed',
    }).catch(() => {});
  }

  // ── Customer DB Notification ──
  const statusLabel = newStatus.toLowerCase().replace(/_/g, ' ');
  const orderNum = order.order_number || `#${orderId}`;
  if (order.user_id) {
    const { error: insertError } = await supabase.from('notifications').insert({
      title: `Order ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
      message: `Your order ${orderNum} status has been updated to ${statusLabel}.${note ? ` ${note}` : ''}`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: `/orders`,
    });
    if (insertError) console.error('[Notification] Failed to create customer notification:', insertError);
  }

  // ── Admin DB Notification ──
  const { error: adminNotifErr } = await supabase.from('notifications').insert({
    title: `Order ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
    message: `Order ${orderNum} status changed to ${statusLabel} by ${adminName || 'Admin'}.${note ? ` ${note}` : ''}`,
    type: 'order',
    order_id: orderId,
    action_url: `/admin/orders/${orderId}`,
  });
  if (adminNotifErr) console.error('[Notification] Failed to create admin notification:', adminNotifErr);

  // ── Send Email to Customer ──
  if (sendEmail && order.customer_email) {
    sendOrderStatusEmail({
      to: order.customer_email,
      customerName: order.customer_name || 'Customer',
      orderNumber: orderNum,
      status: newStatus.toLowerCase(),
      note: note || undefined,
      trackingNumber: metadata.tracking_number || undefined,
      courierName: metadata.courier_name || undefined,
      estimatedDelivery: metadata.estimated_delivery || undefined,
    }).catch(err => console.error('[Email] Failed to send status email:', err));
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/orders');
  revalidatePath('/track-order');
  revalidatePath('/customer/orders');
  revalidatePath('/customer/dashboard');

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
  const { supabase } = await requireAdmin();

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
  const { supabase } = await requireAdmin();

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

  // ── Customer DB Notification ──
  const orderNum = order.order_number || `#${orderId}`;
  if (order.user_id) {
    await supabase.from('notifications').insert({
      title: 'Courier Assigned',
      message: `Your order ${orderNum} has been assigned to ${courierName}. Tracking: ${trackingNumber}.${estimatedDelivery ? ` Est. delivery: ${new Date(estimatedDelivery).toLocaleDateString()}` : ''}`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: `/track-order?order=${orderNum}`,
    }).then(({ error }) => { if (error) console.error('[Notification] courier notif error:', error); });
  }

  // ── Send Email to Customer ──
  if (order.customer_email) {
    sendOrderStatusEmail({
      to: order.customer_email,
      customerName: order.customer_name || 'Customer',
      orderNumber: orderNum,
      status: order.status,
      note: `Courier ${courierName} assigned. Tracking: ${trackingNumber}`,
      trackingNumber,
      courierName,
      estimatedDelivery,
    }).catch(err => console.error('[Email] Failed to send courier email:', err));
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/track-order');
  revalidatePath('/customer/orders');
  revalidatePath('/customer/dashboard');
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
  const { supabase } = await requireAdmin();

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

  // ── Notify customer when customer notes are updated ──
  if (type === 'customer' && order.user_id) {
    const orderNum = order.order_number || `#${orderId}`;
    await supabase.from('notifications').insert({
      title: 'Order Note Updated',
      message: `A note has been added to your order ${orderNum}.`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: '/orders',
    }).then(({ error }) => { if (error) console.error('[Notification] notes notif error:', error); });

    // Send email for customer note updates
    if (order.customer_email && notesText) {
      sendOrderStatusEmail({
        to: order.customer_email,
        customerName: order.customer_name || 'Customer',
        orderNumber: orderNum,
        status: order.status,
        note: notesText,
      }).catch(err => console.error('[Email] Failed to send notes email:', err));
    }
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/customer/orders');
  revalidatePath('/customer/dashboard');
  return { success: true };
}

/**
 * 5. Request Return (Customer)
 */
export async function requestOrderReturnAction(orderId: number, reason: string) {
  const { supabase, user } = await requireAuth();

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  if (order.user_id !== user.id) throw new Error('You can only return your own orders');

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
  const { supabase } = await requireAdmin();

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

  // Notify customer
  if (order.user_id) {
    const orderNum = orderId.toString().slice(0, 8).toUpperCase();
    await supabase.from('notifications').insert({
      title: approve ? 'Return Approved' : 'Return Rejected',
      message: approve
        ? `Your return request for order #${orderNum} has been approved. Please follow the return instructions.`
        : `Your return request for order #${orderNum} has been rejected.${note ? ` Reason: ${note}` : ''}`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: '/orders',
    });
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
  const { supabase } = await requireAdmin();

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

  // Log refund transaction
  if (approve) {
    const refundTotal = Number(order.total ?? 0);
    logSystemTransaction({
      type: 'refund',
      reference_id: String(orderId),
      reference_type: 'order',
      description: `Refund approved for order #${String(orderId).slice(0, 8).toUpperCase()}`,
      amount: refundTotal,
      status: 'completed',
    }).catch(() => {});
  }

  // Log timeline
  const timelineNote = `Refund ${approve ? 'Approved' : 'Rejected'}${adminName ? ` (by Admin: ${adminName})` : ''}.${note ? ` Note: ${note}` : ''}`;
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status: approve ? 'refunded' : order.status,
    note: timelineNote
  });

  // Notify customer
  if (order.user_id) {
    const orderNum = orderId.toString().slice(0, 8).toUpperCase();
    await supabase.from('notifications').insert({
      title: approve ? 'Refund Approved' : 'Refund Rejected',
      message: approve
        ? `Your refund for order #${orderNum} has been approved. The amount will be processed shortly.`
        : `Your refund request for order #${orderNum} has been rejected.${note ? ` Reason: ${note}` : ''}`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: '/orders',
    });
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

/**
 * Track order by order_number (or UUID id) + customer email.
 * Public — works for unauthenticated guest users too.
 */
export async function getOrderTrackingData(identifier: string, email: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client not initialized');

  const cleanId = identifier.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanId || !cleanEmail) {
    throw new Error('Order number and email are required');
  }

  // 1. Try lookup by order_number (case-insensitive)
  let { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          name,
          images
        )
      )
    `)
    .ilike('order_number', cleanId)
    .maybeSingle();

  // 2. Fallback: try by UUID id (if input looks like a UUID)
  if (!order && cleanId.includes('-') && cleanId.length >= 30) {
    const { data: byId } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            name,
            images
          )
        )
      `)
      .eq('id', cleanId)
      .maybeSingle();
    order = byId;
  }

  if (fetchErr) throw new Error(fetchErr.message);
  if (!order) throw new Error('Order not found');

  // 3. Verify email matches (case-insensitive, trimmed)
  const orderEmail = (order.customer_email || '').trim().toLowerCase();
  if (orderEmail && orderEmail !== cleanEmail) {
    throw new Error('Email does not match this order');
  }
  // If customer_email is null/empty (legacy rows), also check user email via profiles
  if (!orderEmail && order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', order.user_id)
      .maybeSingle();
    const profileEmail = (profile?.email || '').trim().toLowerCase();
    if (profileEmail && profileEmail !== cleanEmail) {
      throw new Error('Email does not match this order');
    }
  }

  // 4. Fetch timeline
  const { data: timelineData } = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  return { order, timeline: timelineData || [] };
}

export async function cancelOrderAction(
  orderId: number,
  reason?: string,
  userRole: 'customer' | 'admin' = 'customer',
  adminName?: string
) {
  const { supabase, user } = userRole === 'admin' ? await requireAdmin() : await requireAuth();

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) throw new Error('Order not found');

  // Verify customer can only cancel their own orders
  if (userRole === 'customer' && order.user_id !== user.id) {
    throw new Error('You can only cancel your own orders');
  }

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

  // Log cancellation transaction
  logSystemTransaction({
    type: 'cancellation',
    reference_id: String(orderId),
    reference_type: 'order',
    description: `Order cancelled: ${order.order_number || `#${orderId}`}${reason ? ` (${reason})` : ''}`,
    amount: Number(order.total ?? 0),
    status: 'completed',
  }).catch(() => {});

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

  // ── Customer DB Notification ──
  const orderNum = order.order_number || `#${orderId}`;
  if (order.user_id) {
    await supabase.from('notifications').insert({
      title: 'Order Cancelled',
      message: `Your order ${orderNum} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'order',
      user_id: order.user_id,
      order_id: orderId,
      action_url: '/orders',
    }).then(({ error }) => { if (error) console.error('[Notification] cancel notif error:', error); });
  }

  // ── Send Email ──
  if (order.customer_email) {
    sendOrderStatusEmail({
      to: order.customer_email,
      customerName: order.customer_name || 'Customer',
      orderNumber: orderNum,
      status: 'cancelled',
      note: reason || undefined,
    }).catch(err => console.error('[Email] Failed to send cancel email:', err));
  }

  revalidatePath('/orders');
  revalidatePath('/track-order');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/customer/orders');
  revalidatePath('/customer/dashboard');
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

/**
 * 8. Get All Return Requests (Admin)
 */
export async function getReturnRequests(statusFilter?: string) {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_email, customer_phone,
      status, total, created_at, updated_at, product_details,
      user_id, warehouse_id
    `)
    .in('status', ['delivered', 'returned', 'refunded', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(200);

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);

  const returns = (orders || []).map((order: any) => {
    const { items, metadata } = parseProductDetails(order.product_details);
    return {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      updated_at: order.updated_at,
      return_status: metadata.return_status || 'None',
      return_reason: metadata.return_reason || '',
      refund_status: metadata.refund_status || 'None',
      refund_reason: metadata.refund_reason || '',
      items: items.map((item: any) => ({
        name: item.name || item.product_name || 'Unknown Product',
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image || null,
      })),
    };
  }).filter((r: any) => {
    const hasReturn = r.return_status !== 'None' || r.status === 'returned';
    if (!hasReturn) return false;
    if (statusFilter && statusFilter !== 'all') {
      return r.return_status.toLowerCase() === statusFilter.toLowerCase();
    }
    return true;
  });

  return returns;
}

/**
 * 9. Get Return Request Detail (Admin)
 */
export async function getReturnRequestDetail(orderId: string) {
  const { supabase } = await requireAdmin();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *, order_items(*, products(name, image, stock, sku))
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  const { items, metadata } = parseProductDetails(order.product_details);
  const timelineData = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  return {
    order: {
      ...order,
      items,
      metadata,
    },
    timeline: timelineData.data || [],
  };
}
