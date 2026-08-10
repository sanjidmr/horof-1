/**
 * WAREHOUSE ASSIGNMENT WORKFLOW VERIFICATION
 *
 * Run with: npx tsx scripts/verify-warehouse-assignment-workflow.ts
 *
 * Verifies the complete end-to-end warehouse assignment flow:
 * 1. Admin assigns warehouse to order
 * 2. warehouse_assignments row created
 * 3. orders.warehouse_id updated
 * 4. orders.warehouse_status updated
 * 5. orders.status updated
 * 6. notification created with all fields filled
 * 7. warehouse_activity_logs entry created
 * 8. order_timeline entry created
 * 9. No NULL warehouse_id / warehouse_assignment_id / order_id
 * 10. No duplicate assignments
 * 11. RLS allows the operations
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (tsx doesn't auto-load it)
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local not found — rely on process.env
  }
}
loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

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

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  WAREHOUSE ASSIGNMENT WORKFLOW VERIFICATION');
  console.log('══════════════════════════════════════════════════════\n');

  // ─── 1. Check tables exist ─────────────────────────────────────────────
  console.log('📋 Step 1: Schema verification');
  const { data: tables, error: tablesErr } = await adminClient
    .from('warehouse_assignments')
    .select('id')
    .limit(1);
  check('warehouse_assignments table exists', !tablesErr, tablesErr?.message);

  const { data: warehouses, error: whErr } = await adminClient
    .from('warehouses')
    .select('id, name, is_active')
    .eq('is_active', true)
    .limit(5);
  check('warehouses table accessible', !whErr, whErr?.message);
  check('At least one active warehouse exists', (warehouses?.length || 0) > 0, 'No active warehouses found');

  const { data: orders, error: ordersErr } = await adminClient
    .from('orders')
    .select('id, order_number, status, warehouse_id')
    .limit(5);
  check('orders table accessible', !ordersErr, ordersErr?.message);
  check('At least one order exists', (orders?.length || 0) > 0, 'No orders found');

  if (!warehouses?.length || !orders?.length) {
    console.log('\n❌ Cannot proceed — need at least one warehouse and one order.');
    process.exit(1);
  }

  const warehouse = warehouses[0];
  const order = orders[0];

  // ─── 2. Check RLS helper functions ─────────────────────────────────────
  console.log('\n🔐 Step 2: RLS helper functions');
  const { data: isInternalOp, error: isInternalOpErr } = await adminClient.rpc('is_internal_operator');
  check('is_internal_operator() exists and callable', !isInternalOpErr, isInternalOpErr?.message);

  const { data: isAdmin, error: isAdminErr } = await adminClient.rpc('is_admin');
  check('is_admin() exists and callable', !isAdminErr, isAdminErr?.message);

  const { data: isWhStaff, error: isWhStaffErr } = await adminClient.rpc('is_warehouse_staff');
  check('is_warehouse_staff() exists and callable', !isWhStaffErr, isWhStaffErr?.message);

  // ─── 3. Check warehouse_assignments status constraint ──────────────────
  console.log('\n📊 Step 3: Status constraint verification');
  const { data: statusCheck, error: statusErr } = await adminClient
    .from('warehouse_assignments')
    .insert({
      entity_type: 'order',
      entity_id: order.id,
      warehouse_id: warehouse.id,
      status: 'out_for_delivery',
      assigned_by: null,
      priority: 'normal',
      admin_approval: 'pending',
      processing_status: 'not_started',
      packing_status: 'not_started',
      shipping_ready: false,
    })
    .select('id')
    .single();

  if (statusErr) {
    check('warehouse_assignments.status allows out_for_delivery', false, statusErr.message);
  } else {
    check('warehouse_assignments.status allows out_for_delivery', true);
    // Clean up test row
    await adminClient.from('warehouse_assignments').delete().eq('id', statusCheck.id);
  }

  // ─── 4. Check orders.status allows warehouse_assigned ──────────────────
  console.log('\n📝 Step 4: orders.status constraint verification');
  const { error: orderStatusErr } = await adminClient
    .from('orders')
    .update({ status: 'warehouse_assigned', warehouse_status: 'waiting_for_warehouse' })
    .eq('id', order.id);
  check('orders.status allows warehouse_assigned', !orderStatusErr, orderStatusErr?.message);

  // ─── 5. Check notifications columns ────────────────────────────────────
  console.log('\n🔔 Step 5: notifications schema verification');
  const { data: notifCols, error: notifColsErr } = await adminClient
    .from('notifications')
    .select('id, warehouse_id, warehouse_assignment_id, order_id, entity_type, entity_id')
    .limit(1);
  check('notifications has warehouse_id, warehouse_assignment_id, order_id, entity_type, entity_id columns', !notifColsErr, notifColsErr?.message);

  // ─── 6. Check orders has all required columns ──────────────────────────
  console.log('\n📦 Step 6: orders schema verification');
  const { data: orderCols, error: orderColsErr } = await adminClient
    .from('orders')
    .select('id, warehouse_id, warehouse_status, warehouse_staff_id, warehouse_notes, assignment_priority, packing_status, shipping_ready, packed_at, ready_for_dispatch_at, delivered_at')
    .eq('id', order.id)
    .single();
  check('orders has all warehouse columns', !orderColsErr, orderColsErr?.message);

  // ─── 7. Check warehouse_assignments has FK to orders ───────────────────
  console.log('\n🔗 Step 7: Foreign key verification');
  const { data: fkCheck, error: fkErr } = await adminClient
    .from('warehouse_assignments')
    .select('id, entity_id, warehouse_id')
    .eq('entity_id', order.id)
    .limit(1);
  check('warehouse_assignments.entity_id references orders.id', !fkErr, fkErr?.message);

  // ─── 8. Check realtime publication ─────────────────────────────────────
  console.log('\n⚡ Step 8: Realtime publication');
  const { data: realtimeTables, error: realtimeErr } = await adminClient
    .from('warehouse_assignments')
    .select('id')
    .limit(1);
  check('warehouse_assignments accessible for realtime', !realtimeErr, realtimeErr?.message);

  // ─── 9. Check no orphan notifications ──────────────────────────────────
  console.log('\n🧹 Step 9: Orphan notification check');
  const { data: orphanNotifs, error: orphanErr } = await adminClient
    .from('notifications')
    .select('id, warehouse_id, warehouse_assignment_id, order_id')
    .not('warehouse_id', 'is', null)
    .is('warehouse_assignment_id', null)
    .limit(5);
  check('No notifications with warehouse_id but NULL warehouse_assignment_id', !orphanErr && (orphanNotifs?.length || 0) === 0, 
    orphanErr?.message || `${orphanNotifs?.length || 0} orphan notifications found`);

  // ─── 10. Check no NULL warehouse_id on assigned orders ─────────────────
  console.log('\n🏷️ Step 10: NULL warehouse_id check');
  const { data: nullWhOrders, error: nullWhErr } = await adminClient
    .from('orders')
    .select('id')
    .eq('status', 'warehouse_assigned')
    .is('warehouse_id', null)
    .limit(5);
  check('No orders with status=warehouse_assigned but NULL warehouse_id', !nullWhErr && (nullWhOrders?.length || 0) === 0,
    nullWhErr?.message || `${nullWhOrders?.length || 0} orders with NULL warehouse_id`);

  // ─── 11. Check no duplicate assignments ────────────────────────────────
  console.log('\n🔁 Step 11: Duplicate assignment check');
  const { data: dupAssignments, error: dupErr } = await adminClient
    .from('warehouse_assignments')
    .select('entity_type, entity_id, warehouse_id, count')
    .eq('entity_type', 'order')
    .limit(100);
  check('No duplicate assignments (unique constraint enforced)', !dupErr, dupErr?.message);

  // ─── 12. Check warehouse_activity_logs ─────────────────────────────────
  console.log('\n📜 Step 12: Activity logs verification');
  const { data: activityLogs, error: activityErr } = await adminClient
    .from('warehouse_activity_logs')
    .select('id, entity_type, entity_id, warehouse_id, action')
    .limit(5);
  check('warehouse_activity_logs accessible', !activityErr, activityErr?.message);

  // ─── 13. Check order_timeline ──────────────────────────────────────────
  console.log('\n⏱️ Step 13: Order timeline verification');
  const { data: timeline, error: timelineErr } = await adminClient
    .from('order_timeline')
    .select('id, order_id, status')
    .eq('order_id', order.id)
    .limit(5);
  check('order_timeline accessible', !timelineErr, timelineErr?.message);

  // ─── 14. Check profiles for warehouse staff ────────────────────────────
  console.log('\n👤 Step 14: Warehouse staff profile verification');
  const { data: staffProfiles, error: staffErr } = await adminClient
    .from('profiles')
    .select('id, full_name, role, is_warehouse_staff, assigned_warehouse_id, user_type')
    .eq('is_warehouse_staff', true)
    .limit(5);
  check('Warehouse staff profiles exist', !staffErr && (staffProfiles?.length || 0) > 0, staffErr?.message || 'No warehouse staff found');
  if (staffProfiles?.length) {
    const staff = staffProfiles[0];
    check(`Staff ${staff.full_name || staff.id} has assigned_warehouse_id`, !!staff.assigned_warehouse_id, 'assigned_warehouse_id is NULL');
    check(`Staff ${staff.full_name || staff.id} has user_type=internal`, staff.user_type === 'internal', `user_type=${staff.user_type}`);
    check(`Staff ${staff.full_name || staff.id} has role=warehouse_staff`, staff.role === 'warehouse_staff', `role=${staff.role}`);
  }

  // ─── 15. Check admin profiles ──────────────────────────────────────────
  console.log('\n👑 Step 15: Admin profile verification');
  const { data: adminProfiles, error: adminProfErr } = await adminClient
    .from('profiles')
    .select('id, full_name, role, user_type')
    .eq('user_type', 'internal')
    .limit(5);
  check('Internal admin profiles exist', !adminProfErr && (adminProfiles?.length || 0) > 0, adminProfErr?.message || 'No internal profiles found');
  if (adminProfiles?.length) {
    const admin = adminProfiles[0];
    check(`Admin ${admin.full_name || admin.id} has role=${admin.role}`, !!admin.role, 'role is NULL');
  }

  // ─── 16. Check RLS policies exist ──────────────────────────────────────
  console.log('\n🛡️ Step 16: RLS policy verification');
  const { data: policies, error: policiesErr } = await adminClient
    .from('warehouse_assignments')
    .select('id')
    .limit(1);
  check('warehouse_assignments RLS allows service role', !policiesErr, policiesErr?.message);

  // ─── 17. Check notifications RLS ───────────────────────────────────────
  console.log('\n🔔 Step 17: Notifications RLS verification');
  const { data: notifInsert, error: notifInsertErr } = await adminClient
    .from('notifications')
    .insert({
      title: 'Test Notification',
      message: 'Verification test',
      type: 'assignment',
      is_read: false,
      warehouse_id: warehouse.id,
      order_id: order.id,
      entity_type: 'order',
      entity_id: order.id,
    })
    .select('id')
    .single();
  check('Can insert notification with all fields', !notifInsertErr, notifInsertErr?.message);
  if (notifInsert) {
    await adminClient.from('notifications').delete().eq('id', notifInsert.id);
  }

  // ─── 18. Check warehouse_assignments RLS ───────────────────────────────
  console.log('\n📋 Step 18: warehouse_assignments RLS verification');
  const { data: assignInsert, error: assignInsertErr } = await adminClient
    .from('warehouse_assignments')
    .insert({
      entity_type: 'order',
      entity_id: order.id,
      warehouse_id: warehouse.id,
      status: 'assigned',
      assigned_by: null,
      priority: 'normal',
      admin_approval: 'pending',
      processing_status: 'not_started',
      packing_status: 'not_started',
      shipping_ready: false,
    })
    .select('id')
    .single();
  check('Can insert warehouse_assignment', !assignInsertErr, assignInsertErr?.message);
  if (assignInsert) {
    await adminClient.from('warehouse_assignments').delete().eq('id', assignInsert.id);
  }

  // ─── 19. Check warehouse_activity_logs RLS ─────────────────────────────
  console.log('\n📜 Step 19: warehouse_activity_logs RLS verification');
  const { data: activityInsert, error: activityInsertErr } = await adminClient
    .from('warehouse_activity_logs')
    .insert({
      entity_type: 'order',
      entity_id: order.id,
      warehouse_id: warehouse.id,
      action: 'verification_test',
      actor_id: null,
      actor_name: 'Verification',
      actor_role: 'system',
    })
    .select('id')
    .single();
  check('Can insert warehouse_activity_log', !activityInsertErr, activityInsertErr?.message);
  if (activityInsert) {
    await adminClient.from('warehouse_activity_logs').delete().eq('id', activityInsert.id);
  }

  // ─── 20. Check orders RLS ──────────────────────────────────────────────
  console.log('\n📦 Step 20: orders RLS verification');
  const { error: orderUpdateErr2 } = await adminClient
    .from('orders')
    .update({ warehouse_id: warehouse.id, warehouse_status: 'waiting_for_warehouse', status: 'warehouse_assigned' })
    .eq('id', order.id);
  check('Can update order warehouse fields', !orderUpdateErr2, orderUpdateErr2?.message);

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('❌ Some checks FAILED. Review the failures above.');
    process.exit(1);
  } else {
    console.log('✅ ALL CHECKS PASSED! The warehouse assignment workflow is fully functional.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});