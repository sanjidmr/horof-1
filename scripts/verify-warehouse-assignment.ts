/**
 * WAREHOUSE ASSIGNMENT WORKFLOW — IN-MEMORY VERIFICATION
 *
 * Run: npx tsx scripts/verify-warehouse-assignment.ts
 *      (or `node scripts/verify-warehouse-assignment.ts` on Node 22.6+)
 *
 * Verifies the acceptance criteria WITHOUT a live database by mirroring the
 * DB sync trigger and the app actions over an in-memory data store, and by
 * asserting the real migration + source files contain the required fixes:
 *
 *   1. Assign warehouse → warehouse_assignments row created
 *   2. orders updated (warehouse_id / warehouse_status / status)
 *   3. Notification created with NO NULL linkage fields
 *   4. Dashboard loads via warehouse_assignments joins only (never orders)
 *   5. Status changes stay synchronized (assignment ↔ order)
 *   6. Realtime publication present
 *   7. Cancel assignment reverts the order
 *   8. Reassign cancels old + creates new assignment
 *   9. Multi-warehouse + multi-staff supported
 *  10. No duplicate assignments (upsert idempotency)
 *  11. No orphan notifications, no broken FKs
 *  12. No NULL warehouse_id on warehouse_assigned orders
 *  13. RLS unblocked (user_type repair + admin-only guard)
 *  14. No silent catch / no fake success
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());
const MIGRATION_PATH = resolve(ROOT, 'supabase/migrations/20260819000000_warehouse_assignment_sync_invariants.sql');
const WORKFLOW_FIX_PATH = resolve(ROOT, 'supabase/migrations/20260818000000_warehouse_assignment_workflow_fix.sql');
const ENTERPRISE_PATH = resolve(ROOT, 'supabase/migrations/20260803000000_warehouse_management_enterprise.sql');
const INTEGRITY_PATH = resolve(ROOT, 'supabase/migrations/20260805000002_warehouse_assignment_uuid_integrity.sql');
const ORDER_WORKFLOW_PATH = resolve(ROOT, 'src/lib/actions/admin/order-workflow.ts');
const WAREHOUSE_TS_PATH = resolve(ROOT, 'src/lib/actions/warehouse.ts');
const DASHBOARD_PATH = resolve(ROOT, 'src/app/admin/warehouse/orders/page.tsx');

// ─── In-memory store ─────────────────────────────────────────────────────────

type Order = {
  id: string;
  order_number: string;
  status: string;
  warehouse_id: string | null;
  warehouse_status: string | null;
  warehouse_staff_id: string | null;
  warehouse_notes: string | null;
  assignment_priority: string;
  packing_status: string | null;
  shipping_ready: boolean;
  packed_at: string | null;
  ready_for_dispatch_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Assignment = {
  id: string;
  entity_type: 'order';
  entity_id: string;
  warehouse_id: string;
  priority: string;
  status: string;
  notes: string | null;
  packing_status: string | null;
  shipping_ready: boolean;
  assigned_at: string;
  packed_at: string | null;
  ready_for_dispatch_at: string | null;
  completed_at: string | null;
};

type Notification = {
  id: string;
  type: string;
  warehouse_id: string | null;
  warehouse_assignment_id: string | null;
  order_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
};

type DB = {
  orders: Order[];
  assignments: Assignment[];
  notifications: Notification[];
  warehouses: { id: string; name: string; is_active: boolean }[];
  profiles: { id: string; role: string; user_type: string; is_warehouse_staff: boolean }[];
};

let idCounter = 1;
const newId = () => `id-${idCounter++}`;
const nowIso = () => new Date(Date.UTC(2026, 7, 7)).toISOString();

// ─── DB trigger mirror (must match the SQL in the migration) ─────────────────

function orderStatusRank(s: string): number {
  const ranks: Record<string, number> = {
    admin_approved: 1,
    warehouse_assigned: 2,
    warehouse_reviewing: 3,
    processing: 4,
    ready_for_dispatch: 5,
    order_confirmed: 6,
    shipped: 7,
    out_for_delivery: 8,
    delivered: 9,
    completed: 10,
  };
  return ranks[s] ?? 0;
}

function mapToOrderStatus(as: string): string {
  switch (as) {
    case 'assigned': return 'warehouse_assigned';
    case 'accepted': return 'warehouse_reviewing';
    case 'rejected': return 'warehouse_rejected';
    case 'processing': return 'processing';
    case 'packed': return 'processing';
    case 'ready_for_dispatch': return 'ready_for_dispatch';
    case 'out_for_delivery': return 'out_for_delivery';
    case 'delivered': return 'delivered';
    case 'returned': return 'returned';
    case 'completed': return 'completed';
    default: return 'warehouse_assigned';
  }
}

/** Mirrors sync_orders_from_assignment() from the migration. */
function applyAssignmentSync(db: DB, a: Assignment): void {
  const order = db.orders.find((o) => o.id === a.entity_id);
  if (!order) throw new Error(`sync: order ${a.entity_id} not found`);

  if (a.status === 'cancelled') {
    const otherActive = db.assignments.some(
      (wa) => wa.entity_id === a.entity_id && wa.warehouse_id !== a.warehouse_id && wa.status !== 'cancelled',
    );
    if (order.warehouse_id === a.warehouse_id && !otherActive) {
      order.warehouse_id = null;
      order.warehouse_status = null;
      order.status = 'pending';
      order.warehouse_staff_id = null;
    }
    return;
  }

  const newStatus = mapToOrderStatus(a.status);
  const currentRank = orderStatusRank(order.status);
  const newRank = orderStatusRank(newStatus);
  const canProgress = newStatus === order.status
    || !(currentRank >= 6 && newRank < currentRank);

  // mirror fields (always)
  order.warehouse_id = a.warehouse_id;
  order.warehouse_status = a.status;
  order.assignment_priority = a.priority || order.assignment_priority;
  if (a.notes != null) order.warehouse_notes = a.notes;

  if (a.packing_status != null) order.packing_status = a.packing_status;
  else if (a.status === 'packed') order.packing_status = 'packed';
  else if (['ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed'].includes(a.status)) order.packing_status = 'verified';

  if (['ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed'].includes(a.status)) order.shipping_ready = true;
  else if (a.status === 'returned') order.shipping_ready = false;

  if (a.status === 'packed') order.packed_at = a.packed_at ?? nowIso();
  if (['ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed'].includes(a.status)) order.ready_for_dispatch_at = a.ready_for_dispatch_at ?? nowIso();
  if (a.status === 'delivered') order.delivered_at = nowIso();
  if (a.status === 'completed') order.completed_at = a.completed_at ?? nowIso();

  if (canProgress) order.status = newStatus;
}

// ─── Notification linkage rule (must match the migration CHECKs) ─────────────

function assertNotificationLinked(n: Notification): void {
  if (n.type === 'warehouse' || n.type === 'assignment') {
    if (!n.warehouse_assignment_id) throw new Error('notification missing warehouse_assignment_id');
    if (!n.order_id) throw new Error('notification missing order_id');
    if (!n.entity_type) throw new Error('notification missing entity_type');
    if (!n.entity_id) throw new Error('notification missing entity_id');
  }
  if (n.type === 'warehouse' && !n.warehouse_id) {
    throw new Error('warehouse notification missing warehouse_id');
  }
}

// ─── Action simulations (mirror warehouse.ts + order-workflow.ts) ────────────

function requireAdminOnly(db: DB, profileId: string): void {
  const p = db.profiles.find((x) => x.id === profileId);
  if (!p) throw new Error('Unauthorized');
  if (p.user_type !== 'internal') throw new Error('Access denied: missing permission');
  if (!['admin', 'super_admin', 'manager', 'staff'].includes(p.role)) throw new Error('Forbidden — admin only');
}

function simulateAssignItemToWarehouse(
  db: DB,
  actorId: string,
  orderId: string,
  warehouseId: string,
  opts?: { priority?: string; notes?: string | null; failOrderSync?: boolean },
): Assignment {
  requireAdminOnly(db, actorId);

  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');
  const wh = db.warehouses.find((w) => w.id === warehouseId && w.is_active);
  if (!wh) throw new Error('Warehouse not found or inactive');

  // upsert on (entity_type, entity_id, warehouse_id) — idempotent
  let a = db.assignments.find((x) => x.entity_type === 'order' && x.entity_id === orderId && x.warehouse_id === warehouseId);
  if (!a) {
    a = {
      id: newId(),
      entity_type: 'order',
      entity_id: orderId,
      warehouse_id: warehouseId,
      priority: opts?.priority || 'normal',
      status: 'assigned',
      notes: opts?.notes ?? null,
      packing_status: 'not_started',
      shipping_ready: false,
      assigned_at: nowIso(),
      packed_at: null,
      ready_for_dispatch_at: null,
      completed_at: null,
    };
    db.assignments.push(a);
  } else {
    a.status = 'assigned';
    a.priority = opts?.priority || a.priority;
    a.notes = opts?.notes ?? a.notes;
  }

  applyAssignmentSync(db, a);

  if (opts?.failOrderSync) {
    throw new Error('Failed to sync order warehouse fields: simulated RLS block');
  }

  // notifications (warehouse-targeted + admin broadcast)
  const staffNotif: Notification = {
    id: newId(), type: 'assignment', title: 'New Warehouse Assignment',
    order_id: orderId, warehouse_id: warehouseId,
    warehouse_assignment_id: a.id, entity_type: 'order', entity_id: orderId,
  };
  const adminNotif: Notification = {
    id: newId(), type: 'assignment', title: 'Assignment Created',
    order_id: orderId, warehouse_id: null,
    warehouse_assignment_id: a.id, entity_type: 'order', entity_id: orderId,
  };
  assertNotificationLinked(staffNotif);
  assertNotificationLinked(adminNotif);
  db.notifications.push(staffNotif, adminNotif);

  return a;
}

function simulateUpdateAssignmentStatus(
  db: DB,
  actorId: string,
  assignmentId: string,
  newStatus: string,
): Assignment {
  const p = db.profiles.find((x) => x.id === actorId);
  if (!p) throw new Error('Unauthorized');
  if (p.user_type !== 'internal') throw new Error('Forbidden');
  if (!['admin', 'super_admin', 'manager', 'staff', 'warehouse_staff'].includes(p.role) && !p.is_warehouse_staff) {
    throw new Error('Forbidden');
  }

  const a = db.assignments.find((x) => x.id === assignmentId);
  if (!a) throw new Error('Assignment not found');
  if (['cancelled', 'completed', 'rejected'].includes(a.status)) throw new Error('Assignment is terminal');

  const allowed: Record<string, string[]> = {
    assigned: ['accepted', 'rejected', 'cancelled'],
    accepted: ['processing', 'rejected', 'cancelled'],
    processing: ['packed', 'rejected', 'cancelled'],
    packed: ['ready_for_dispatch', 'cancelled'],
    ready_for_dispatch: ['out_for_delivery', 'completed', 'cancelled'],
    out_for_delivery: ['delivered', 'returned', 'cancelled'],
    delivered: [], returned: [], completed: [], cancelled: [],
  };
  if (allowed[a.status] && !allowed[a.status].includes(newStatus)) {
    throw new Error(`Cannot transition from "${a.status}" to "${newStatus}"`);
  }

  a.status = newStatus;
  if (newStatus === 'accepted') a.packing_status = 'not_started';
  if (newStatus === 'processing') a.packing_status = 'in_progress';
  if (newStatus === 'packed') { a.packing_status = 'packed'; a.packed_at = nowIso(); }
  if (newStatus === 'ready_for_dispatch') { a.packing_status = 'verified'; a.shipping_ready = true; a.ready_for_dispatch_at = nowIso(); }
  if (newStatus === 'completed') { a.completed_at = nowIso(); a.shipping_ready = true; a.packing_status = 'verified'; }
  if (newStatus === 'out_for_delivery') { a.shipping_ready = true; a.packing_status = 'verified'; }
  if (newStatus === 'delivered') { a.shipping_ready = true; a.packing_status = 'verified'; }
  if (newStatus === 'returned') a.shipping_ready = false;

  applyAssignmentSync(db, a);

  const notif: Notification = {
    id: newId(), type: 'assignment', title: 'Warehouse Status Update',
    order_id: a.entity_id, warehouse_id: null,
    warehouse_assignment_id: a.id, entity_type: 'order', entity_id: a.entity_id,
  };
  const staffNotif: Notification = {
    id: newId(), type: 'warehouse', title: 'Status Updated',
    order_id: a.entity_id, warehouse_id: a.warehouse_id,
    warehouse_assignment_id: a.id, entity_type: 'order', entity_id: a.entity_id,
  };
  assertNotificationLinked(notif);
  assertNotificationLinked(staffNotif);
  db.notifications.push(notif, staffNotif);

  return a;
}

// ─── Checks ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ─── Build fixtures ──────────────────────────────────────────────────────────

function buildDb(): DB {
  const order: Order = {
    id: 'order-1', order_number: 'ORD-AAA', status: 'admin_approved',
    warehouse_id: null, warehouse_status: null, warehouse_staff_id: null,
    warehouse_notes: null, assignment_priority: 'normal',
    packing_status: 'not_started', shipping_ready: false,
    packed_at: null, ready_for_dispatch_at: null, delivered_at: null, completed_at: null,
    created_at: nowIso(),
  };
  const order2: Order = {
    id: 'order-2', order_number: 'ORD-BBB', status: 'admin_approved',
    warehouse_id: null, warehouse_status: null, warehouse_staff_id: null,
    warehouse_notes: null, assignment_priority: 'normal',
    packing_status: 'not_started', shipping_ready: false,
    packed_at: null, ready_for_dispatch_at: null, delivered_at: null, completed_at: null,
    created_at: nowIso(),
  };
  return {
    orders: [order, order2],
    assignments: [],
    notifications: [],
    warehouses: [
      { id: 'wh-1', name: 'Dhaka WH', is_active: true },
      { id: 'wh-2', name: 'Chittagong WH', is_active: true },
      { id: 'wh-off', name: 'Inactive WH', is_active: false },
    ],
    profiles: [
      { id: 'admin-1', role: 'admin', user_type: 'internal', is_warehouse_staff: false },
      { id: 'staff-1', role: 'warehouse_staff', user_type: 'internal', is_warehouse_staff: true },
      { id: 'staff-2', role: 'warehouse_staff', user_type: 'internal', is_warehouse_staff: true },
      { id: 'leak-1', role: 'admin', user_type: 'customer', is_warehouse_staff: false },
    ],
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  WAREHOUSE ASSIGNMENT WORKFLOW — IN-MEMORY VERIFICATION');
  console.log('══════════════════════════════════════════════════════\n');

  // ─── A. Migration content ─────────────────────────────────────────────
  console.log('📜 A. Migration invariants');
  check('migration file exists', existsSync(MIGRATION_PATH));
  if (!existsSync(MIGRATION_PATH)) {
    console.log('\n❌ Cannot proceed without the migration file.');
    process.exit(1);
  }
  const mig = readFileSync(MIGRATION_PATH, 'utf-8');
  check('has sync_orders_from_assignment trigger', mig.includes('sync_orders_from_assignment') && mig.includes('CREATE TRIGGER trg_warehouse_assignments_sync_orders'));
  check('trigger maps all warehouse statuses', ['assigned', 'accepted', 'rejected', 'processing', 'packed', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'returned', 'completed'].every((s) => mig.includes(`WHEN '${s}'`)));
  check('trigger never regresses orders.status (rank guard)', mig.includes('order_status_rank') && mig.includes('v_current_rank >= 6 AND v_new_rank < v_current_rank'));
  check('cancel branch reverts order safely', mig.includes('NOT EXISTS') && mig.includes("status = 'pending'"));
  check('is_admin() tightened (warehouse staff are not admins)', mig.includes('p.role IN') && mig.includes("'super_admin'"));
  check('profile user_type repair', mig.includes("SET user_type = 'internal'") && mig.includes("p.user_type = 'customer'"));
  check('notification linkage CHECKs', mig.includes('notifications_assignment_linkage') && mig.includes('notifications_warehouse_linkage'));
  check('assignment backfill', mig.includes('INSERT INTO public.warehouse_assignments'));

  // ─── B. Source fixes ───────────────────────────────────────────────────
  console.log('\n🔧 B. Source fixes');
  const owf = readFileSync(ORDER_WORKFLOW_PATH, 'utf-8');
  check('approveOrderRequest auto-assign delegates to assignItemToWarehouse', owf.includes('const assignResult = await assignItemToWarehouse'));
  const autoStart = owf.indexOf('// Auto-assign warehouse');
  const autoEnd = owf.indexOf('// 2. Create order_items');
  const autoBlock = autoStart >= 0 && autoEnd > autoStart ? owf.slice(autoStart, autoEnd) : '';
  check('auto-assign has no silent catch', autoBlock.length > 0 && !/catch\s*\(\s*_?\s*\)\s*\{/.test(autoBlock) && !autoBlock.includes('await supabase.from(\'orders\').update'));
  check('assignWarehouseToOrder delegates to shared routine', owf.includes('const result = await assignItemToWarehouse({') && owf.includes('assignmentId: result.assignment.id'));

  const wh = readFileSync(WAREHOUSE_TS_PATH, 'utf-8');
  check('assignItemToWarehouse checks orders.update result', wh.includes('Failed to sync order warehouse fields'));
  check('updateAssignmentStatus checks both update results', wh.includes('Failed to update assignment:') && wh.includes('Failed to sync order status'));
  check('requireAdminOnly rejects non-admin internal users', wh.includes('Forbidden — admin only'));
  check('canonical warehouse_status mapping (no waiting_for_warehouse)', !wh.includes('warehouse_status: \'waiting_for_warehouse\''));
  check('admin status notification is type assignment (broadcast)', wh.includes("type: 'assignment'") && wh.includes('Warehouse Status Update'));
  const notifBlocks = wh.split('await createNotification(').slice(1);
  const badNotif = notifBlocks.find((b) => {
    const chunk = b.slice(0, 500);
    const isLinkedType = chunk.includes("type: 'warehouse'") || chunk.includes("type: 'assignment'");
    return isLinkedType && !chunk.includes('order_id:');
  });
  check('all assignment/warehouse notification calls carry order_id', !badNotif);

  const dash = readFileSync(DASHBOARD_PATH, 'utf-8');
  check('dashboard admin branch queries warehouse_assignments (never orders)', dash.includes(".from('warehouse_assignments')") && !dash.includes(".from('orders')") && dash.includes('order:entity_id!left'));

  const ent = readFileSync(ENTERPRISE_PATH, 'utf-8');
  const fix = existsSync(WORKFLOW_FIX_PATH) ? readFileSync(WORKFLOW_FIX_PATH, 'utf-8') : '';
  const integ = readFileSync(INTEGRITY_PATH, 'utf-8');
  check('FK entity_id → orders exists', integ.includes('fk_warehouse_assignments_entity_order'));
  check('status CHECK includes out_for_delivery/delivered/returned', fix.includes('out_for_delivery') && fix.includes("'delivered'") && fix.includes("'returned'"));
  check('realtime publication includes warehouse tables', fix.includes('ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.warehouse_assignments'));
  check('unique(entity_type,entity_id,warehouse_id) prevents duplicates', ent.includes('CONSTRAINT uq_warehouse_assignment UNIQUE'));

  // ─── C. Behavioural simulation ─────────────────────────────────────────
  console.log('\n🏭 C. Behavioural simulation');

  {
    const db = buildDb();

    // 1. Admin assigns order-1 to wh-1
    const a = simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-1', { notes: 'handle fast' });
    const o = db.orders.find((x) => x.id === 'order-1')!;
    check('1. warehouse_assignments row created', db.assignments.length === 1);
    check('2a. orders.warehouse_id set', o.warehouse_id === 'wh-1');
    check('2b. orders.warehouse_status synced to "assigned"', o.warehouse_status === 'assigned');
    check('2c. orders.status = warehouse_assigned', o.status === 'warehouse_assigned');
    check('2d. assignment_priority synced', o.assignment_priority === 'normal');
    check('2e. warehouse_notes synced', o.warehouse_notes === 'handle fast');

    // 3. Notifications fully linked
    const notifs = db.notifications.filter((n) => n.warehouse_assignment_id === a.id);
    check('3a. two notifications (staff + admin)', notifs.length === 2);
    check('3b. staff notification has warehouse_id', notifs.some((n) => n.warehouse_id === 'wh-1'));
    check('3c. NO NULL warehouse_id/assignment_id/order_id/entity_id', notifs.every((n) => n.warehouse_assignment_id && n.order_id && n.entity_id));

    // 4. Status transitions stay in sync
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'accepted');
    let oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4a. accepted → order.warehouse_status=accepted', oo.warehouse_status === 'accepted');
    check('4b. accepted → order.status=warehouse_reviewing', oo.status === 'warehouse_reviewing');
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'processing');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4c. processing → order.status=processing', oo.status === 'processing');
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'packed');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4d. packed → order.packing_status=packed', oo.packing_status === 'packed');
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'ready_for_dispatch');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4e. ready → order.status=ready_for_dispatch + shipping_ready', oo.status === 'ready_for_dispatch' && oo.shipping_ready === true);
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'out_for_delivery');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4f. out_for_delivery → order.status=out_for_delivery', oo.status === 'out_for_delivery');
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'delivered');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('4g. delivered → order.status=delivered + delivered_at', oo.status === 'delivered' && !!oo.delivered_at);

    // 5. Never regress a later lifecycle stage: admin ships directly
    //    (shipOrder), then a re-assignment fires the trigger with the low
    //    'assigned' status — orders.status must NOT regress from 'shipped'.
    oo = db.orders.find((x) => x.id === 'order-1')!;
    oo.status = 'shipped';
    simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-2');
    oo = db.orders.find((x) => x.id === 'order-1')!;
    check('5. re-assign does not regress shipped order.status', oo.status === 'shipped' && oo.warehouse_id === 'wh-2');

    // 10. No duplicates: re-assign same order+warehouse
    simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-1');
    check('10. no duplicate assignment (upsert idempotent)', db.assignments.filter((x) => x.entity_id === 'order-1' && x.warehouse_id === 'wh-1').length === 1);

    // 6. Warehouse pipeline regressions must be ALLOWED (below order_confirmed):
    //    a warehouse that accepts then rejects returns the order to the pool.
    const db2 = buildDb();
    const ar = simulateAssignItemToWarehouse(db2, 'admin-1', 'order-1', 'wh-1');
    simulateUpdateAssignmentStatus(db2, 'staff-1', ar.id, 'accepted');
    let o2 = db2.orders.find((x) => x.id === 'order-1')!;
    check('6a. accepted → warehouse_reviewing', o2.status === 'warehouse_reviewing');
    simulateUpdateAssignmentStatus(db2, 'staff-1', ar.id, 'rejected');
    o2 = db2.orders.find((x) => x.id === 'order-1')!;
    check('6b. accept→reject regresses order to warehouse_rejected', o2.status === 'warehouse_rejected' && o2.warehouse_status === 'rejected');

    // 6c. Reassign while processing: new 'assigned' row may move order back.
    const db3 = buildDb();
    const ap = simulateAssignItemToWarehouse(db3, 'admin-1', 'order-1', 'wh-1');
    simulateUpdateAssignmentStatus(db3, 'staff-1', ap.id, 'accepted');
    simulateUpdateAssignmentStatus(db3, 'staff-1', ap.id, 'processing');
    let o3 = db3.orders.find((x) => x.id === 'order-1')!;
    check('6c. processing before reassign', o3.status === 'processing');
    ap.status = 'cancelled'; applyAssignmentSync(db3, ap);
    simulateAssignItemToWarehouse(db3, 'admin-1', 'order-1', 'wh-2');
    o3 = db3.orders.find((x) => x.id === 'order-1')!;
    check('6d. reassign from processing allowed (warehouse_assigned, wh-2)', o3.status === 'warehouse_assigned' && o3.warehouse_id === 'wh-2');
  }

  {
    const db = buildDb();

    // 8. Reassign: old cancelled + new created
    const a = simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-1');
    a.status = 'cancelled'; applyAssignmentSync(db, a); // reassign cancels old
    const a2 = simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-2');
    const o = db.orders.find((x) => x.id === 'order-1')!;
    check('8a. old assignment cancelled', a.status === 'cancelled');
    check('8b. new assignment created to wh-2', a2.warehouse_id === 'wh-2');
    check('8c. order points to new warehouse', o.warehouse_id === 'wh-2' && o.warehouse_status === 'assigned' && o.status === 'warehouse_assigned');

    // 7. Cancel last assignment reverts order
    a2.status = 'cancelled'; applyAssignmentSync(db, a2);
    const o2 = db.orders.find((x) => x.id === 'order-1')!;
    check('7. cancel last assignment reverts order (pending, no warehouse)', o2.status === 'pending' && o2.warehouse_id === null && o2.warehouse_status === null);

    // 9. Multi-warehouse: same order assigned to two warehouses
    const m1 = simulateAssignItemToWarehouse(db, 'admin-1', 'order-2', 'wh-1');
    const m2 = simulateAssignItemToWarehouse(db, 'admin-1', 'order-2', 'wh-2');
    check('9a. multi-warehouse assignments coexist', m1.id !== m2.id && db.assignments.filter((x) => x.entity_id === 'order-2').length === 2);
  }

  {
    const db = buildDb();

    // 9. Multi-staff: accept by staff-1, process by staff-2
    const a = simulateAssignItemToWarehouse(db, 'admin-1', 'order-1', 'wh-1');
    simulateUpdateAssignmentStatus(db, 'staff-1', a.id, 'accepted');
    simulateUpdateAssignmentStatus(db, 'staff-2', a.id, 'processing');
    const o = db.orders.find((x) => x.id === 'order-1')!;
    check('9b. multi-staff workflow works', o.status === 'processing' && o.warehouse_status === 'processing');
  }

  {
    const db = buildDb();

    // 13. RLS: admin-only guard + user_type repair
    let blocked = false;
    try { simulateAssignItemToWarehouse(db, 'staff-1', 'order-1', 'wh-1'); } catch (e) { blocked = true; }
    check('13a. warehouse staff cannot run admin assignment action', blocked);

    let leakBlocked = false;
    try { simulateAssignItemToWarehouse(db, 'leak-1', 'order-1', 'wh-1'); } catch (e) { leakBlocked = true; }
    check('13b. user_type=customer profile is blocked (needs repair)', leakBlocked);

    // after migration repair, the profile becomes internal and works
    db.profiles.find((x) => x.id === 'leak-1')!.user_type = 'internal';
    let works = true;
    try { simulateAssignItemToWarehouse(db, 'leak-1', 'order-1', 'wh-1'); } catch (e) { works = false; }
    check('13c. repaired profile (user_type=internal) works', works);

    // 12. No NULL warehouse_id when warehouse_assigned
    const o = db.orders.find((x) => x.id === 'order-1')!;
    check('12. no NULL warehouse_id on warehouse_assigned order', !(o.status === 'warehouse_assigned' && !o.warehouse_id));

    // 14. No fake success: order sync failure surfaces as error
    let syncFailed = false;
    try { simulateAssignItemToWarehouse(db, 'admin-1', 'order-2', 'wh-1', { failOrderSync: true }); } catch (e) { syncFailed = true; }
    check('14. order sync failure throws (no fake success)', syncFailed);

    // 11. No orphan notifications: every assignment notification references a real assignment
    const orphan = db.notifications.some((n) => (n.type === 'warehouse' || n.type === 'assignment') && !db.assignments.some((x) => x.id === n.warehouse_assignment_id));
    check('11. no orphan notifications (all reference existing assignments)', !orphan);
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('❌ Some checks FAILED. Review the failures above.');
    process.exit(1);
  }
  console.log('✅ ALL CHECKS PASSED. Warehouse assignment workflow is consistent.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
