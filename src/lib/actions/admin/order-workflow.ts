'use server';

/**
 * Order Workflow Server Actions
 *
 * Complete lifecycle: Order Request → Admin Review → Warehouse Processing →
 * Admin Confirmation → Shipping → Delivery
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { assignItemToWarehouse } from '../warehouse';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(permissionCode: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { requirePermission } = await import('../security');
  await requirePermission(permissionCode);
  return { supabase, user };
}

async function requireWarehouseStaff() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data: profile } = await supabase.from('profiles')
    .select('role, is_warehouse_staff, assigned_warehouse_id, full_name')
    .eq('id', user.id).single();
  if (!profile) throw new Error('Forbidden — warehouse staff only');
  const { requirePermission } = await import('../security');
  await requirePermission('orders.manage');
  return { supabase, user, profile };
}

async function addTimeline(
  supabase: any,
  orderId: string,
  status: string,
  note: string,
  userId: string | null,
  adminName: string,
  stepType: string = 'admin'
) {
  await supabase.from('order_timeline').insert({
    order_id: orderId,
    status,
    note,
    created_by: userId,
    admin_name: adminName,
    step_type: stepType,
  });
}

async function sendNotification(
  supabase: any,
  title: string,
  message: string,
  userId: string | null,
  orderId: string | null,
  orderRequestId: string | null,
  actionUrl: string | null,
  type: string = 'order',
  warehouseId?: string | null,
  warehouseAssignmentId?: string | null,
  entity_type?: string | null,
  entity_id?: string | null
) {
  const { error } = await supabase.from('notifications').insert({
    title,
    message,
    type,
    is_read: false,
    ...(userId ? { user_id: userId } : {}),
    ...(orderId ? { order_id: orderId } : {}),
    ...(orderRequestId ? { order_request_id: orderRequestId } : {}),
    ...(actionUrl ? { action_url: actionUrl } : {}),
    ...(warehouseId ? { warehouse_id: warehouseId } : {}),
    ...(warehouseAssignmentId ? { warehouse_assignment_id: warehouseAssignmentId } : {}),
    ...(entity_type ? { entity_type: entity_type } : {}),
    ...(entity_id ? { entity_id: entity_id } : {}),
  });
  if (error) console.error('Notification insert failed:', error);
}

// ─── STEP 2: Admin Reviews Order Request ─────────────────────────────────────

export async function approveOrderRequest(requestId: string) {
const { supabase, user } = await requireAdmin('order_requests.edit');

  const { data: req, error: reqErr } = await supabase
    .from('order_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !req) throw new Error('Order request not found');
  if (req.status !== 'pending') throw new Error('This request has already been processed');

  const ci = req.customer_info as any;
  const isCheckout = Array.isArray(ci?.items) && ci.items.length > 0;
  const summaryName = isCheckout
    ? `${ci.items[0]?.name || req.product_name} & ${ci.items.length - 1} other${ci.items.length > 2 ? 's' : ''}`
    : req.product_name;

  // 1. Create order
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: ci?.name || 'Unknown',
      customer_email: ci?.email || null,
      customer_phone: ci?.phone || null,
      customer_address: ci?.address || null,
      user_id: req.user_id,
      total: req.final_total_price,
      amount: req.final_total_price,
      subtotal: req.final_total_price - (ci?.delivery_charge || 0),
      discount: (req.coupon_discount || 0),
      delivery_charge: ci?.delivery_charge || 0,
      delivery_type: ci?.delivery_type || 'online',
      status: 'admin_approved',
      payment_status: 'pending',
      payment_method: 'cod',
      coupon_code: req.coupon_code || null,
      product_details: isCheckout
        ? ci.items.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price || item.unit_price,
            specifications: item.selectedSpecs || {},
            design_charge: item.designCharge || 0,
            customer_notes: item.customerNotes || '',
          }))
        : [{
            product_id: req.product_id,
            product_name: req.product_name,
            quantity: req.quantity,
            specifications: req.selected_specifications,
            discount_percent: req.discount_percent,
            discount_amount: req.discount_amount,
            design_charge: req.design_charge,
          }],
      original_order_id: req.original_order_id || null,
    })
    .select('id')
    .single();

  if (orderErr || !order) throw new Error(orderErr?.message || 'Failed to create order');

  // Auto-assign warehouse based on product's default_warehouse_id, or first
  // active warehouse. A real warehouse_assignment row is created (never a
  // bare orders.update) and failures are thrown — no silent catch.
  let autoWarehouseId: string | null = null;
  if (isCheckout && ci.items?.length > 0) {
    const firstProductId = ci.items[0]?.product_id;
    if (firstProductId) {
      const { data: prod } = await supabase.from('products').select('default_warehouse_id').eq('id', firstProductId).single();
      if (prod?.default_warehouse_id) autoWarehouseId = prod.default_warehouse_id;
    }
  } else if (req.product_id) {
    const { data: prod } = await supabase.from('products').select('default_warehouse_id').eq('id', req.product_id).single();
    if (prod?.default_warehouse_id) autoWarehouseId = prod.default_warehouse_id;
  }
  if (!autoWarehouseId) {
    const { data: wh } = await supabase.from('warehouses').select('id').eq('is_active', true).order('created_at').limit(1).single();
    if (wh) autoWarehouseId = wh.id;
  }
  if (autoWarehouseId) {
    const assignResult = await assignItemToWarehouse({
      entityType: 'order',
      entityId: order.id,
      warehouseId: autoWarehouseId,
    });
    if (!assignResult?.success) throw new Error('Failed to auto-assign warehouse');
  }

  // 2. Create order_items
  if (isCheckout) {
    const items = ci.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price || item.unit_price || 0,
      total_price: (item.price || item.unit_price || 0) * item.quantity,
      user_id: req.user_id,
    }));
    const { error: itemsErr } = await supabase.from('order_items').insert(items);
    if (itemsErr) throw new Error(itemsErr.message);
  } else if (req.product_id) {
    const { error: itemsErr } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: req.product_id,
      quantity: req.quantity,
      unit_price: req.final_total_price / (req.quantity || 1),
      total_price: req.final_total_price,
      user_id: req.user_id,
    });
    if (itemsErr) throw new Error(itemsErr.message);
  }

  // 3. Deduct stock
  if (isCheckout) {
    for (const item of ci.items) {
      const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({
          stock: Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0)),
        }).eq('id', item.product_id);
      }
    }
  } else if (req.product_id) {
    const { data: product } = await supabase.from('products').select('stock').eq('id', req.product_id).single();
    if (product) {
      await supabase.from('products').update({
        stock: Math.max(0, Number(product.stock || 0) - Number(req.quantity || 0)),
      }).eq('id', req.product_id);
    }
  }

  // 4. Release reserved stock
  try {
    await supabase.from('inventory_reservations')
      .update({ status: 'consumed' })
      .eq('order_request_id', requestId)
      .eq('status', 'active');
  } catch (_) {}

  // 5. Update request status
  await supabase.from('order_requests')
    .update({ status: 'approved', approval_date: new Date().toISOString() })
    .eq('id', requestId);

  // 6. Add timeline
  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, order.id, 'admin_approved', `Order approved by admin`, user.id, adminProfile?.full_name || 'Admin', 'admin');

  // 7. Notify customer
  await sendNotification(
    supabase,
    'Order Approved',
    `Your order request #${requestId.substring(0, 8)} has been approved and is now being processed.`,
    req.user_id,
    order.id,
    requestId,
    `/orders`,
    'order'
  );

  // 8. Notify admin
  await sendNotification(supabase, 'Order Approved', `Order request #${requestId.substring(0, 8)} approved. Order ${orderNumber} created.`, null, order.id, requestId, `/admin/orders/${order.id}`, 'order');

  revalidatePath('/admin/order-requests');
  revalidatePath('/admin/orders');
  return { ok: true, orderId: order.id, orderNumber };
}

export async function rejectOrderRequest(requestId: string, reason: string) {
const { supabase, user } = await requireAdmin('order_requests.edit');

  const { data: req, error: reqErr } = await supabase
    .from('order_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !req) throw new Error('Order request not found');
  if (req.status !== 'pending') throw new Error('This request has already been processed');

  // Release reserved stock
  try {
    const { data: reservations } = await supabase
      .from('inventory_reservations')
      .select('product_id, quantity')
      .eq('order_request_id', requestId)
      .eq('status', 'active');

    if (reservations) {
      for (const res of reservations) {
        const { error: rpcErr } = await supabase.rpc('increment_product_stock', { product_id: res.product_id, qty: res.quantity });
        if (rpcErr) {
          const { data: p } = await supabase.from('products').select('stock').eq('id', res.product_id).single();
          if (p) await supabase.from('products').update({ stock: (p.stock || 0) + res.quantity }).eq('id', res.product_id);
        }
      }
      await supabase.from('inventory_reservations')
        .update({ status: 'cancelled' })
        .eq('order_request_id', requestId)
        .eq('status', 'active');
    }
  } catch (_) {}

  // Update request
  await supabase.from('order_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      rejection_date: new Date().toISOString(),
    })
    .eq('id', requestId);

  // Notify customer
  await sendNotification(
    supabase,
    'Order Rejected',
    `Your order request #${requestId.substring(0, 8)} has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
    req.user_id,
    null,
    requestId,
    `/customer/orders`,
    'order'
  );

  revalidatePath('/admin/order-requests');
  return { ok: true };
}

export async function requestOrderChanges(requestId: string, message: string) {
const { supabase, user } = await requireAdmin('order_requests.edit');

  const { data: req, error: reqErr } = await supabase
    .from('order_requests')
    .select('user_id')
    .eq('id', requestId)
    .single();

  if (reqErr || !req) throw new Error('Order request not found');

  await supabase.from('order_requests')
    .update({ request_changes_note: message })
    .eq('id', requestId);

  await sendNotification(
    supabase,
    'Changes Requested',
    `Admin has requested changes for your order request #${requestId.substring(0, 8)}. ${message}`,
    req.user_id,
    null,
    requestId,
    `/customer/orders`,
    'order'
  );

  revalidatePath('/admin/order-requests');
  return { ok: true };
}

// ─── STEP 3: Assign to Warehouse ─────────────────────────────────────────────

export async function assignWarehouseToOrder(
  orderId: string,
  warehouseId: string,
  warehouseNotesOrStaff: string | null,
  adminName?: string
) {
  const { supabase, user } = await requireAdmin('orders.manage');

  // Delegate to the single shared assignment routine in warehouse.ts, which
  // validates the order + warehouse, upserts warehouse_assignments (no
  // duplicates), syncs orders, logs activity and notifies warehouse staff
  // with fully-linked notifications. Failures are thrown, never swallowed.
  const result = await assignItemToWarehouse({
    entityType: 'order',
    entityId: orderId,
    warehouseId,
    notes: warehouseNotesOrStaff || null,
  });
  if (!result?.success) throw new Error('Failed to assign warehouse');

  // Timeline entry for the order history
  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'warehouse_assigned',
    `Assigned to warehouse.`,
    user.id, adminProfile?.full_name || adminName || 'Admin', 'admin');

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/[id]');
  revalidatePath('/admin/warehouse/activity');
  revalidatePath('/admin/warehouse/orders');
  return { success: true, assignmentId: result.assignment.id };
}

// ─── STEP 4: Warehouse Processing ────────────────────────────────────────────

export async function warehouseAcceptOrder(orderId: string) {
  const { supabase, user, profile } = await requireWarehouseStaff();

  const { data: order } = await supabase
    .from('orders')
    .select('warehouse_id, order_number')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');
  if (order.warehouse_id !== profile.assigned_warehouse_id) throw new Error('This order is not assigned to your warehouse');

  await supabase.from('orders').update({
    warehouse_status: 'accepted',
    warehouse_staff_id: user.id,
    status: 'warehouse_reviewing',
    packing_status: 'not_started',
  }).eq('id', orderId);

  // Sync warehouse assignment
  try {
    const { data: assignment } = await supabase
      .from('warehouse_assignments')
      .select('id')
      .eq('entity_type', 'order')
      .eq('entity_id', orderId)
      .eq('warehouse_id', order.warehouse_id)
      .maybeSingle();
    if (assignment) {
      await supabase.from('warehouse_assignments').update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      }).eq('id', assignment.id);
      await supabase.from('warehouse_activity_logs').insert({
        assignment_id: assignment.id,
        entity_type: 'order',
        entity_id: orderId,
        warehouse_id: order.warehouse_id,
        action: 'status_accepted',
        actor_id: user.id,
        actor_name: profile.full_name || 'Warehouse Staff',
        actor_role: 'warehouse_staff',
        new_value: { status: 'accepted' },
      });
    }
  } catch (syncErr) {
    console.error('Failed to sync assignment (non-fatal):', syncErr);
  }

  const { data: staffProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'warehouse_accepted',
    'Order accepted by warehouse staff', user.id, staffProfile?.full_name || 'Warehouse Staff', 'warehouse');

  revalidatePath('/admin/warehouse/orders');
  revalidatePath('/admin/orders/[id]');
  return { ok: true };
}

export async function warehouseRejectOrder(orderId: string, reason: string) {
  const { supabase, user, profile } = await requireWarehouseStaff();

  const { data: order } = await supabase
    .from('orders')
    .select('warehouse_id, user_id, order_number')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');
  if (order.warehouse_id !== profile.assigned_warehouse_id) throw new Error('This order is not assigned to your warehouse');

  await supabase.from('orders').update({
    warehouse_status: 'rejected',
    warehouse_notes: reason,
    status: 'warehouse_rejected',
  }).eq('id', orderId);

  // Sync warehouse assignment
  try {
    const { data: assignment } = await supabase
      .from('warehouse_assignments')
      .select('id')
      .eq('entity_type', 'order')
      .eq('entity_id', orderId)
      .eq('warehouse_id', order.warehouse_id)
      .maybeSingle();
    if (assignment) {
      await supabase.from('warehouse_assignments').update({
        status: 'rejected',
        notes: reason,
      }).eq('id', assignment.id);
      await supabase.from('warehouse_activity_logs').insert({
        assignment_id: assignment.id,
        entity_type: 'order',
        entity_id: orderId,
        warehouse_id: order.warehouse_id,
        action: 'status_rejected',
        actor_id: user.id,
        actor_name: profile.full_name || 'Warehouse Staff',
        actor_role: 'warehouse_staff',
        new_value: { status: 'rejected' },
        notes: reason,
      });
    }
  } catch (syncErr) {
    console.error('Failed to sync assignment (non-fatal):', syncErr);
  }

  const { data: staffProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'warehouse_rejected',
    `Order rejected by warehouse. Reason: ${reason}`, user.id, staffProfile?.full_name || 'Warehouse Staff', 'warehouse');

  await sendNotification(
    supabase,
    'Warehouse Rejected Order',
    `Order ${order.order_number || `#${orderId}`} was rejected by warehouse. Reason: ${reason}`,
    null, orderId, null,
    `/admin/orders/${orderId}`, 'order'
  );

  revalidatePath('/admin/warehouse/orders');
  revalidatePath('/admin/orders/[id]');
  return { ok: true };
}

export async function warehouseMarkPreparing(orderId: string) {
  const { supabase, user, profile } = await requireWarehouseStaff();

  // Verify warehouse ownership — CRITICAL security check
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('warehouse_id, warehouse_status')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) throw new Error('Order not found');
  if (profile.assigned_warehouse_id) {
    const isAssigned = order.warehouse_id === profile.assigned_warehouse_id;
    if (!isAssigned) {
      const { data: assignment } = await supabase
        .from('warehouse_assignments')
        .select('id')
        .eq('entity_type', 'order')
        .eq('entity_id', orderId)
        .eq('warehouse_id', profile.assigned_warehouse_id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!assignment) throw new Error('This order is not assigned to your warehouse');
    }
  }

  await supabase.from('orders').update({
    warehouse_status: 'preparing',
    status: 'processing',
    packing_status: 'in_progress',
  }).eq('id', orderId);

  // Sync warehouse assignment if one exists
  const { data: assignment } = await supabase
    .from('warehouse_assignments')
    .select('id')
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .eq('warehouse_id', order.warehouse_id)
    .eq('status', 'accepted')
    .maybeSingle();
  if (assignment) {
    await supabase.from('warehouse_assignments').update({
      status: 'processing',
      processing_status: 'in_progress',
      packing_status: 'in_progress',
    }).eq('id', assignment.id);
  }

  const { data: staffProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'preparing',
    'Product preparation started', user.id, staffProfile?.full_name || 'Warehouse Staff', 'warehouse');

  // Notify admin
  const { data: orderMeta } = await supabase.from('orders').select('order_number').eq('id', orderId).single();
  await sendNotification(
    supabase,
    'Warehouse Started Processing',
    `Order ${orderMeta?.order_number || `#${orderId}`} is now being prepared by warehouse.`,
    null, orderId, null,
    `/admin/orders/${orderId}`, 'order'
  );

  revalidatePath('/admin/warehouse/orders');
  revalidatePath('/admin/orders/[id]');
  return { success: true };
}

export async function warehouseMarkReady(
  orderId: string,
  estimatedDispatch: string | null,
  internalNotes: string | null
) {
  const { supabase, user, profile } = await requireWarehouseStaff();

  // Verify warehouse ownership — CRITICAL security check
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('warehouse_id, warehouse_status')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) throw new Error('Order not found');
  if (profile.assigned_warehouse_id) {
    const isAssigned = order.warehouse_id === profile.assigned_warehouse_id;
    if (!isAssigned) {
      const { data: assignment } = await supabase
        .from('warehouse_assignments')
        .select('id')
        .eq('entity_type', 'order')
        .eq('entity_id', orderId)
        .eq('warehouse_id', profile.assigned_warehouse_id)
        .eq('status', 'processing')
        .maybeSingle();
      if (!assignment) throw new Error('This order is not assigned to your warehouse');
    }
  }

  const updateData: any = {
    warehouse_status: 'ready_for_dispatch',
    status: 'ready_for_dispatch',
    packing_status: 'verified',
    shipping_ready: true,
    ready_for_dispatch_at: new Date().toISOString(),
  };
  if (estimatedDispatch) updateData.warehouse_estimated_dispatch = estimatedDispatch;
  if (internalNotes) updateData.warehouse_notes = internalNotes;

  await supabase.from('orders').update(updateData).eq('id', orderId);

  // Sync warehouse assignment if one exists
  const { data: assignment } = await supabase
    .from('warehouse_assignments')
    .select('id')
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .eq('warehouse_id', order.warehouse_id)
    .eq('status', 'processing')
    .maybeSingle();
  if (assignment) {
    await supabase.from('warehouse_assignments').update({
      status: 'ready_for_dispatch',
      packing_status: 'verified',
      shipping_ready: true,
      ready_for_dispatch_at: new Date().toISOString(),
    }).eq('id', assignment.id);
  }

  const { data: staffProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'ready_for_dispatch',
    `Ready for dispatch.${estimatedDispatch ? ` Est. dispatch: ${estimatedDispatch}` : ''}`,
    user.id, staffProfile?.full_name || 'Warehouse Staff', 'warehouse');

  // Notify admin
  const { data: orderMeta } = await supabase.from('orders').select('order_number').eq('id', orderId).single();
  await sendNotification(
    supabase,
    'Warehouse Ready',
    `Order ${orderMeta?.order_number || `#${orderId}`} is ready for dispatch. Awaiting admin confirmation.`,
    null, orderId, null,
    `/admin/orders/${orderId}`, 'order'
  );

  revalidatePath('/admin/warehouse/orders');
  revalidatePath('/admin/orders/[id]');
  return { ok: true };
}

export async function updateWarehouseNotes(orderId: string, notes: string) {
  const { supabase, profile } = await requireWarehouseStaff();

  // Verify warehouse ownership
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('warehouse_id')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) throw new Error('Order not found');
  if (profile.assigned_warehouse_id && order.warehouse_id !== profile.assigned_warehouse_id) {
    const { data: assignment } = await supabase
      .from('warehouse_assignments')
      .select('id')
      .eq('entity_type', 'order')
      .eq('entity_id', orderId)
      .eq('warehouse_id', profile.assigned_warehouse_id)
      .neq('status', 'cancelled')
      .maybeSingle();
    if (!assignment) throw new Error('This order is not assigned to your warehouse');
  }

  await supabase.from('orders').update({ warehouse_notes: notes }).eq('id', orderId);
  return { ok: true };
}

// ─── STEP 5: Admin Final Confirmation ────────────────────────────────────────

export async function adminConfirmOrder(orderId: string) {
const { supabase, user } = await requireAdmin('orders.manage');

  await supabase.from('orders').update({
    status: 'order_confirmed',
    admin_final_confirmed_at: new Date().toISOString(),
  }).eq('id', orderId);

  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'order_confirmed',
    'Order confirmed by admin after warehouse processing', user.id, adminProfile?.full_name || 'Admin', 'admin');

  const { data: order } = await supabase.from('orders').select('user_id, order_number').eq('id', orderId).single();
  if (order?.user_id) {
    await sendNotification(
      supabase,
      'Order Confirmed',
      `Your order ${order.order_number || `#${orderId}`} has been confirmed and will be shipped soon.`,
      order.user_id, orderId, null, `/orders`, 'order'
    );
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/[id]');
  return { ok: true };
}

// ─── STEP 7: Shipping ────────────────────────────────────────────────────────

export async function shipOrder(
  orderId: string,
  courierName: string,
  trackingNumber: string,
  estimatedDelivery: string | null
) {
  const { supabase, user } = await requireAdmin('orders.edit');

  const updateData: any = {
    status: 'shipped',
    courier_name: courierName,
    tracking_number: trackingNumber,
    shipped_at: new Date().toISOString(),
    fulfillment_status: 'Fulfilled',
  };
  if (estimatedDelivery) updateData.estimated_delivery = estimatedDelivery;

  await supabase.from('orders').update(updateData).eq('id', orderId);

  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  await addTimeline(supabase, orderId, 'shipped',
    `Shipped via ${courierName}. Tracking: ${trackingNumber}${estimatedDelivery ? `. Est. delivery: ${estimatedDelivery}` : ''}`,
    user.id, adminProfile?.full_name || 'Admin', 'admin');

  const { data: order } = await supabase.from('orders').select('user_id, order_number').eq('id', orderId).single();
  if (order?.user_id) {
    await sendNotification(
      supabase,
      'Order Shipped',
      `Your order ${order.order_number || `#${orderId}`} has been shipped via ${courierName}. Tracking: ${trackingNumber}`,
      order.user_id, orderId, null, `/track-order?order=${orderId}`, 'order'
    );
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/[id]');
  revalidatePath('/orders');
  return { ok: true };
}

export async function updateDeliveryStatus(orderId: string, status: string) {
const { supabase, user } = await requireAdmin('orders.manage');

  const extra: any = {};
  if (status === 'delivered') {
    extra.delivered_at = new Date().toISOString();
    extra.fulfillment_status = 'Fulfilled';
  }
  if (status === 'completed') {
    extra.completed_at = new Date().toISOString();
  }

  await supabase.from('orders').update({ status, ...extra }).eq('id', orderId);

  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  const statusLabels: Record<string, string> = {
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
  };
  await addTimeline(supabase, orderId, status,
    `Order ${statusLabels[status] || status}`, user.id, adminProfile?.full_name || 'Admin', 'admin');

  const { data: order } = await supabase.from('orders').select('user_id, order_number').eq('id', orderId).single();
  if (order?.user_id) {
    const customerMessages: Record<string, string> = {
      in_transit: `Your order ${order.order_number || `#${orderId}`} is now in transit.`,
      out_for_delivery: `Your order ${order.order_number || `#${orderId}`} is out for delivery!`,
      delivered: `Your order ${order.order_number || `#${orderId}`} has been delivered.`,
      completed: `Your order ${order.order_number || `#${orderId}`} has been completed. Thank you!`,
    };
    await sendNotification(
      supabase,
      `Order ${statusLabels[status] || status}`,
      customerMessages[status] || `Order status updated to ${status}.`,
      order.user_id, orderId, null,
      status === 'delivered' || status === 'completed' ? `/orders` : `/track-order?order=${orderId}`,
      'order'
    );
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/[id]');
  revalidatePath('/orders');
  revalidatePath('/track-order');
  return { ok: true };
}