'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isInternalAdminRole } from '@/lib/auth/roles';

// ============================================================
// ENTERPRISE WAREHOUSE MANAGEMENT ACTIONS
// Handles: multi-warehouse order assignment, activity logging,
// review & approval, packing, notes, notifications, realtime sync
//
// NOTE: warehouse_assignments is EXCLUSIVELY for ORDER management.
// Products use their own warehouse fields (default_warehouse_id)
// and inventory tables (stock_movements, stock_transfers).
// ============================================================

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentEntityType = 'order';
export type AssignmentStatus =
  | 'assigned'
  | 'accepted'
  | 'rejected'
  | 'processing'
  | 'packed'
  | 'ready_for_dispatch'
  | 'completed'
  | 'cancelled';
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AdminApprovalStatus = 'pending' | 'approved' | 'rejected' | 'override';

/**
 * WarehouseAssignment row type.
 * entity_id is a UUID referencing orders.id (warehouse_assignments is
 * EXCLUSIVELY for order management). No casts are used anywhere.
 */
export interface WarehouseAssignment {
  id: string;
  entity_type: 'order';
  entity_id: string;
  warehouse_id: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  admin_approval: AdminApprovalStatus;
  admin_approval_by: string | null;
  admin_approval_at: string | null;
  admin_approval_notes: string | null;
  processing_status: 'not_started' | 'in_progress' | 'paused' | 'completed' | null;
  packing_status: 'not_started' | 'in_progress' | 'packed' | 'verified' | null;
  shipping_ready: boolean;
  notes: string | null;
  assigned_notes: string | null;
  scheduled_at: string | null;
  assigned_at: string;
  accepted_at: string | null;
  packed_at: string | null;
  ready_for_dispatch_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  updated_at: string;
}

interface StaffProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_warehouse_staff: boolean;
  assigned_warehouse_id: string | null;
}

// ─── Core auth helpers ────────────────────────────────────────────────────────

async function requireActor() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_warehouse_staff, assigned_warehouse_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const isAdmin = isInternalAdminRole(profile.role);
  const isWarehouseStaff = profile.is_warehouse_staff === true;

  return { supabase, user, profile: profile as StaffProfile, isAdmin, isWarehouseStaff };
}

async function requireAdminOnly() {
  const ctx = await requireActor();
  if (!ctx.isAdmin) throw new Error('Forbidden — admin only');
  return ctx;
}

// Verify the actor is admin OR warehouse staff assigned to the given warehouse
async function verifyWarehouseAccess(ctx: Awaited<ReturnType<typeof requireActor>>, warehouseId: string | null) {
  if (ctx.isAdmin) return;
  if (ctx.isWarehouseStaff && ctx.profile.assigned_warehouse_id === warehouseId) return;
  throw new Error('Access denied — this item is not assigned to your warehouse');
}

// Verify actor can act on a specific assignment
async function verifyAssignmentAccess(ctx: Awaited<ReturnType<typeof requireActor>>, assignmentId: string): Promise<WarehouseAssignment> {
  const { supabase } = ctx;
  const { data: assignment, error } = await supabase
    .from('warehouse_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) throw new Error('Assignment not found');
  await verifyWarehouseAccess(ctx, assignment.warehouse_id);
  return assignment as WarehouseAssignment;
}

// Resolve a warehouse staff profile name
async function getProfileName(ctx: Awaited<ReturnType<typeof requireActor>>) {
  return ctx.profile.full_name || ctx.profile.email || (ctx.isAdmin ? 'Admin' : 'Warehouse Staff');
}

// ─── Activity Logging ─────────────────────────────────────────────────────────

async function logActivity(
  supabase: any,
  params: {
    assignment_id?: string | null;
    entity_type: AssignmentEntityType;
    entity_id: string;
    warehouse_id?: string | null;
    action: string;
    actor_id: string | null;
    actor_name: string | null;
    actor_role: 'admin' | 'warehouse_staff' | 'system';
    old_value?: any;
    new_value?: any;
    notes?: string | null;
    metadata?: Record<string, any>;
  }
) {
  const { error } = await supabase.from('warehouse_activity_logs').insert({
    assignment_id: params.assignment_id || null,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    warehouse_id: params.warehouse_id || null,
    action: params.action,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    actor_role: params.actor_role,
    old_value: params.old_value || null,
    new_value: params.new_value || null,
    notes: params.notes || null,
    metadata: params.metadata || {},
  });
  if (error) console.error('Activity log insert failed:', error);
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function createNotification(
  supabase: any,
  params: {
    title: string;
    message: string;
    type: string;
    user_id?: string | null;
    warehouse_id?: string | null;
    warehouse_assignment_id?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
    action_url?: string | null;
  }
) {
  const { error } = await supabase.from('notifications').insert({
    title: params.title,
    message: params.message,
    type: params.type,
    is_read: false,
    ...(params.user_id ? { user_id: params.user_id } : {}),
    ...(params.warehouse_id ? { warehouse_id: params.warehouse_id } : {}),
    ...(params.warehouse_assignment_id ? { warehouse_assignment_id: params.warehouse_assignment_id } : {}),
    ...(params.entity_type ? { entity_type: params.entity_type } : {}),
    ...(params.entity_id ? { entity_id: params.entity_id } : {}),
    ...(params.action_url ? { action_url: params.action_url } : {}),
  });
  if (error) console.error('Notification insert failed:', error);
}

// ─── Assignment Management (Admin) ────────────────────────────────────────────

export type AssignItemInput = {
  entityType: AssignmentEntityType;
  entityId: string;
  warehouseId: string;
  priority?: AssignmentPriority;
  notes?: string | null;
  scheduledAt?: string | null;
};

/**
 * Assign an order to a warehouse.
 * Creates a warehouse_assignment row (or updates the existing one if assigned again).
 * warehouse_assignments is EXCLUSIVELY for order management.
 */
export async function assignItemToWarehouse(input: AssignItemInput) {
  const ctx = await requireAdminOnly();
  const { supabase, user } = ctx;
  const adminName = await getProfileName(ctx);

  // Verify order exists
  const { data: entityRow, error: entityErr } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('id', input.entityId)
    .maybeSingle();
  if (entityErr || !entityRow) throw new Error('Order not found');
  const entity = entityRow as any;
  const entityName = String(entity.order_number || '');

  // Verify warehouse exists and is active
  const { data: warehouse } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('id', input.warehouseId)
    .eq('is_active', true)
    .single();
  if (!warehouse) throw new Error('Warehouse not found or inactive');

  // Upsert assignment (idempotent — no duplicates)
  const { data: assignment, error: upsertErr } = await supabase
    .from('warehouse_assignments')
    .upsert(
      {
        entity_type: 'order',
        entity_id: input.entityId,
        warehouse_id: input.warehouseId,
        assigned_by: user.id,
        assigned_by_name: adminName,
        priority: input.priority || 'normal',
        status: 'assigned',
        admin_approval: 'pending',
        processing_status: 'not_started',
        packing_status: 'not_started',
        shipping_ready: false,
        assigned_notes: input.notes || null,
        scheduled_at: input.scheduledAt || null,
        assigned_at: new Date().toISOString(),
        notes: null,
      },
      { onConflict: 'entity_type,entity_id,warehouse_id' }
    )
    .select('*')
    .single();

  if (upsertErr || !assignment) throw new Error(upsertErr?.message || 'Failed to create assignment');

  // Sync order warehouse fields
  await supabase.from('orders').update({
    warehouse_id: input.warehouseId,
    warehouse_status: 'waiting_for_warehouse',
    status: 'warehouse_assigned',
    assignment_priority: input.priority || 'normal',
    warehouse_notes: input.notes || null,
  }).eq('id', input.entityId);

  // Log activity
  await logActivity(supabase, {
    assignment_id: assignment.id,
    entity_type: 'order',
    entity_id: input.entityId,
    warehouse_id: input.warehouseId,
    action: 'assignment_created',
    actor_id: user.id,
    actor_name: adminName,
    actor_role: 'admin',
    new_value: { status: 'assigned', priority: input.priority || 'normal' },
    notes: input.notes || null,
    metadata: { warehouse_name: warehouse.name },
  });

  // Notify warehouse staff (via warehouse_id broadcast)
  const entityLabel = `Order ${entityName || `#${input.entityId.slice(0, 8)}`}`;
  await createNotification(supabase, {
    title: 'New Warehouse Assignment',
    message: `${entityLabel} has been assigned to your warehouse by ${adminName}.`,
    type: 'assignment',
    warehouse_id: input.warehouseId,
    warehouse_assignment_id: assignment.id,
    entity_type: 'order',
    entity_id: input.entityId,
    action_url: '/admin/warehouse/orders',
  });

  // Also notify the admin
  await createNotification(supabase, {
    title: 'Assignment Created',
    message: `${entityLabel} assigned to ${warehouse.name}.`,
    type: 'assignment',
    warehouse_assignment_id: assignment.id,
    entity_type: 'order',
    entity_id: input.entityId,
    action_url: '/admin/warehouse/activity',
  });

  revalidatePath('/admin/warehouse/activity');
  revalidatePath('/admin/orders');

  return { success: true, assignment };
}

/**
 * Reassign an order from one warehouse to another (admin).
 * Cancels old assignment, creates new one.
 */
export async function reassignItemToWarehouse(
  assignmentId: string,
  newWarehouseId: string,
  note?: string | null
) {
  const ctx = await requireAdminOnly();
  const { supabase, user } = ctx;
  const adminName = await getProfileName(ctx);

  const existing = await verifyAssignmentAccess(ctx, assignmentId);

  // Cancel old assignment
  await supabase.from('warehouse_assignments').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: user.id,
    cancel_reason: note || 'Reassigned to another warehouse',
  }).eq('id', assignmentId);

  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    warehouse_id: existing.warehouse_id,
    action: 'assignment_reassigned',
    actor_id: user.id,
    actor_name: adminName,
    actor_role: 'admin',
    old_value: { warehouse_id: existing.warehouse_id },
    new_value: { warehouse_id: newWarehouseId },
    notes: note || null,
  });

  await createNotification(supabase, {
    title: 'Assignment Reassigned',
    message: `This order was reassigned from one warehouse to another.`,
    type: 'assignment',
    warehouse_id: existing.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    action_url: '/admin/warehouse/activity',
  });

  // Create new assignment
  return assignItemToWarehouse({
    entityType: 'order',
    entityId: existing.entity_id,
    warehouseId: newWarehouseId,
    priority: existing.priority,
    notes: note || existing.assigned_notes,
  });
}

/**
 * Cancel an assignment (admin).
 */
export async function cancelAssignment(assignmentId: string, reason: string) {
  const ctx = await requireAdminOnly();
  const { supabase, user } = ctx;
  const adminName = await getProfileName(ctx);

  const existing = await verifyAssignmentAccess(ctx, assignmentId);

  await supabase.from('warehouse_assignments').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: user.id,
    cancel_reason: reason,
  }).eq('id', assignmentId);

  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    warehouse_id: existing.warehouse_id,
    action: 'assignment_cancelled',
    actor_id: user.id,
    actor_name: adminName,
    actor_role: 'admin',
    old_value: { status: existing.status },
    new_value: { status: 'cancelled' },
    notes: reason,
  });

  await createNotification(supabase, {
    title: 'Assignment Cancelled',
    message: `An order assignment was cancelled. Reason: ${reason}`,
    type: 'assignment',
    warehouse_id: existing.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    action_url: '/admin/warehouse/activity',
  });

  revalidatePath('/admin/warehouse/activity');
  return { success: true };
}

/**
 * Admin review — approve, reject, or override a warehouse action.
 */
export async function adminReviewAssignment(
  assignmentId: string,
  action: 'approve' | 'reject' | 'override',
  notes?: string | null,
  overrideStatus?: AssignmentStatus | null
) {
  const ctx = await requireAdminOnly();
  const { supabase, user } = ctx;
  const adminName = await getProfileName(ctx);

  const existing = await verifyAssignmentAccess(ctx, assignmentId);

  const updates: any = {
    admin_approval: action,
    admin_approval_by: user.id,
    admin_approval_at: new Date().toISOString(),
    admin_approval_notes: notes || null,
  };
  if (action === 'override' && overrideStatus) {
    updates.status = overrideStatus;
  }

  await supabase.from('warehouse_assignments').update(updates).eq('id', assignmentId);

  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    warehouse_id: existing.warehouse_id,
    action: `admin_${action}`,
    actor_id: user.id,
    actor_name: adminName,
    actor_role: 'admin',
    old_value: { approval: existing.admin_approval, status: existing.status },
    new_value: { approval: action, status: updates.status || existing.status },
    notes: notes || null,
  });

  await createNotification(supabase, {
    title: `Admin ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Overrode'} Action`,
    message: `Admin ${action} the warehouse action on this order.${notes ? ` Note: ${notes}` : ''}`,
    type: 'assignment',
    warehouse_id: existing.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    action_url: '/admin/warehouse/orders',
  });

  revalidatePath('/admin/warehouse/activity');
  return { success: true };
}

/**
 * Admin edits any assignment status directly.
 */
export async function adminEditAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
  note?: string | null
) {
  const ctx = await requireAdminOnly();
  const { supabase, user } = ctx;
  const adminName = await getProfileName(ctx);

  const existing = await verifyAssignmentAccess(ctx, assignmentId);

  await supabase.from('warehouse_assignments').update({
    status,
    admin_approval: 'pending',
  }).eq('id', assignmentId);

  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    warehouse_id: existing.warehouse_id,
    action: 'admin_status_edit',
    actor_id: user.id,
    actor_name: adminName,
    actor_role: 'admin',
    old_value: { status: existing.status },
    new_value: { status },
    notes: note || null,
  });

  await createNotification(supabase, {
    title: 'Status Updated by Admin',
    message: `Admin changed order status to "${status}".${note ? ` Note: ${note}` : ''}`,
    type: 'assignment',
    warehouse_id: existing.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: existing.entity_id,
    action_url: '/admin/warehouse/orders',
  });

  revalidatePath('/admin/warehouse/activity');
  return { success: true };
}

// ─── Warehouse Actions (staff) ────────────────────────────────────────────────

// Shared helper to update assignment status + sync order + log + notify
async function updateAssignmentStatus(
  ctx: Awaited<ReturnType<typeof requireActor>>,
  assignmentId: string,
  newStatus: AssignmentStatus,
  extra: {
    processing_status?: string;
    packing_status?: string;
    shipping_ready?: boolean;
    notes?: string | null;
  } = {}
) {
  const { supabase, user } = ctx;
  const actorName = await getProfileName(ctx);

  const assignment = await verifyAssignmentAccess(ctx, assignmentId);
  if (assignment.status === 'cancelled') throw new Error('This assignment is cancelled');

  const updates: any = {
    status: newStatus,
    ...(extra.processing_status ? { processing_status: extra.processing_status } : {}),
    ...(extra.packing_status ? { packing_status: extra.packing_status } : {}),
    ...(extra.shipping_ready !== undefined ? { shipping_ready: extra.shipping_ready } : {}),
    ...(extra.notes ? { notes: extra.notes } : {}),
  };

  const nowIso = new Date().toISOString();
  switch (newStatus) {
    case 'accepted': updates.accepted_at = nowIso; break;
    case 'processing': updates.processing_status = 'in_progress'; break;
    case 'packed': updates.packed_at = nowIso; updates.packing_status = 'packed'; break;
    case 'ready_for_dispatch': updates.ready_for_dispatch_at = nowIso; updates.shipping_ready = true; updates.packing_status = 'verified'; break;
    case 'completed': updates.completed_at = nowIso; updates.shipping_ready = true; updates.packing_status = 'verified'; break;
    case 'rejected': break;
  }

  await supabase.from('warehouse_assignments').update(updates).eq('id', assignmentId);

  // Sync order table
  const syncData: any = {
    packing_status: updates.packing_status || assignment.packing_status,
    shipping_ready: updates.shipping_ready ?? assignment.shipping_ready,
  };
  if (newStatus === 'accepted') {
    syncData.warehouse_status = 'accepted';
    syncData.status = 'warehouse_reviewing';
    syncData.warehouse_staff_id = user.id;
  }
  if (newStatus === 'rejected') {
    syncData.warehouse_status = 'rejected';
    syncData.status = 'warehouse_rejected';
    syncData.warehouse_notes = extra.notes || assignment.notes || null;
  }
  if (newStatus === 'processing') {
    syncData.warehouse_status = 'preparing';
    syncData.status = 'processing';
  }
  if (newStatus === 'packed') {
    syncData.packing_status = 'packed';
    syncData.packed_at = nowIso;
  }
  if (newStatus === 'ready_for_dispatch') {
    syncData.warehouse_status = 'ready_for_dispatch';
    syncData.status = 'ready_for_dispatch';
    syncData.ready_for_dispatch_at = nowIso;
  }
  if (newStatus === 'completed') {
    syncData.warehouse_status = 'completed';
    syncData.status = 'order_confirmed';
  }
  await supabase.from('orders').update(syncData).eq('id', assignment.entity_id);

  // Log
  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    warehouse_id: assignment.warehouse_id,
    action: `status_${newStatus}`,
    actor_id: user.id,
    actor_name: actorName,
    actor_role: ctx.isAdmin ? 'admin' : 'warehouse_staff',
    old_value: { status: assignment.status },
    new_value: { status: newStatus, ...updates },
    notes: extra.notes || null,
  });

  // Notify admin — warehouse staff should notify admins (broadcast)
  const itemLabel = `Order ${assignment.entity_id.slice(0, 8)}`;
  await createNotification(supabase, {
    title: `Warehouse Status Update: ${newStatus.replace(/_/g, ' ')}`,
    message: `${itemLabel} status changed to "${newStatus.replace(/_/g, ' ')}" by ${actorName}.`,
    type: 'warehouse',
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    action_url: '/admin/warehouse/activity',
  });

  // Notify warehouse staff too (so their dashboard updates)
  await createNotification(supabase, {
    title: `Status Updated: ${newStatus.replace(/_/g, ' ')}`,
    message: `${itemLabel} updated to "${newStatus.replace(/_/g, ' ')}".`,
    type: 'warehouse',
    warehouse_id: assignment.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    action_url: '/admin/warehouse/orders',
  });

  revalidatePath('/admin/warehouse/orders');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/warehouse/activity');

  return { success: true, assignment };
}

export async function warehouseAcceptAssignment(assignmentId: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  return updateAssignmentStatus(ctx, assignmentId, 'accepted', { notes: ctx.profile.full_name ? `Accepted by ${ctx.profile.full_name}` : 'Accepted by warehouse staff' });
}

export async function warehouseRejectAssignment(assignmentId: string, reason: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  if (!reason.trim()) throw new Error('A rejection reason is required');
  return updateAssignmentStatus(ctx, assignmentId, 'rejected', { notes: reason });
}

export async function warehouseStartProcessing(assignmentId: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  return updateAssignmentStatus(ctx, assignmentId, 'processing', { processing_status: 'in_progress' });
}

export async function warehouseMarkPacked(assignmentId: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  return updateAssignmentStatus(ctx, assignmentId, 'packed', { packing_status: 'packed' });
}

export async function warehouseMarkReadyForDispatch(assignmentId: string, note?: string | null) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  return updateAssignmentStatus(ctx, assignmentId, 'ready_for_dispatch', {
    packing_status: 'verified',
    shipping_ready: true,
    notes: note || null,
  });
}

export async function warehouseMarkCompleted(assignmentId: string, note?: string | null) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  return updateAssignmentStatus(ctx, assignmentId, 'completed', {
    packing_status: 'verified',
    shipping_ready: true,
    notes: note || null,
  });
}

export async function warehouseUpdateNotes(assignmentId: string, notes: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  const { supabase, user } = ctx;
  const actorName = await getProfileName(ctx);
  const assignment = await verifyAssignmentAccess(ctx, assignmentId);

  await supabase.from('warehouse_assignments').update({ notes }).eq('id', assignmentId);

  await logActivity(supabase, {
    assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    warehouse_id: assignment.warehouse_id,
    action: 'notes_updated',
    actor_id: user.id,
    actor_name: actorName,
    actor_role: ctx.isAdmin ? 'admin' : 'warehouse_staff',
    old_value: { notes: assignment.notes },
    new_value: { notes },
  });

  await createNotification(supabase, {
    title: 'Notes Updated',
    message: `${actorName} added notes to this order.`,
    type: 'warehouse',
    warehouse_id: assignment.warehouse_id,
    warehouse_assignment_id: assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    action_url: '/admin/warehouse/activity',
  });

  revalidatePath('/admin/warehouse/orders');
  return { success: true };
}

// ─── Packing Files ────────────────────────────────────────────────────────────

export async function uploadPackingFile(params: {
  assignmentId: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  note?: string | null;
}) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  const { supabase, user } = ctx;
  const actorName = await getProfileName(ctx);
  const assignment = await verifyAssignmentAccess(ctx, params.assignmentId);

  const { data: file, error } = await supabase.from('warehouse_packing_files').insert({
    assignment_id: params.assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    warehouse_id: assignment.warehouse_id,
    file_url: params.fileUrl,
    file_name: params.fileName,
    mime_type: params.mimeType || null,
    file_size: params.fileSize || null,
    note: params.note || null,
    uploaded_by: user.id,
    uploaded_by_name: actorName,
  }).select('*').single();

  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    assignment_id: params.assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    warehouse_id: assignment.warehouse_id,
    action: 'packing_file_uploaded',
    actor_id: user.id,
    actor_name: actorName,
    actor_role: ctx.isAdmin ? 'admin' : 'warehouse_staff',
    new_value: { file_name: params.fileName },
    notes: params.note || null,
  });

  await createNotification(supabase, {
    title: 'Packing File Uploaded',
    message: `${actorName} uploaded "${params.fileName}".`,
    type: 'warehouse',
    warehouse_id: assignment.warehouse_id,
    warehouse_assignment_id: params.assignmentId,
    entity_type: 'order',
    entity_id: assignment.entity_id,
    action_url: '/admin/warehouse/activity',
  });

  revalidatePath('/admin/warehouse/orders');
  return { success: true, file };
}

export async function deletePackingFile(fileId: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  const { supabase, user } = ctx;
  const actorName = await getProfileName(ctx);

  const { data: file } = await supabase
    .from('warehouse_packing_files')
    .select('*')
    .eq('id', fileId)
    .single();
  if (!file) throw new Error('File not found');

  await verifyWarehouseAccess(ctx, file.warehouse_id);

  await supabase.from('warehouse_packing_files').delete().eq('id', fileId);

  await logActivity(supabase, {
    assignment_id: file.assignment_id,
    entity_type: 'order',
    entity_id: file.entity_id,
    warehouse_id: file.warehouse_id,
    action: 'packing_file_deleted',
    actor_id: user.id,
    actor_name: actorName,
    actor_role: ctx.isAdmin ? 'admin' : 'warehouse_staff',
    old_value: { file_name: file.file_name },
  });

  revalidatePath('/admin/warehouse/orders');
  return { success: true };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get order assignments for a warehouse (staff) with joined order info.
 */
export async function getWarehouseAssignments(warehouseId: string, entityType?: AssignmentEntityType) {
  const ctx = await requireActor();
  await verifyWarehouseAccess(ctx, warehouseId);

  let query = ctx.supabase
    .from('warehouse_assignments')
    .select(
      `*,
        warehouses(name, location),
        assigned_by_profile:assigned_by(full_name, email),
        order:entity_id!inner(
          id, order_number, customer_name, customer_phone, customer_email, customer_address,
          status, warehouse_status, amount, total, product_details, created_at, updated_at,
          packing_status, shipping_ready, assignment_priority
        )`
    )
    .eq('warehouse_id', warehouseId)
    .eq('entity_type', 'order')
    .neq('status', 'cancelled')
    .order('assigned_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('getWarehouseAssignments error:', error);
    throw new Error(error.message);
  }
  return data || [];
}

/**
 * Admin — get all order assignments with optional filtering.
 */
export async function getAllAssignments(options?: {
  entityType?: AssignmentEntityType;
  warehouseId?: string;
  status?: AssignmentStatus;
  search?: string;
}) {
  const ctx = await requireAdminOnly();
  const { supabase } = ctx;

  let query = supabase
    .from('warehouse_assignments')
    .select(
      `*,
        warehouses(name, location),
        assigned_by_profile:assigned_by(full_name, email),
        admins:admin_approval_by(full_name, email)`
    )
    .order('assigned_at', { ascending: false });

  if (options?.entityType) query = query.eq('entity_type', options.entityType);
  if (options?.warehouseId) query = query.eq('warehouse_id', options.warehouseId);
  if (options?.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let result = data || [];

  // For search, we need entity names — do a secondary fetch of IDs
  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter((a: any) => {
      if ((a.assigned_by_name || '').toLowerCase().includes(q)) return true;
      if ((a.warehouses?.name || '').toLowerCase().includes(q)) return true;
      if (a.entity_id?.toLowerCase().includes(q)) return true;
      return false;
    });
  }

  return result;
}

/**
 * Get full activity log (admin sees all, staff sees their warehouse).
 */
export async function getWarehouseActivity(options?: {
  warehouseId?: string;
  entityType?: AssignmentEntityType;
  entityId?: string;
  limit?: number;
}) {
  const ctx = await requireActor();
  const { supabase } = ctx;

  let query = supabase
    .from('warehouse_activity_logs')
    .select('*, warehouses(name), actor:actor_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(options?.limit || 100);

  if (ctx.isAdmin && options?.warehouseId) {
    query = query.eq('warehouse_id', options.warehouseId);
  } else if (!ctx.isAdmin) {
    if (!ctx.profile.assigned_warehouse_id) throw new Error('No warehouse assigned');
    query = query.eq('warehouse_id', ctx.profile.assigned_warehouse_id);
  }

  if (options?.entityType) query = query.eq('entity_type', options.entityType);
  if (options?.entityId) query = query.eq('entity_id', options.entityId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get packing files for an assignment.
 */
export async function getPackingFiles(assignmentId: string) {
  const ctx = await requireActor();
  const { supabase } = ctx;

  // Verify access first
  await verifyAssignmentAccess(ctx, assignmentId);

  const { data, error } = await supabase
    .from('warehouse_packing_files')
    .select('*, uploader:uploaded_by(full_name, email)')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Get dashboard stats for warehouse staff.
 */
export async function getWarehouseDashboardStats() {
  const ctx = await requireActor();
  if (!ctx.isWarehouseStaff && !ctx.isAdmin) throw new Error('Forbidden');

  const { supabase } = ctx;
  const targetWarehouseId = ctx.profile.assigned_warehouse_id;

  // If admin with no specific warehouse — return aggregate across all
  if (ctx.isAdmin && !targetWarehouseId) {
    const { count: totalAssignments } = await supabase
      .from('warehouse_assignments')
      .select('*', { count: 'exact', head: true });
    const { count: pendingApproval } = await supabase
      .from('warehouse_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('admin_approval', 'pending')
      .in('status', ['packed', 'ready_for_dispatch', 'completed']);
    const { count: activeOrders } = await supabase
      .from('warehouse_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'order')
      .neq('status', 'cancelled')
      .neq('status', 'completed');
    const { count: awaitingAccept } = await supabase
      .from('warehouse_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    return {
      totalAssignments: totalAssignments || 0,
      pendingApproval: pendingApproval || 0,
      activeOrders: activeOrders || 0,
      awaitingAccept: awaitingAccept || 0,
      activeWarehouses: await supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('is_active', true).then(r => r.count || 0),
    };
  }

  if (!targetWarehouseId) return null;

  const { count: totalAssignments } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .neq('status', 'cancelled');
  const { count: activeOrders } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('entity_type', 'order')
    .neq('status', 'cancelled')
    .neq('status', 'completed');
  const { count: awaitingAccept } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('status', 'assigned');
  const { count: packingCount } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .in('packing_status', ['in_progress', 'packed']);
  const { count: readyCount } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('status', 'ready_for_dispatch');
  const { count: completedCount } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('status', 'completed');
  const { count: highPriority } = await supabase
    .from('warehouse_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('priority', 'urgent')
    .neq('status', 'cancelled')
    .neq('status', 'completed');

  const { count: unreadNotifications } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('warehouse_id', targetWarehouseId)
    .eq('is_read', false);

  return {
    totalAssignments: totalAssignments || 0,
    activeOrders: activeOrders || 0,
    awaitingAccept: awaitingAccept || 0,
    packingCount: packingCount || 0,
    readyCount: readyCount || 0,
    completedCount: completedCount || 0,
    highPriority: highPriority || 0,
    unreadNotifications: unreadNotifications || 0,
  };
}

// ─── Legacy order workflow integration ────────────────────────────────────────

/**
 * Legacy wrapper for assignWarehouseToOrder to also create an assignment.
 */
export async function assignWarehouseToOrderLegacy(
  orderId: string,
  warehouseId: string,
  notes?: string | null,
) {
  const result = await assignItemToWarehouse({
    entityType: 'order',
    entityId: orderId,
    warehouseId,
    notes: notes || null,
  });
  return result;
}

/**
 * Legacy wrapper — accept order (creates/updates assignment).
 */
export async function warehouseAcceptOrderLegacy(orderId: string, warehouseId: string) {
  const ctx = await requireActor();
  if (!ctx.isAdmin && !ctx.isWarehouseStaff) throw new Error('Forbidden');
  const { supabase } = ctx;

  // Upsert assignment as accepted
  const { data: assignment } = await supabase
    .from('warehouse_assignments')
    .upsert({
      entity_type: 'order',
      entity_id: orderId,
      warehouse_id: warehouseId,
      status: 'accepted',
      processing_status: 'not_started',
      packing_status: 'not_started',
      shipping_ready: false,
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'entity_type,entity_id,warehouse_id' })
    .select('*')
    .single();

  if (!assignment) throw new Error('Failed to create assignment');

  const actorName = await getProfileName(ctx);
  await logActivity(supabase, {
    assignment_id: assignment.id,
    entity_type: 'order',
    entity_id: orderId,
    warehouse_id: warehouseId,
    action: 'status_accepted',
    actor_id: ctx.user.id,
    actor_name: actorName,
    actor_role: ctx.isAdmin ? 'admin' : 'warehouse_staff',
    new_value: { status: 'accepted' },
  });

  return updateAssignmentStatus(ctx, assignment.id, 'accepted');
}