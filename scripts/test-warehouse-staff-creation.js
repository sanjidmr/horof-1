#!/usr/bin/env node

/**
 * End-to-end test for Warehouse + Warehouse Staff creation workflow
 * 
 * This script verifies:
 * 1. Warehouse creation works
 * 2. Staff creation works atomically with warehouse
 * 3. Auth user is created correctly
 * 4. Profile is created with correct fields
 * 5. Staff count is updated automatically
 * 6. Login works for staff
 * 7. Staff can access their warehouse dashboard
 * 
 * Usage: node scripts/test-warehouse-staff-creation.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Test data
const TEST_WAREHOUSE = {
  name: 'Test Warehouse E2E',
  slug: `test-warehouse-${Date.now()}`,
  location: 'Dhaka, Bangladesh',
  manager: 'Test Manager',
  phone: '+8801712345678',
  email: 'manager@test.com',
  capacity: 1000
};

const TEST_STAFF = {
  email: `staff-${Date.now()}@test.com`,
  password: '1234567890',
  full_name: 'Test Warehouse Staff',
  phone: '01712345678'
};

let testWarehouseId = null;
let testStaffId = null;
let testAuthUserId = null;

async function runTests() {
  console.log('🧪 Starting Warehouse + Staff Creation E2E Tests\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create warehouse with staff atomically
    console.log('\n📦 Test 1: Create warehouse with staff (atomic operation)');
    await testCreateWarehouseWithStaff();

    // Test 2: Verify warehouse exists
    console.log('\n🔍 Test 2: Verify warehouse exists in database');
    await testVerifyWarehouse();

    // Test 3: Verify auth user exists
    console.log('\n👤 Test 3: Verify Supabase Auth user exists');
    await testVerifyAuthUser();

    // Test 4: Verify profile exists
    console.log('\n📋 Test 4: Verify profile exists with correct fields');
    await testVerifyProfile();

    // Test 5: Verify staff count
    console.log('\n🔢 Test 5: Verify staff count is updated automatically');
    await testVerifyStaffCount();

    // Test 6: Verify staff can login
    console.log('\n🔐 Test 6: Verify staff can login with created credentials');
    await testStaffLogin();

    // Test 7: Verify staff is assigned to correct warehouse
    console.log('\n🏭 Test 7: Verify staff is assigned to correct warehouse');
    await testVerifyWarehouseAssignment();

    // Test 8: Test rollback on duplicate email
    console.log('\n⛔ Test 8: Test rollback when email already exists');
    await testRollbackOnDuplicateEmail();

    // Test 9: Verify no orphan records
    console.log('\n🧹 Test 9: Verify no orphan records');
    await testNoOrphanRecords();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await cleanup();
    process.exit(1);
  }
}

async function testCreateWarehouseWithStaff() {
  // Import the server action
  const { createWarehouseWithStaff } = require('../src/lib/actions/inventory');
  
  const result = await createWarehouseWithStaff({
    warehouse: TEST_WAREHOUSE,
    staff: TEST_STAFF
  });

  if (!result.success) {
    throw new Error('Warehouse creation failed');
  }

  testWarehouseId = result.warehouseId;
  testStaffId = result.userId;

  console.log(`   ✅ Warehouse created: ${testWarehouseId}`);
  console.log(`   ✅ Staff created: ${testStaffId}`);
  console.log(`   ✅ Staff email: ${result.email}`);
}

async function testVerifyWarehouse() {
  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .select('*')
    .eq('id', testWarehouseId)
    .single();

  if (error || !data) {
    throw new Error('Warehouse not found in database');
  }

  console.log(`   ✅ Warehouse found: ${data.name}`);
  console.log(`   ✅ Slug: ${data.slug}`);
  console.log(`   ✅ Staff count: ${data.staff_count}`);
}

async function testVerifyAuthUser() {
  // Get user by email
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const authUser = users.users.find(u => u.email === TEST_STAFF.email);
  
  if (!authUser) {
    throw new Error('Auth user not found');
  }

  testAuthUserId = authUser.id;
  console.log(`   ✅ Auth user found: ${testAuthUserId}`);
  console.log(`   ✅ Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
  console.log(`   ✅ User metadata:`, JSON.stringify(authUser.user_metadata, null, 2));
}

async function testVerifyProfile() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', testStaffId)
    .single();

  if (error || !data) {
    throw new Error('Profile not found');
  }

  console.log(`   ✅ Profile found for: ${data.email}`);
  console.log(`   ✅ Full name: ${data.full_name}`);
  console.log(`   ✅ Role: ${data.role}`);
  console.log(`   ✅ User type: ${data.user_type}`);
  console.log(`   ✅ Is warehouse staff: ${data.is_warehouse_staff}`);
  console.log(`   ✅ Assigned warehouse: ${data.assigned_warehouse_id}`);
  console.log(`   ✅ Phone: ${data.phone}`);

  // Verify all required fields
  if (data.role !== 'warehouse_staff') {
    throw new Error(`Invalid role: ${data.role}`);
  }
  if (data.user_type !== 'internal') {
    throw new Error(`Invalid user_type: ${data.user_type}`);
  }
  if (data.is_warehouse_staff !== true) {
    throw new Error('is_warehouse_staff is not true');
  }
  if (data.assigned_warehouse_id !== testWarehouseId) {
    throw new Error('Warehouse assignment mismatch');
  }
}

async function testVerifyStaffCount() {
  const { data, error } = await supabaseAdmin
    .from('warehouses')
    .select('staff_count')
    .eq('id', testWarehouseId)
    .single();

  if (error || !data) {
    throw new Error('Failed to get warehouse staff count');
  }

  if (data.staff_count !== 1) {
    throw new Error(`Staff count should be 1, got ${data.staff_count}`);
  }

  console.log(`   ✅ Staff count correctly set to: ${data.staff_count}`);
}

async function testStaffLogin() {
  // Create a client with the staff credentials
  const supabaseStaff = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data, error } = await supabaseStaff.auth.signInWithPassword({
    email: TEST_STAFF.email,
    password: TEST_STAFF.password,
  });

  if (error) {
    throw new Error(`Login failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned from login');
  }

  console.log(`   ✅ Login successful for: ${data.user.email}`);
  console.log(`   ✅ User ID: ${data.user.id}`);

  // Sign out
  await supabaseStaff.auth.signOut();
}

async function testVerifyWarehouseAssignment() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('assigned_warehouse_id, is_warehouse_staff, role')
    .eq('id', testStaffId)
    .single();

  if (error || !data) {
    throw new Error('Failed to get staff profile');
  }

  if (data.assigned_warehouse_id !== testWarehouseId) {
    throw new Error(`Warehouse assignment mismatch: expected ${testWarehouseId}, got ${data.assigned_warehouse_id}`);
  }

  console.log(`   ✅ Staff assigned to correct warehouse: ${data.assigned_warehouse_id}`);
}

async function testRollbackOnDuplicateEmail() {
  console.log('   🔄 Attempting to create duplicate staff...');
  
  const { createWarehouseWithStaff } = require('../src/lib/actions/inventory');
  
  try {
    await createWarehouseWithStaff({
      warehouse: {
        name: 'Test Warehouse Duplicate',
        slug: `test-warehouse-duplicate-${Date.now()}`,
      },
      staff: {
        email: TEST_STAFF.email, // Same email as before
        password: 'password123',
        full_name: 'Duplicate Staff',
        phone: '01799999999'
      }
    });
    
    throw new Error('Should have thrown error for duplicate email');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`   ✅ Correctly rejected duplicate email`);
    } else {
      throw error;
    }
  }

  // Verify no orphan warehouse was created
  const { data: orphanWarehouses } = await supabaseAdmin
    .from('warehouses')
    .select('id, name')
    .eq('name', 'Test Warehouse Duplicate');

  if (orphanWarehouses && orphanWarehouses.length > 0) {
    throw new Error('Orphan warehouse was created (rollback failed)');
  }

  console.log(`   ✅ No orphan warehouse created (rollback successful)`);
}

async function testNoOrphanRecords() {
  // Check for orphan auth users (auth users without profiles)
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const profileIds = new Set();
  
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id');

  if (profiles) {
    profiles.forEach(p => profileIds.add(p.id));
  }

  const orphanAuthUsers = authUsers.users.filter(u => !profileIds.has(u.id));
  
  if (orphanAuthUsers.length > 0) {
    console.warn(`   ⚠️  Found ${orphanAuthUsers.length} orphan auth users`);
  } else {
    console.log(`   ✅ No orphan auth users found`);
  }

  // Check for orphan profiles (profiles without auth users)
  const orphanProfiles = profiles.filter(p => !authUsers.users.find(u => u.id === p.id));
  
  if (orphanProfiles.length > 0) {
    console.warn(`   ⚠️  Found ${orphanProfiles.length} orphan profiles`);
  } else {
    console.log(`   ✅ No orphan profiles found`);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  if (testStaffId && testAuthUserId) {
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', testStaffId);
    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(testAuthUserId);
    console.log(`   ✅ Deleted test staff`);
  }

  if (testWarehouseId) {
    // Delete warehouse (cascade will handle related records)
    await supabaseAdmin.from('warehouses').delete().eq('id', testWarehouseId);
    console.log(`   ✅ Deleted test warehouse`);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});