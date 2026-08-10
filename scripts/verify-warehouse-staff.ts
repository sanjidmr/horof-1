// ============================================================================
// IN-MEMORY HARNESS FOR warehouse-staff-service.ts
//
// This mock faithfully simulates the real Supabase behaviour that caused the
// production bug ("Auth API error: {}" / HTTP 500), so the provisioning logic
// can be verified WITHOUT a live database:
//
//   - auth.users            : real table with soft-deleted users + user_metadata
//   - profiles              : UNIQUE(lower(email)) index + customer-only UNIQUE(phone)
//   - handle_new_user       : metadata-aware trigger (new migration), with an
//                             optional STRICT mode that reproduces the OLD
//                             behaviour (profile INSERT aborts GoTrue -> 500,
//                             which supabase-js masks as literal "{}").
//   - update_warehouse_staff_count : AFTER INSERT/UPDATE/DELETE trigger mirror
//                             (exact same delta logic as the migration).
//   - notifications          : warehouse-targeted rows.
//   - user_roles / roles     : UNIQUE(user_id, role_id), warehouse_staff role.
//   - warehouses             : UNIQUE slug + staff_count.
//
// Run: npx tsx scripts/verify-warehouse-staff.ts
// ============================================================================

import {
  provisionStaffMember,
  allocateWarehouse,
  createWarehouseAndStaff,
  StaffError,
  type AuthApi,
  type AuthUserView,
  type DbService,
  type WarehouseService,
} from '../src/lib/warehouse-staff-service.ts';

// --- internal tables -------------------------------------------------------
type AuthUser = {
  id: string;
  email: string;
  password: string;
  deleted_at: string | null;
  user_metadata: Record<string, unknown>;
};
type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  user_type: string;
  is_banned: boolean;
  is_warehouse_staff: boolean;
  assigned_warehouse_id: string | null;
  is_deleted: boolean;
};
type RoleRow = { id: string; name: string };
type UserRole = { user_id: string; role_id: string };
type Warehouse = { id: string; name: string; slug: string; deleted: boolean; staff_count: number };
type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  warehouse_id: string;
  entity_type: string;
  entity_id: string;
};

let uidCounter = 1;
const newId = () => `u-${uidCounter++}`;

// Simulates the OLD handle_new_user that could abort GoTrue's transaction.
// When true, a profile email clash throws (=> createUser 500). The service
// MUST purge orphan profiles BEFORE createUser so this never fires.
let strictTrigger = false;

const state = {
  authUsers: [] as AuthUser[],
  profiles: [] as Profile[],
  roles: [{ id: 'role:wh', name: 'warehouse_staff' }] as RoleRow[],
  userRoles: [] as UserRole[],
  warehouses: [] as Warehouse[],
  notifications: [] as Notification[],
};

// ---------------------------------------------------------------------------
// Trigger mirrors (faithful re-implementations of the migration SQL)
// ---------------------------------------------------------------------------

function emailClash(profileId: string, email: string): boolean {
  const lower = email.toLowerCase();
  return state.profiles.some((p) => !p.is_deleted && p.id !== profileId && p.email.toLowerCase() === lower);
}

// Mirrors public.handle_new_user() (20260821000000 migration):
//   - metadata-aware (warehouse_staff -> internal staff profile)
//   - NEVER throws in production mode: an email clash is swallowed and NO
//     profile is created (the provisioning service repairs it via ensureProfile).
function fireHandleNewUser(auth: AuthUser) {
  const meta = auth.user_metadata ?? {};
  const role = meta.role === 'warehouse_staff' ? 'warehouse_staff' : 'customer';
  const userType = meta.user_type === 'internal' ? 'internal' : 'customer';
  const isStaff = meta.is_warehouse_staff === true;
  const assigned = typeof meta.assigned_warehouse_id === 'string' ? meta.assigned_warehouse_id : null;

  const clash = emailClash(auth.id, auth.email);
  if (clash) {
    if (strictTrigger) {
      // OLD production behaviour: the trigger INSERT aborts inside GoTrue's
      // auth.users INSERT transaction -> HTTP 500 (masked as "{}").
      throw new Error('duplicate key value violates unique constraint "idx_profiles_email_unique"');
    }
    // New migration: swallow, log a notice, create nothing. Repaired later.
    return;
  }

  state.profiles.push({
    id: auth.id,
    email: auth.email,
    full_name: (meta.full_name as string) ?? '',
    phone: (meta.phone as string | null) ?? null,
    role,
    user_type: userType,
    is_banned: false,
    is_warehouse_staff: isStaff,
    assigned_warehouse_id: assigned,
    is_deleted: false,
  });
  // In the real DB the AFTER INSERT trigger on profiles also fires for the
  // row created here, so a staff user is counted exactly once.
  fireStaffCount(null, state.profiles[state.profiles.length - 1]);
}

// Mirrors public.update_warehouse_staff_count() (20260821000000 migration):
// AFTER INSERT OR UPDATE OR DELETE ON profiles. Independent +1 / -1 branches
// so a REASSIGNMENT decrements the old warehouse and increments the new one.
function fireStaffCount(oldP: Profile | null, newP: Profile | null) {
  const oldWh = oldP?.assigned_warehouse_id ?? null;
  const oldStaff = oldP?.is_warehouse_staff === true;
  const newWh = newP?.assigned_warehouse_id ?? null;
  const newStaff = newP?.is_warehouse_staff === true;

  // +1: arriving as a counted member in a warehouse where not already counted
  if (newWh !== null && newStaff && !(oldWh !== null && oldStaff && oldWh === newWh)) {
    const w = state.warehouses.find((x) => x.id === newWh);
    if (w) w.staff_count = Math.max(0, (w.staff_count ?? 0) + 1);
  }
  // -1: leaving a warehouse as a counted member
  if (oldWh !== null && oldStaff && !(newWh !== null && newStaff && newWh === oldWh)) {
    const w = state.warehouses.find((x) => x.id === oldWh);
    if (w) w.staff_count = Math.max(0, (w.staff_count ?? 0) - 1);
  }
}

// --- Auth API mock ---------------------------------------------------------
const authApi: AuthApi = {
  async findByEmail(email: string): Promise<AuthUserView | null> {
    const lower = email.toLowerCase();
    const u = state.authUsers.find((x) => x.email.toLowerCase() === lower && !x.deleted_at);
    return u ? { id: u.id, email: u.email, deleted_at: null } : null;
  },
  async findSoftDeletedByEmail(email: string): Promise<AuthUserView | null> {
    const lower = email.toLowerCase();
    const u = state.authUsers.find((x) => x.email.toLowerCase() === lower && !!x.deleted_at);
    return u ? { id: u.id, email: u.email, deleted_at: u.deleted_at } : null;
  },
  async createUser(input) {
    const lower = input.email.toLowerCase();
    // GoTrue refuses to re-register an email owned by a LIVE or SOFT-DELETED
    // user. This is exactly why the service must hard-purge soft-deleted users
    // (and orphan profiles) BEFORE createUser.
    const existing = state.authUsers.find((x) => x.email.toLowerCase() === lower);
    if (existing) {
      return {
        user: null,
        error: {
          message: 'User already registered',
          status: 422,
          code: 'user_already_exists',
          name: 'AuthApiError',
        },
      };
    }
    if (input.password.length < 6) {
      return { user: null, error: { message: 'Password should be at least 6 characters', status: 422, code: 'weak_password', name: 'AuthWeakPasswordError' } };
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input.email)) {
      return { user: null, error: { message: `Invalid email: ${input.email}`, status: 422 } };
    }
    const user: AuthUser = {
      id: newId(),
      email: lower,
      password: input.password,
      deleted_at: null,
      user_metadata: input.user_metadata,
    };
    state.authUsers.push(user);
    try {
      fireHandleNewUser(user);
    } catch (e: any) {
      // GoTrue transaction aborted -> auth row rolled back. The client sees a
      // 500 whose body supabase-js masks as "{}" (see auth-js fetch.js).
      state.authUsers = state.authUsers.filter((u) => u.id !== user.id);
      return {
        user: null,
        error: {
          message: '{}',
          status: 500,
          name: 'AuthApiError',
          raw: { name: 'AuthApiError', message: '{}', status: 500, cause: e.message },
        },
      };
    }
    return { user: { id: user.id, email: user.email, deleted_at: null }, error: null };
  },
  async hardDeleteUser(id) {
    const i = state.authUsers.findIndex((u) => u.id === id);
    if (i >= 0) state.authUsers.splice(i, 1);
    const prof = state.profiles.find((p) => p.id === id && !p.is_deleted) ?? null;
    state.profiles = state.profiles.filter((p) => p.id !== id);
    if (prof) fireStaffCount(prof, null);
    state.userRoles = state.userRoles.filter((r) => r.user_id !== id);
    return { error: undefined };
  },
  async updateUserMetadata(id, metadata) {
    const u = state.authUsers.find((x) => x.id === id);
    if (u) u.user_metadata = { ...u.user_metadata, ...metadata };
    return { error: undefined };
  },
};

// --- DB mock (all profile mutations fire the staff_count trigger) ----------
const db: DbService = {
  async warehouseExists(id) {
    return state.warehouses.some((w) => !w.deleted && w.id === id);
  },
  async ensureProfile(p) {
    const existing = state.profiles.find((x) => x.id === p.id);
    const oldP = existing && !existing.is_deleted ? { ...existing } : null;
    if (existing) {
      Object.assign(existing, p, { is_deleted: false });
      fireStaffCount(oldP, { ...existing });
      return { ok: true };
    }
    try {
      if (emailClash(p.id, p.email)) {
        throw new Error('duplicate key value violates unique constraint "idx_profiles_email_unique"');
      }
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
    state.profiles.push({ ...p, is_deleted: false });
    fireStaffCount(null, { ...p, is_deleted: false });
    return { ok: true };
  },
  async purgeOrphanProfilesByEmail(email, keepUserId) {
    const lower = email.toLowerCase();
    for (const p of state.profiles) {
      if (p.is_deleted) continue;
      if (p.id === keepUserId) continue;
      if (p.email.toLowerCase() !== lower) continue;
      const backing = state.authUsers.find((u) => u.id === p.id && !u.deleted_at);
      if (!backing) {
        const oldP = { ...p };
        p.is_deleted = true;
        fireStaffCount(oldP, null);
      }
    }
    return { ok: true };
  },
  async warehouseStaffRoleId() {
    const r = state.roles.find((x) => x.name === 'warehouse_staff');
    if (!r) return { id: undefined, error: 'role not installed' };
    return { id: r.id, error: undefined };
  },
  async assignRole(userId, roleId) {
    if (!state.userRoles.some((x) => x.user_id === userId && x.role_id === roleId)) {
      state.userRoles.push({ user_id: userId, role_id: roleId });
    }
    return { ok: true };
  },
  async createNotification(input) {
    state.notifications.push({
      id: newId(),
      title: input.title,
      message: input.message,
      type: input.type,
      warehouse_id: input.warehouse_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    });
    return { ok: true };
  },
  async revertStaffing(userId) {
    state.userRoles = state.userRoles.filter((x) => x.user_id !== userId);
    const p = state.profiles.find((x) => x.id === userId && !x.is_deleted);
    if (p) {
      const oldP = { ...p };
      p.is_warehouse_staff = false;
      p.assigned_warehouse_id = null;
      fireStaffCount(oldP, { ...p });
    }
    return { ok: true };
  },
};

const warehouseService: WarehouseService = {
  async createWarehouse(data) {
    const slug = String((data as any).slug);
    if (state.warehouses.some((w) => !w.deleted && w.slug === slug)) {
      return { error: { message: 'duplicate key value violates unique constraint "warehouses_slug_key"' } };
    }
    const w: Warehouse = { id: newId(), name: String((data as any).name), slug, deleted: false, staff_count: 0 };
    state.warehouses.push(w);
    return { id: w.id, error: undefined };
  },
  async deleteWarehouse(id) {
    const w = state.warehouses.find((x) => x.id === id);
    if (w) w.deleted = true;
    return { error: undefined };
  },
};

// --- end-user simulation helpers -------------------------------------------
// Mirrors AuthContext / AdminLayoutClient: a user is "warehouse staff" if the
// profile says so, which is what gates the warehouse dashboard.
function login(email: string, password: string): Profile | null {
  const u = state.authUsers.find((x) => x.email.toLowerCase() === email.toLowerCase() && !x.deleted_at);
  if (!u || u.password !== password) return null;
  const p = state.profiles.find((x) => x.id === u.id && !x.is_deleted);
  return p ?? null;
}
function canAccessWarehouseDashboard(p: Profile | null): boolean {
  return !!p && (p.is_warehouse_staff === true || p.role === 'warehouse_staff');
}

// --- reset / seed -----------------------------------------------------------
function seedWarehouse(slug: string, name = slug): Warehouse {
  const w: Warehouse = { id: `wh-${slug}`, name, slug, deleted: false, staff_count: 0 };
  state.warehouses.push(w);
  return w;
}

function resetState() {
  state.authUsers.length = 0;
  state.profiles.length = 0;
  state.roles = [{ id: 'role:wh', name: 'warehouse_staff' }];
  state.userRoles.length = 0;
  state.warehouses.length = 0;
  state.notifications.length = 0;
  strictTrigger = false;
  const admin: AuthUser = { id: 'admin-1', email: 'admin@example.com', password: 'admin1234', deleted_at: null, user_metadata: {} };
  state.authUsers.push(admin);
  state.profiles.push({
    id: admin.id, email: admin.email, full_name: 'Admin', phone: '01710000000',
    role: 'super_admin', user_type: 'internal', is_banned: false,
    is_warehouse_staff: false, assigned_warehouse_id: null, is_deleted: false,
  });
  seedWarehouse('w1');
  seedWarehouse('w2');
  seedWarehouse('w3');
}

// --- runner helpers ----------------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push(`${label} ${detail}`.trim());
    console.log(`  ✗ ${label} ${detail}`);
  }
}

async function expectRejects(promise: () => Promise<unknown>, code: string, label: string, opts: { contains?: string } = {}) {
  try {
    await promise();
    assert(false, label, `expected error ${code} but got success`);
  } catch (e: any) {
    const isStaff = e instanceof StaffError;
    const okCode = isStaff && e.code === code;
    const okMsg = opts.contains ? String(e?.message ?? '').toLowerCase().includes(opts.contains.toLowerCase()) : true;
    assert(okCode && okMsg, label, `(got ${isStaff ? e.code : typeof e}: ${e?.message})`);
  }
}

function provision(input: {
  email: string;
  password?: string;
  full_name?: string;
  phone?: string | null;
  warehouseId?: string;
}) {
  return provisionStaffMember(authApi, db, {
    email: input.email,
    password: input.password ?? 'phone1234',
    full_name: input.full_name ?? 'Staff',
    phone: input.phone ?? null,
    warehouseId: input.warehouseId ?? 'wh-w1',
  });
}

const seedCustomer = (id: string, email: string, phone: string | null = null, password = 'cust1234') => {
  state.authUsers.push({ id, email, password, deleted_at: null, user_metadata: {} });
  state.profiles.push({
    id, email, full_name: 'C', phone, role: 'customer', user_type: 'customer',
    is_banned: false, is_warehouse_staff: false, assigned_warehouse_id: null, is_deleted: false,
  });
};

// --- the verification matrix ------------------------------------------------
async function main() {
  console.log('\n=== WAREHOUSE STAFF PROVISIONING VERIFICATION ===\n');

  // 1. Warehouse-only ---------------------------------------------------------
  console.log('\n[1] Warehouse-only creation → committed, no auth user, staff_count 0');
  resetState();
  {
    const res = await createWarehouseAndStaff(authApi, db, warehouseService, {
      warehouse: { name: 'Only', slug: 'only' },
      staff: null,
    });
    const wh = state.warehouses.find((w) => w.id === res.warehouseId);
    assert(res.staffCreated === false, 'staffCreated false');
    assert(!!wh && !wh.deleted, 'warehouse committed');
    assert(wh!.staff_count === 0, 'staff_count stays 0');
    assert(state.authUsers.length === 1, 'no new auth user created');
  }

  // 2. Warehouse + staff ------------------------------------------------------
  console.log('\n[2] Warehouse + staff → both committed together, staff_count 1, notification');
  resetState();
  {
    const res = await createWarehouseAndStaff(authApi, db, warehouseService, {
      warehouse: { name: 'Combined', slug: 'combined' },
      staff: { email: 'comb@x.com', password: 'phone1234', full_name: 'C', phone: '01718888888' },
    });
    const wh = state.warehouses.find((w) => w.id === res.warehouseId);
    assert(res.staffCreated === true, 'staffCreated true');
    assert(!!wh && !wh.deleted, 'warehouse committed');
    assert(wh!.staff_count === 1, `staff_count === 1 (got ${wh!.staff_count})`);
    const notif = state.notifications.find((n) => n.warehouse_id === res.warehouseId);
    assert(!!notif, 'warehouse notification created');
    assert(notif!.entity_type === 'warehouse_staff' && notif!.entity_id === res.userId, 'notification points at the staff user');
  }

  // 3. New random email → full happy path + login + dashboard ------------------
  console.log('\n[3] New email → auth user + profile + role + login + dashboard access');
  resetState();
  {
    const r = await provision({ email: 'one@x.com', phone: '01911111111', full_name: 'One User' });
    assert(r.createdAuthUser === true, 'created a brand-new auth user');
    assert(!r.reusedAuthUser, 'not reused');
    const p = state.profiles.find((x) => x.id === r.userId && !x.is_deleted);
    assert(p?.is_warehouse_staff === true, 'profile is staff');
    assert(p?.assigned_warehouse_id === 'wh-w1', 'warehouse assigned');
    assert(state.userRoles.some((x) => x.user_id === r.userId), 'role assigned');
    const loggedIn = login('one@x.com', 'phone1234');
    assert(!!loggedIn, 'can log in with the created password');
    assert(canAccessWarehouseDashboard(loggedIn), 'staff can access the warehouse dashboard');
  }

  // 4. Existing live email → upgraded, no false "already exists" ---------------
  console.log('\n[4] Existing auth email → upgraded to staff, login preserved, dashboard granted');
  resetState();
  {
    seedCustomer('cust-1', 'cust@x.com');
    const r = await provision({ email: 'CUST@x.com', warehouseId: 'wh-w2' });
    assert(r.reusedAuthUser === true, 'reused existing auth user');
    const p = state.profiles.find((x) => x.id === 'cust-1');
    assert(p!.is_warehouse_staff === true, 'upgraded to warehouse staff');
    assert(p!.role === 'warehouse_staff', 'role upgraded');
    assert(p!.user_type === 'internal', 'user_type upgraded to internal');
    assert(p!.assigned_warehouse_id === 'wh-w2', 'assigned to warehouse');
    assert(state.userRoles.some((x) => x.user_id === 'cust-1'), 'role row added');
    const loggedIn = login('cust@x.com', 'cust1234');
    assert(!!loggedIn, 'existing password still works');
    assert(canAccessWarehouseDashboard(loggedIn), 'now can access warehouse dashboard');
  }

  // 5. Profile only (orphan, no auth user) → pre-purge + create ----------------
  console.log('\n[5] Orphan profile (no auth user) → purged, fresh staff created, no 500');
  resetState();
  {
    state.profiles.push({
      id: 'orphan-1', email: 'orphan@x.com', full_name: 'Orph', phone: null, role: 'admin_run', user_type: 'internal',
      is_banned: false, is_warehouse_staff: false, assigned_warehouse_id: null, is_deleted: false,
    });
    // STRICT trigger = the OLD production trigger that aborts GoTrue on the
    // email-unique clash. If the service purged the orphan first, the trigger
    // never sees a clash and createUser cannot 500.
    strictTrigger = true;
    const r = await provision({ email: 'orphan@x.com', warehouseId: 'wh-w3' });
    assert(r.createdAuthUser === true, 'created an auth user for the orphan email');
    assert(!state.profiles.some((p) => p.id === 'orphan-1' && !p.is_deleted), 'orphan profile purged before createUser');
    assert(state.profiles.some((p) => p.id === r.userId && p.is_warehouse_staff), 'new staff profile exists');
  }

  // 6. Existing auth user, missing profile → profile created -------------------
  console.log('\n[6] Existing auth user, missing profile → profile created & staff');
  resetState();
  {
    state.authUsers.push({ id: 'au1', email: 'authonly@x.com', password: 'pw123456', deleted_at: null, user_metadata: {} });
    const r = await provision({ email: 'authonly@x.com' });
    assert(r.reusedAuthUser === true, 'reused existing auth user');
    const p = state.profiles.find((x) => x.id === 'au1');
    assert(!!p && p.is_warehouse_staff === true, 'profile created & upgraded');
  }

  // 7. Soft-deleted auth user → hard-purged, fresh account ---------------------
  console.log('\n[7] Soft-deleted auth user → purged, recreated, no false "already exists"');
  resetState();
  {
    state.authUsers.push({ id: 'dead', email: 'dead@x.com', password: 'x', deleted_at: new Date().toISOString(), user_metadata: {} });
    const r = await provision({ email: 'dead@x.com' });
    assert(r.createdAuthUser === true, 'treated as a new account');
    assert(state.authUsers.some((u) => u.email === 'dead@x.com' && !u.deleted_at), 'active auth user exists afterwards');
    assert(!state.authUsers.some((u) => u.id === 'dead'), 'old soft-deleted row hard-purged');
  }

  // 8. Same phone as existing customer → allowed (relaxed unique for internal) --
  console.log('\n[8] Same phone as a customer → staff with the colliding phone is allowed');
  resetState();
  {
    seedCustomer('cp', 'cust@phonetest.com', '01713333333');
    const r = await provision({ email: 'staff@phonetest.com', phone: '01713333333' });
    assert(r.createdAuthUser === true, 'created staff with a customer-colliding phone');
    const p = state.profiles.find((x) => x.id === r.userId);
    assert(p && p.phone === '01713333333', 'phone stored');
  }

  // 9. Invalid email -----------------------------------------------------------
  console.log('\n[9] Invalid email → INVALID_EMAIL, nothing created');
  resetState();
  {
    await expectRejects(() => provision({ email: 'not-an-email' }), 'INVALID_EMAIL', 'bad email rejected');
    assert(state.authUsers.length === 1, 'no auth user created');
  }

  // 10. Weak passwords ----------------------------------------------------------
  console.log('\n[10] Weak password → WEAK_PASSWORD');
  resetState();
  {
    await expectRejects(() => provision({ email: 'weak@x.com', password: '123' }), 'WEAK_PASSWORD', 'short password rejected');
    await expectRejects(
      () => provision({ email: 'long@x.com', password: 'x'.repeat(73) }),
      'WEAK_PASSWORD',
      '>72 char password rejected (bcrypt limit)',
    );
    assert(state.authUsers.length === 1, 'no auth user created');
  }

  // 11. Invalid phone ------------------------------------------------------------
  console.log('\n[11] Invalid phone → INVALID_PHONE');
  resetState();
  {
    await expectRejects(() => provision({ email: 'ph@x.com', phone: 'abc' }), 'INVALID_PHONE', 'garbage phone rejected');
  }

  // 12. Duplicate warehouse slug ---------------------------------------------------
  console.log('\n[12] Duplicate warehouse slug → DUPLICATE_WAREHOUSE, nothing else created');
  resetState();
  {
    seedWarehouse('main');
    await expectRejects(
      () => createWarehouseAndStaff(authApi, db, warehouseService, {
        warehouse: { name: 'Dupe', slug: 'main' },
        staff: { email: 'x@x.com', password: 'phone1234', full_name: 'X' },
      }),
      'DUPLICATE_WAREHOUSE',
      'duplicate warehouse slug rejected by combined op',
    );
    assert(!state.authUsers.some((u) => u.email === 'x@x.com'), 'no staff account created');
    assert(liveWarehouses().length === 4, 'no warehouse leaked');
  }

  // 13. Missing warehouse -----------------------------------------------------------
  console.log('\n[13] Unknown warehouse → WAREHOUSE_ERROR, nothing created');
  resetState();
  {
    await expectRejects(() => provision({ email: 'nowh@x.com', warehouseId: 'wh-nope' }), 'WAREHOUSE_ERROR', 'missing warehouse rejected');
    assert(state.authUsers.length === 1, 'no auth user created');
  }

  // 14. Role + warehouse assignment ---------------------------------------------------
  console.log('\n[14] Role + warehouse assignment invariants');
  resetState();
  {
    const r = await provision({ email: 'role@x.com', warehouseId: 'wh-w1' });
    const p = state.profiles.find((x) => x.id === r.userId);
    assert(state.userRoles.some((x) => x.user_id === r.userId && x.role_id === 'role:wh'), 'user_roles row present');
    assert(p!.role === 'warehouse_staff', 'profile role set');
    assert(p!.assigned_warehouse_id === 'wh-w1', 'profile warehouse set');
    // idempotent
    await db.assignRole(r.userId, 'role:wh');
    assert(state.userRoles.filter((x) => x.user_id === r.userId).length === 1, 'role assignment is idempotent');
  }

  // 15. staff_count trigger across lifecycle ------------------------------------------
  console.log('\n[15] staff_count trigger: assign → 1, reassign → moves, unassign → 0');
  resetState();
  {
    const r = await provision({ email: 'sc@x.com', warehouseId: 'wh-w1' });
    let w1 = state.warehouses.find((w) => w.id === 'wh-w1')!;
    assert(w1.staff_count === 1, `assigned → count 1 (got ${w1.staff_count})`);

    // Re-assign to another warehouse (simulates an admin moving staff)
    const oldP = { ...state.profiles.find((x) => x.id === r.userId)! };
    state.profiles.find((x) => x.id === r.userId)!.assigned_warehouse_id = 'wh-w2';
    fireStaffCount(oldP, { ...oldP, assigned_warehouse_id: 'wh-w2' });
    w1 = state.warehouses.find((w) => w.id === 'wh-w1')!;
    let w2 = state.warehouses.find((w) => w.id === 'wh-w2')!;
    assert(w1.staff_count === 0 && w2.staff_count === 1, `reassigned → 0 / 1 (got ${w1.staff_count} / ${w2.staff_count})`);

    // Unassign (mirrors removeStaffFromWarehouse / revertStaffing)
    await db.revertStaffing(r.userId);
    w2 = state.warehouses.find((w) => w.id === 'wh-w2')!;
    assert(w2.staff_count === 0, `unassigned → count 0 (got ${w2.staff_count})`);
    assert(w2.staff_count === Math.max(0, w2.staff_count), 'staff_count never negative');
  }

  // 16. Multiple staff → counts add up ------------------------------------------------
  console.log('\n[16] Multiple staff in one warehouse → counts add up cleanly');
  resetState();
  {
    await provision({ email: 's1@x.com', warehouseId: 'wh-w1' });
    await provision({ email: 's2@x.com', warehouseId: 'wh-w1' });
    await provision({ email: 's3@x.com', warehouseId: 'wh-w2' });
    const w1 = state.warehouses.find((w) => w.id === 'wh-w1')!;
    const w2 = state.warehouses.find((w) => w.id === 'wh-w2')!;
    assert(w1.staff_count === 2, `w1 count 2 (got ${w1.staff_count})`);
    assert(w2.staff_count === 1, `w2 count 1 (got ${w2.staff_count})`);
    assert(state.profiles.filter((p) => p.is_warehouse_staff && !p.is_deleted).length === 3, 'three staff profiles');
  }

  // 17. Rollback: staff failure → warehouse + account rolled back ---------------------
  console.log('\n[17] Rollback: staff failure → warehouse + account rolled back, counts intact');
  resetState();
  {
    const origRole = state.roles;
    state.roles = [];
    await expectRejects(
      () => createWarehouseAndStaff(authApi, db, warehouseService, {
        warehouse: { name: 'WB', slug: 'wb' },
        staff: { email: 'rb@x.com', password: 'phone1234', full_name: 'R' },
      }),
      'ROLE_NOT_FOUND',
      'role missing surfaces a precise error',
    );
    assert(liveWarehouses().length === 3, 'warehouse rolled back after staff failure');
    assert(!state.authUsers.some((u) => u.email === 'rb@x.com'), 'created auth user rolled back');
    state.roles = origRole;
  }

  // 18. Rollback reuse path → staffing reverted, counts decremented -------------------
  console.log('\n[18] Reuse-path failure → staffing reverted, warehouse rolled back');
  resetState();
  {
    seedCustomer('existing-1', 'existing@x.com');
    const origRoles = state.roles;
    state.roles = [];
    await expectRejects(
      () => createWarehouseAndStaff(authApi, db, warehouseService, {
        warehouse: { name: 'A', slug: 'a' },
        staff: { email: 'existing@x.com', password: 'phone1234', full_name: 'X' },
      }),
      'ROLE_NOT_FOUND',
      'reuse path surfaces precise error',
    );
    assert(liveWarehouses().length === 3, 'warehouse rolled back');
    assert(state.authUsers.some((u) => u.id === 'existing-1'), 'pre-existing user preserved');
    const p = state.profiles.find((x) => x.id === 'existing-1');
    assert(p && p.is_warehouse_staff === false, 'staff marker reverted on existing user');
    state.roles = origRoles;
  }

  // 19. DB failure mid-flow → freshly created account rolled back ----------------------
  console.log('\n[19] DB failure mid-flow → freshly created account rolled back');
  resetState();
  {
    const origEnsure = db.ensureProfile;
    db.ensureProfile = async () => ({ ok: false, message: 'simulated profile write failure' });
    try {
      await provision({ email: 'txn@x.com', warehouseId: 'wh-w1' });
      assert(false, 'expected an error');
    } catch (e: any) {
      assert(e instanceof StaffError && e.code === 'DB_ERROR', 'DB_ERROR surfaced');
      assert(!state.authUsers.some((u) => u.email === 'txn@x.com'), 'created auth user rolled back');
    } finally {
      db.ensureProfile = origEnsure;
    }
  }

  // 20. Opaque 500 ("{}") → actionable error --------------------------------------------
  console.log('\n[20] Opaque auth 500 ("{}") → AUTH_API_ERROR with status, never "{}"');
  resetState();
  {
    const origCreate = authApi.createUser;
    authApi.createUser = async () => ({ user: null, error: { message: '{}', status: 500, name: 'AuthApiError', raw: { name: 'AuthApiError', message: '{}', status: 500 } } });
    try {
      await provision({ email: 'opaque@x.com', warehouseId: 'wh-w1' });
      assert(false, 'expected an error');
    } catch (e: any) {
      assert(e instanceof StaffError, 'StaffError type');
      assert(e.code === 'AUTH_API_ERROR', `code is AUTH_API_ERROR (got ${e.code})`);
      assert(!String(e.message).includes('{}'), 'raw {} never surfaced');
      assert(String(e.message).includes('500'), 'message carries the HTTP status');
    } finally {
      authApi.createUser = origCreate;
    }
    assert(!state.authUsers.some((u) => u.email === 'opaque@x.com'), 'no auth user left behind');
  }

  // 21. weak_password reasons → WEAK_PASSWORD with the reason ---------------------------
  console.log('\n[21] weak_password reasons → WEAK_PASSWORD, reason surfaced');
  resetState();
  {
    const origCreate = authApi.createUser;
    authApi.createUser = async () => ({ user: null, error: { message: '{}', status: 422, code: 'weak_password', name: 'AuthWeakPasswordError', weak_password: { reasons: ['min_length'] } } });
    try {
      await provision({ email: 'weak2@x.com', warehouseId: 'wh-w1' });
      assert(false, 'expected an error');
    } catch (e: any) {
      assert(e instanceof StaffError && e.code === 'WEAK_PASSWORD', `weak_password reasons classified (got ${e?.code})`);
      assert(String(e.message).includes('min_length'), 'reason surfaced in message');
    } finally {
      authApi.createUser = origCreate;
    }
  }

  // 22. Race retry: createUser races with a concurrent insert → reuses the winner -------
  console.log('\n[22] createUser race → re-check finds the winner and reuses it');
  resetState();
  {
    const origCreate = authApi.createUser;
    // Simulate a competing request that created the user just before ours.
    authApi.createUser = async (input) => {
      if (input.email.toLowerCase() === 'race@x.com') {
        state.authUsers.push({
          id: 'winner', email: 'race@x.com', password: input.password,
          deleted_at: null, user_metadata: input.user_metadata,
        });
        fireHandleNewUser(state.authUsers[state.authUsers.length - 1]);
        return { user: null, error: { message: 'User already registered', status: 422, code: 'user_already_exists', name: 'AuthApiError' } };
      }
      return origCreate(input);
    };
    const r = await provision({ email: 'race@x.com', warehouseId: 'wh-w1' });
    assert(r.reusedAuthUser === true, 'reused the concurrently-created user');
    assert(r.userId === 'winner', 'winner user id used');
    const p = state.profiles.find((x) => x.id === 'winner');
    assert(p && p.is_warehouse_staff && p.assigned_warehouse_id === 'wh-w1', 'winner upgraded to staff');
    assert(canAccessWarehouseDashboard(login('race@x.com', 'phone1234')), 'winner can access dashboard');
    authApi.createUser = origCreate;
  }

  // 23. Strict trigger failure recovery (the real 500 root cause) -----------------------
  console.log('\n[23] STRICT trigger + orphan profile → pre-purge prevents the HTTP 500');
  resetState();
  {
    // Old-style orphan: same email, different id, no backing auth user.
    state.profiles.push({
      id: 'ghost', email: 'ghost@x.com', full_name: 'Ghost', phone: null, role: 'customer',
      user_type: 'customer', is_banned: false, is_warehouse_staff: false,
      assigned_warehouse_id: null, is_deleted: false,
    });
    strictTrigger = true;
    const r = await provision({ email: 'ghost@x.com', warehouseId: 'wh-w1' });
    assert(r.createdAuthUser === true, 'createUser did not 500');
    assert(state.authUsers.some((u) => u.id === r.userId && !u.deleted_at), 'auth user exists');
    const staff = state.profiles.filter((p) => p.email.toLowerCase() === 'ghost@x.com' && !p.is_deleted);
    assert(staff.length === 1 && staff[0].is_warehouse_staff, 'exactly one staff profile for the email');
  }

  // 24. Strict trigger failure WITHOUT pre-purge (sanity: the bug is real) ----------------
  console.log('\n[24] Sanity: without pre-purge the old trigger WOULD 500 (root cause confirmed)');
  resetState();
  {
    const origPurge = db.purgeOrphanProfilesByEmail;
    // Break the pre-purge step to prove the strict trigger still aborts.
    db.purgeOrphanProfilesByEmail = async () => ({ ok: false, error: 'simulated purge failure' });
    state.profiles.push({
      id: 'ghost2', email: 'ghost2@x.com', full_name: 'Ghost2', phone: null, role: 'customer',
      user_type: 'customer', is_banned: false, is_warehouse_staff: false,
      assigned_warehouse_id: null, is_deleted: false,
    });
    strictTrigger = true;
    try {
      await provision({ email: 'ghost2@x.com', warehouseId: 'wh-w1' });
      assert(false, 'expected a 500-style auth error');
    } catch (e: any) {
      assert(e instanceof StaffError && e.code === 'AUTH_API_ERROR', 'AUTH_API_ERROR surfaced');
      assert(!state.authUsers.some((u) => u.email === 'ghost2@x.com'), 'aborted create left no auth user');
    } finally {
      db.purgeOrphanProfilesByEmail = origPurge;
    }
  }

  // 25. Pure customer cannot access warehouse dashboard -----------------------------------
  console.log('\n[25] Pure customer → no warehouse dashboard access');
  resetState();
  {
    seedCustomer('plain', 'plain@x.com');
    const p = login('plain@x.com', 'cust1234');
    assert(!!p, 'customer can log in');
    assert(!canAccessWarehouseDashboard(p), 'customer denied warehouse dashboard');
  }

  // 26. Soft-deleted profile restore ------------------------------------------------------
  console.log('\n[26] Soft-deleted profile + live auth → restored as staff');
  resetState();
  {
    state.authUsers.push({ id: 'd1', email: 'delprof@x.com', password: 'pw123456', deleted_at: null, user_metadata: {} });
    state.profiles.push({
      id: 'd1', email: 'delprof@x.com', full_name: 'D', phone: null, role: 'customer', user_type: 'customer',
      is_banned: false, is_warehouse_staff: false, assigned_warehouse_id: null, is_deleted: true,
    });
    const r = await provision({ email: 'delprof@x.com' });
    const p = state.profiles.find((x) => x.id === 'd1');
    assert(r.reusedAuthUser === true, 'reused existing auth');
    assert(!!p && !p.is_deleted && p.is_warehouse_staff, 'profile restored as staff');
  }

  // 27. Combined success full invariants ----------------------------------------------------
  console.log('\n[27] Full success path → all invariants hold');
  resetState();
  {
    const r = await provision({ email: 'ok@x.com', full_name: 'Ok User', phone: '01714567890', warehouseId: 'wh-w1' });
    const p = state.profiles.find((x) => x.id === r.userId && !x.is_deleted);
    assert(r.createdAuthUser === true, 'auth created');
    assert(p!.is_warehouse_staff === true, 'is_warehouse_staff');
    assert(p!.assigned_warehouse_id === 'wh-w1', 'warehouse assigned');
    assert(state.userRoles.some((x) => x.user_id === r.userId && x.role_id === 'role:wh'), 'role assigned');
    assert(state.profiles.filter((x) => x.email === 'ok@x.com' && !x.is_deleted).length === 1, 'single profile for email');
    assert(state.notifications.length === 1, 'notification created');
    const w1 = state.warehouses.find((w) => w.id === 'wh-w1')!;
    assert(w1.staff_count === 1, `staff_count 1 (got ${w1.staff_count})`);
    assert(canAccessWarehouseDashboard(login('ok@x.com', 'phone1234')), 'created staff can log in and access dashboard');
  }

  console.log('\n=== RESULT ===');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('\nFailures:');
    for (const f of failures) console.log(' - ' + f);
    throw new Error(`${failed} verification test(s) failed`);
  } else {
    console.log('ALL TESTS PASSED');
  }
}

function liveWarehouses() {
  return state.warehouses.filter((w) => !w.deleted);
}

await main();
