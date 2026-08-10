// ============================================================================
// WAREHOUSE STAFF PROVISIONING SERVICE (pure, framework-free)
//
// PRODUCTION REBUILD
//
// This service is the single, atomic entry point for "create warehouse staff".
// It is injected with real OR mocked dependencies (AuthApi / DbService /
// WarehouseService / Logger) so it is unit-testable without Next / Supabase
// runtime imports.
//
// ORDER OF OPERATIONS (any failure rolls EVERYTHING back — no orphans):
//   1. Validate every input (email, password, phone, warehouse).
//   2. Validate the warehouse exists.
//   3. PRE-CLEAN email ownership BEFORE createUser:
//        a. a LIVE auth user      -> upgrade path (never re-create, never 500)
//        b. a SOFT-DELETED auth user -> hard-purge so a fresh insert can succeed
//        c. ORPHAN profiles (no live auth user) -> purge so the
//           on_auth_user_created trigger can never abort inside GoTrue's
//           auth.users INSERT transaction (the REAL root cause of the
//           "Auth API server error (HTTP 500)" / "Auth API error: {}" bug).
//   4. auth.admin.createUser (with one race-conditional retry).
//   5. ensureProfile  -> staff, internal, assigned to the warehouse.
//   6. assignRole     -> user_roles (warehouse_staff).
//   7. sync metadata  -> best-effort.
//   8. notification   -> warehouse-targeted, best-effort but logged.
//
// ROLLBACK (compensating — no single DB transaction spans Auth + Postgres):
//   - a brand-new auth user  -> hard delete (cascades profile + user_roles).
//   - a reused/live user     -> revert the staff marker + role we added.
//   - the warehouse (created earlier) -> deleted by createWarehouseAndStaff.
//
// Every step is logged: step name, duration, DB / Auth response, rollback
// reason. Errors never fake a cause: the REAL GoTrue body is captured when
// available and surfaced.
// ============================================================================

// ---------------------------------------------------------------------------
// Error model
// ---------------------------------------------------------------------------
export type StaffErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'WEAK_PASSWORD'
  | 'EMAIL_ALREADY_EXISTS'
  | 'AUTH_API_ERROR'
  | 'DB_ERROR'
  | 'ROLE_NOT_FOUND'
  | 'DUPLICATE_WAREHOUSE'
  | 'WAREHOUSE_ERROR'
  | 'TRANSACTION_ERROR';

export class StaffError extends Error {
  code: StaffErrorCode;
  causeMsg?: string;
  /** Structured diagnostics: function, SQL error, constraint, trigger, responses. */
  details?: Record<string, unknown>;

  constructor(code: StaffErrorCode, message: string, causeMsg?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'StaffError';
    this.code = code;
    this.causeMsg = causeMsg;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Logger contract (testable; default = console)
// ---------------------------------------------------------------------------
export interface Logger {
  info(step: string, detail?: Record<string, unknown>): void;
  warn(step: string, detail?: Record<string, unknown>): void;
  error(step: string, detail?: Record<string, unknown>): void;
}

const consoleLogger: Logger = {
  info: (step, detail) => console.log(`[STAFF_PROVISION] ${step}${detail ? ' ' + JSON.stringify(detail) : ''}`),
  warn: (step, detail) => console.warn(`[STAFF_PROVISION] ${step}${detail ? ' ' + JSON.stringify(detail) : ''}`),
  error: (step, detail) => console.error(`[STAFF_PROVISION] ${step}${detail ? ' ' + JSON.stringify(detail) : ''}`),
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;

// ---------------------------------------------------------------------------
// Dependency contracts
// ---------------------------------------------------------------------------
export interface AuthUserView {
  id: string;
  email: string;
  deleted_at?: string | null;
}

export interface AuthApiErrorView {
  /** Best-effort human message. supabase-js can emit the literal "{}" for 5xx;
   *  the adapter is expected to attach the REAL response body in `raw`. */
  message: string;
  status?: number;
  code?: string;
  name?: string;
  weak_password?: { reasons?: string[] };
  raw?: unknown;
}

export interface AuthApi {
  /** Find a LIVE auth user by email (case-insensitive). null if none. */
  findByEmail(email: string): Promise<AuthUserView | null>;
  /** Find a SOFT-DELETED auth user by email (case-insensitive). null if none. */
  findSoftDeletedByEmail(email: string): Promise<AuthUserView | null>;
  /** Create an auth user. Returns the REAL error on failure. */
  createUser(input: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata: Record<string, unknown>;
  }): Promise<{ user: AuthUserView | null; error: AuthApiErrorView | null }>;
  /** Hard delete an auth user (purges soft-deleted rows too). */
  hardDeleteUser(id: string): Promise<{ error?: string }>;
  /** Sync user_metadata (non-fatal). */
  updateUserMetadata(id: string, metadata: Record<string, unknown>): Promise<{ error?: string }>;
}

export interface ProfilePayload {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  user_type: string;
  is_banned: boolean;
  is_warehouse_staff: boolean;
  assigned_warehouse_id: string | null;
}

export interface NotificationInput {
  title: string;
  message: string;
  type: string;
  warehouse_id: string;
  entity_type: string;
  entity_id: string;
}

export interface DbService {
  /** true when the warehouse exists. */
  warehouseExists(id: string): Promise<boolean>;
  /** UPSERT a profile by id (upgrades whatever handle_new_user left behind). */
  ensureProfile(p: ProfilePayload): Promise<{ ok: boolean; message?: string }>;
  /** Delete profiles sharing this email that are NOT backed by keepUserId's
   *  live auth account. Pass keepUserId=null to purge every profile with the
   *  email (there is no live owner). */
  purgeOrphanProfilesByEmail(email: string, keepUserId: string | null): Promise<{ ok: boolean; error?: string }>;
  /** Resolve the warehouse_staff role id. */
  warehouseStaffRoleId(): Promise<{ id?: string; error?: string }>;
  /** Idempotently assign the warehouse_staff role to a user. */
  assignRole(userId: string, roleId: string): Promise<{ ok: boolean; error?: string }>;
  /** Warehouse-targeted notification (visible to that warehouse's staff). */
  createNotification(input: NotificationInput): Promise<{ ok: boolean; error?: string }>;
  /** Best-effort revert of staffing (role + profile staff marker + warehouse). */
  revertStaffing(userId: string): Promise<{ ok: boolean }>;
}

export interface WarehouseService {
  /** Allocate a warehouse, returning its id. Throws StaffError on duplicates. */
  createWarehouse(data: Record<string, unknown>): Promise<{ id?: string; error?: { message: string; code?: string } }>;
  /** Delete a warehouse (used for rollback). */
  deleteWarehouse(id: string): Promise<{ error?: string }>;
}

export interface ProvisionInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  warehouseId: string;
}

export interface ProvisionResult {
  userId: string;
  email: string;
  createdAuthUser: boolean;
  reusedAuthUser: boolean;
}

// ---------------------------------------------------------------------------
// Auth error classification — never echoes "{}" or fakes a cause.
// ---------------------------------------------------------------------------
function extractAuthMessage(err: AuthApiErrorView): string {
  const candidate = err.message ?? '';
  if (typeof candidate === 'string' && candidate.trim() && candidate.trim() !== '{}') {
    return candidate.trim();
  }
  return '';
}

export function classifyAuthError(err: AuthApiErrorView): { code: StaffErrorCode; message: string } {
  const raw = extractAuthMessage(err);
  const m = raw.toLowerCase();
  const status = err.status;

  const reasons = Array.isArray(err.weak_password?.reasons) ? err.weak_password!.reasons! : [];
  if (reasons.length) {
    return { code: 'WEAK_PASSWORD', message: `Password does not meet the requirements: ${reasons.join(', ')}` };
  }
  if (err.code === 'weak_password' || err.name === 'AuthWeakPasswordError') {
    return { code: 'WEAK_PASSWORD', message: `Weak password: ${raw || 'see Supabase Auth logs for the rejected rule'}` };
  }

  if (/already exists|duplicate/i.test(m)) return { code: 'EMAIL_ALREADY_EXISTS', message: `An account with this email already exists (${raw})` };
  if (/password/i.test(m) && /at least|too (short|weak)|minimum|character|must be/i.test(m)) return { code: 'WEAK_PASSWORD', message: `Weak password: ${raw}` };
  if (/invalid|not valid|malformed/i.test(m) && /email/i.test(m)) return { code: 'INVALID_EMAIL', message: `Invalid email address (${raw})` };
  if (/rate limit|too many requests/i.test(m)) return { code: 'AUTH_API_ERROR', message: `Auth API rate limited, retry shortly: ${raw}` };

  if (status === 401 || status === 403) {
    return { code: 'AUTH_API_ERROR', message: 'Auth API refused the request (HTTP 401/403). Verify SUPABASE_SERVICE_ROLE_KEY and that the project has not been paused.' };
  }
  if (status && status >= 500) {
    return {
      code: 'AUTH_API_ERROR',
      message: `Auth API server error (HTTP ${status})${raw ? `: ${raw}` : '. See the server log for the raw Supabase response.'}`,
    };
  }

  const detail = raw || (status ? `HTTP ${status}` : 'no status / no message');
  return { code: 'AUTH_API_ERROR', message: `Auth API error: ${detail}` };
}

function toStaffError(err: AuthApiErrorView): StaffError {
  const c = classifyAuthError(err);
  return new StaffError(c.code, c.message, err.message, {
    function: 'provisionStaffMember',
    auth_response: { status: err.status, code: err.code, name: err.name, raw: err.raw },
  });
}

function stepTiming(startedAt: number): number {
  return Date.now() - startedAt;
}

// ---------------------------------------------------------------------------
// Main provisioning routine
// ---------------------------------------------------------------------------
export async function provisionStaffMember(
  auth: AuthApi,
  db: DbService,
  input: ProvisionInput,
  logger: Logger = consoleLogger,
): Promise<ProvisionResult> {
  const startedAt = Date.now();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const warehouseId = input.warehouseId;
  const phone = input.phone?.trim() ? input.phone.trim() : null;

  // ── 1. Validate ALL inputs before ANY external call ───────────────────────
  if (!EMAIL_RE.test(email)) {
    throw new StaffError('INVALID_EMAIL', 'Please enter a valid email address');
  }
  if (!warehouseId) {
    throw new StaffError('WAREHOUSE_ERROR', 'A warehouse is required');
  }
  if (!password || password.length < 6) {
    throw new StaffError('WEAK_PASSWORD', 'Password must be at least 6 characters');
  }
  if (password.length > 72) {
    throw new StaffError('WEAK_PASSWORD', 'Password must be at most 72 characters (bcrypt limit)');
  }
  if (phone && !PHONE_RE.test(phone)) {
    throw new StaffError('INVALID_PHONE', 'Phone must be 6–20 digits (digits, +, -, spaces, parentheses)');
  }
  logger.info('validate inputs', { email, phone, passwordLength: password.length, warehouseId, ms: stepTiming(startedAt) });

  // ── 2. Warehouse must exist before we create anything ─────────────────────
  let whExists = false;
  try {
    whExists = await db.warehouseExists(warehouseId);
  } catch (e: any) {
    logger.error('warehouseExists failed', { error: e?.message });
    throw new StaffError('WAREHOUSE_ERROR', `Could not verify warehouse: ${e?.message ?? 'unknown'}`, e?.message);
  }
  if (!whExists) {
    throw new StaffError('WAREHOUSE_ERROR', `The warehouse does not exist (${warehouseId})`);
  }
  logger.info('warehouse validated', { warehouseId, ms: stepTiming(startedAt) });

  // ── 3. Resolve email ownership BEFORE createUser (root-cause fix) ─────────
  const live = await auth.findByEmail(email);

  // 3b. purge a soft-deleted auth user so a fresh insert can succeed
  const soft = await auth.findSoftDeletedByEmail(email);
  if (soft) {
    logger.warn('purging soft-deleted auth user', { id: soft.id, ms: stepTiming(startedAt) });
    const purgeAuth = await auth.hardDeleteUser(soft.id);
    if (purgeAuth.error) {
      logger.warn('hard-delete of soft-deleted user reported an error', { error: purgeAuth.error });
    }
  }

  let user: AuthUserView;
  let createdAuthUser = false;
  let reusedAuthUser = false;

  if (live) {
    user = live;
    reusedAuthUser = true;
    logger.info('existing live auth user — upgrade path', { id: user.id, ms: stepTiming(startedAt) });
  } else {
    // 3c. purge orphan profiles sharing the email so the trigger cannot abort
    const purge = await db.purgeOrphanProfilesByEmail(email, null);
    if (!purge.ok) {
      logger.warn('orphan profile purge failed (continuing)', { error: purge.error });
    } else {
      logger.info('orphan profiles purged', { email, ms: stepTiming(startedAt) });
    }

    const createInput = {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        phone: phone ?? undefined,
        is_warehouse_staff: true,
        assigned_warehouse_id: warehouseId,
        role: 'warehouse_staff',
        user_type: 'internal',
      },
    };

    const created = await auth.createUser(createInput);
    if (created.error) {
      // Race / soft-delete / purge raced: re-check truth once and retry.
      const recheck = await auth.findByEmail(email);
      const recheckSoft = await auth.findSoftDeletedByEmail(email);
      if (recheck) {
        user = recheck;
        reusedAuthUser = true;
        logger.info('createUser raced — reused the live user', { id: user.id });
      } else if (recheckSoft) {
        logger.warn('createUser hit a soft-deleted user — purging and retrying once', { id: recheckSoft.id });
        await auth.hardDeleteUser(recheckSoft.id);
        await db.purgeOrphanProfilesByEmail(email, null);
        const retried = await auth.createUser(createInput);
        if (retried.error) throw toStaffError(retried.error);
        user = retried.user!;
        createdAuthUser = true;
      } else {
        throw toStaffError(created.error);
      }
    } else {
      user = created.user!;
      createdAuthUser = true;
      logger.info('auth user created', { id: user.id, ms: stepTiming(startedAt) });
    }
  }

  // ── 4–8. Profile → role → metadata → notification (roll back on failure) ──
  try {
    const profileRes = await db.ensureProfile({
      id: user.id,
      email,
      full_name: input.full_name?.trim() || '',
      phone,
      role: 'warehouse_staff',
      user_type: 'internal',
      is_banned: false,
      is_warehouse_staff: true,
      assigned_warehouse_id: warehouseId,
    });
    if (!profileRes.ok) {
      throw new StaffError('DB_ERROR', `Could not create staff profile: ${profileRes.message ?? 'unknown error'}`,
        profileRes.message, { function: 'ensureProfile' });
    }
    logger.info('profile upserted', { id: user.id, ms: stepTiming(startedAt) });

    const role = await db.warehouseStaffRoleId();
    if (role.error) {
      throw new StaffError('ROLE_NOT_FOUND', `The "warehouse_staff" role could not be resolved: ${role.error}`,
        role.error, { function: 'warehouseStaffRoleId' });
    }
    if (!role.id) {
      throw new StaffError('ROLE_NOT_FOUND', 'The "warehouse_staff" role is missing from the database');
    }
    const roleRes = await db.assignRole(user.id, role.id);
    if (!roleRes.ok) {
      throw new StaffError('DB_ERROR', `Could not assign warehouse staff role: ${roleRes.error ?? 'unknown'}`,
        roleRes.error, { function: 'assignRole' });
    }
    logger.info('role assigned', { id: user.id, roleId: role.id, ms: stepTiming(startedAt) });

    // 7. metadata sync — best-effort, never fatal
    await auth.updateUserMetadata(user.id, {
      full_name: input.full_name,
      phone: phone ?? undefined,
      is_warehouse_staff: true,
      assigned_warehouse_id: warehouseId,
      role: 'warehouse_staff',
      user_type: 'internal',
    }).catch((e: any) => {
      logger.warn('metadata sync failed (non-fatal)', { error: e?.message ?? 'unknown' });
    });

    // 8. warehouse-targeted notification — best-effort, logged
    const notif = await db.createNotification({
      title: 'New warehouse staff member',
      message: `${input.full_name?.trim() || email} (${email}) was assigned to this warehouse.`,
      type: 'warehouse',
      warehouse_id: warehouseId,
      entity_type: 'warehouse_staff',
      entity_id: user.id,
    }).catch((e: any) => ({ ok: false as const, error: e?.message ?? 'unknown' }));
    if (!notif.ok) {
      logger.warn('staff notification skipped (non-fatal)', { error: notif.error });
    } else {
      logger.info('staff notification created', { warehouseId, ms: stepTiming(startedAt) });
    }
  } catch (err) {
    // Compensating rollback of exactly what we created.
    if (createdAuthUser) {
      logger.warn('rolling back created auth user', { id: user.id });
      await auth.hardDeleteUser(user.id).catch(() => undefined);
    } else if (reusedAuthUser) {
      logger.warn('rolling back staffing on reused user', { id: user.id });
      await db.revertStaffing(user.id).catch(() => undefined);
    }
    logger.error('provision failed — rolled back', {
      code: err instanceof StaffError ? err.code : 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
      details: err instanceof StaffError ? err.details : undefined,
      ms: stepTiming(startedAt),
    });
    throw err;
  }

  logger.info('provision complete', {
    userId: user.id,
    email,
    createdAuthUser,
    reusedAuthUser,
    ms: stepTiming(startedAt),
  });

  return { userId: user.id, email, createdAuthUser, reusedAuthUser };
}

// ---------------------------------------------------------------------------
// Warehouse allocation with duplicate-slug detection
// ---------------------------------------------------------------------------
export async function allocateWarehouse(
  ws: WarehouseService,
  data: Record<string, unknown>,
  logger: Logger = consoleLogger,
): Promise<{ id: string }> {
  const startedAt = Date.now();
  const res = await ws.createWarehouse(data);
  if (res.error) {
    const m = res.error.message || '';
    const isDuplicate = m.toLowerCase().includes('unique constraint') && m.toLowerCase().includes('slug');
    logger.error('warehouse allocation failed', { error: res.error, ms: stepTiming(startedAt) });
    if (isDuplicate) {
      throw new StaffError('DUPLICATE_WAREHOUSE', 'A warehouse with this slug already exists', m, { function: 'allocateWarehouse', constraint: 'warehouses.slug' });
    }
    throw new StaffError('WAREHOUSE_ERROR', `Could not create warehouse: ${m || 'unknown'}`, m, { function: 'allocateWarehouse' });
  }
  if (!res.id) {
    throw new StaffError('WAREHOUSE_ERROR', 'Could not create warehouse', undefined, { function: 'allocateWarehouse' });
  }
  logger.info('warehouse allocated', { id: res.id, ms: stepTiming(startedAt) });
  return { id: res.id };
}

// ---------------------------------------------------------------------------
// Combined, atomic warehouse + staff operation with clean rollback:
//   Create Warehouse -> Validate -> Pre-clean -> Create Auth User -> Profile
//   -> Role -> Assign Warehouse (in profile) -> staff_count (trigger) ->
//   Notification -> success.
// If anything fails AFTER the warehouse is created, the warehouse is deleted.
// ===========================================================================
export async function createWarehouseAndStaff(
  auth: AuthApi,
  db: DbService,
  ws: WarehouseService,
  input: {
    warehouse: Record<string, unknown>;
    staff?: {
      email: string;
      password: string;
      full_name: string;
      phone?: string | null;
    } | null;
  },
  logger: Logger = consoleLogger,
): Promise<{ warehouseId: string; staffCreated: boolean; userId?: string }> {
  const startedAt = Date.now();
  let warehouseId: string | null = null;
  try {
    const alloc = await allocateWarehouse(ws, input.warehouse, logger);
    warehouseId = alloc.id;

    if (!input.staff) {
      logger.info('warehouse created (no staff requested)', { warehouseId: alloc.id, ms: stepTiming(startedAt) });
      return { warehouseId: alloc.id, staffCreated: false };
    }

    const r = await provisionStaffMember(auth, db, {
      email: input.staff.email,
      password: input.staff.password,
      full_name: input.staff.full_name,
      phone: input.staff.phone ?? null,
      warehouseId: alloc.id,
    }, logger);

    logger.info('warehouse + staff created', { warehouseId: alloc.id, userId: r.userId, ms: stepTiming(startedAt) });
    return { warehouseId: alloc.id, staffCreated: true, userId: r.userId };
  } catch (err) {
    // Duplicate-warehouse errors happen BEFORE the warehouse was created, so we
    // must NOT delete any pre-existing warehouse. Any other failure after a
    // successful create rolls the warehouse back (no partial data).
    if (warehouseId && !(err instanceof StaffError && err.code === 'DUPLICATE_WAREHOUSE')) {
      logger.warn('rolling back warehouse', { warehouseId });
      try {
        await ws.deleteWarehouse(warehouseId);
      } catch (cleanupErr: any) {
        logger.error('warehouse rollback failed', { error: cleanupErr?.message ?? String(cleanupErr) });
      }
    }
    logger.error('createWarehouseAndStaff failed', {
      code: err instanceof StaffError ? err.code : 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
      ms: stepTiming(startedAt),
    });
    throw err;
  }
}
