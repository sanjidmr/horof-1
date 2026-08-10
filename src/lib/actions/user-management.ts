'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { Permission, Role, UserRole, UserPermission, AdminUser } from '@/types/rbac';

// ============================================================
// PERMISSION CHECKING (Server-Side)
// ============================================================

export async function checkPermission(userId: string, permissionCode: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:role_id(name, id)')
    .eq('user_id', userId);

  const roleNames = (userRoles || []).map((ur: any) => ur.role?.name).filter(Boolean) as string[];

  if (roleNames.includes('super_admin') || roleNames.includes('owner')) return true;

  const roleIds = (userRoles || []).map((ur: any) => ur.role?.id).filter(Boolean);
  if (roleIds.length > 0) {
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission:permission_id(code), granted')
      .eq('granted', true)
      .in('role_id', roleIds);

    const grantedCodes = new Set((rolePerms || []).map((rp: any) => rp.permission?.code).filter(Boolean));
    if (grantedCodes.has(permissionCode)) return true;
  }

  const { data: perm } = await supabase.from('permissions').select('id').eq('code', permissionCode).single();
  if (perm) {
    const { data: userPerm } = await supabase
      .from('user_permissions')
      .select('granted')
      .eq('user_id', userId)
      .eq('permission_id', perm.id)
      .maybeSingle();
    if (userPerm?.granted) return true;
  }

  return false;
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role:role_id(name)')
    .eq('user_id', user.id);

  const roleNames = (userRoles || []).map((ur: any) => ur.role?.name).filter(Boolean) as string[];

  if (roleNames.includes('super_admin') || roleNames.includes('owner')) {
    const { data: allPerms } = await supabase.from('permissions').select('code');
    return (allPerms || []).map((p: any) => p.code);
  }

  const roleIds = (userRoles || []).map((ur: any) => (ur.role as any)?.id).filter(Boolean);
  if (roleIds.length === 0) return [];

  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('permission:permission_id(code)')
    .eq('granted', true)
    .in('role_id', roleIds);

  return (rolePerms || []).map((rp: any) => rp.permission?.code).filter(Boolean) as string[];
}

export async function getCurrentUserRoles(): Promise<Role[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('user_roles')
    .select('role:role_id(*)')
    .eq('user_id', user.id);

  if (!data) return [];

  return data.map((ur: any) => ur.role).filter(Boolean) as Role[];
}

// ============================================================
// USER MANAGEMENT
// ============================================================

/**
 * Create a new internal system user.
 * The entered phone number automatically becomes the user's initial login password.
 * The password is securely hashed by Supabase Auth before saving.
 * The phone number itself is still stored normally in the profile.
 */
export async function createUser(params: {
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  roleId?: string;
  is_warehouse_staff?: boolean;
  assigned_warehouse_id?: string | null;
}) {
  const { requirePermission } = await import('./security');
  await requirePermission('users.edit');

  // Validate required fields
  if (!params.email || !params.email.trim()) {
    throw new Error('Email is required');
  }
  if (!params.full_name || !params.full_name.trim()) {
    throw new Error('Full name is required');
  }
  if (!params.phone || !params.phone.trim()) {
    throw new Error('Phone number is required — it will be used as the initial login password');
  }

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(params.email.trim())) {
    throw new Error('Please enter a valid email address');
  }

  // Validate phone format (basic: 10-15 digits, may include +, -, spaces)
  const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
  if (!phoneRegex.test(params.phone.trim())) {
    throw new Error('Please enter a valid phone number (10-15 digits)');
  }

  // Validate RBAC role requirement
  if ((params.role === 'admin' || (!params.is_warehouse_staff && params.role === 'customer')) && !params.roleId) {
    throw new Error('RBAC role is required for admin and customer users');
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check for duplicate email in profiles (case-insensitive)
  const { data: existingEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', params.email.trim())
    .maybeSingle();

  if (existingEmail) {
    throw new Error('An account with this email already exists');
  }

  // Check for duplicate email in auth.users (case-insensitive)
  const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = (existingAuthUser?.users || []) as any[];
  const authEmailExists = authUsers.some(
    (u) => u.email && u.email.toLowerCase() === params.email.trim().toLowerCase()
  );
  if (authEmailExists) {
    throw new Error('An account with this email already exists');
  }

  // The phone number becomes the initial password
  const initialPassword = params.phone.trim();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: params.email.trim(),
    password: initialPassword, // Phone number as initial password (hashed by Supabase)
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name.trim(),
      is_warehouse_staff: params.is_warehouse_staff || params.role === 'warehouse_staff' || false,
      assigned_warehouse_id: params.assigned_warehouse_id || null,
      role: params.role,
      user_type: 'internal',
    },
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('already exists')) {
      throw new Error('An account with this email already exists');
    }
    throw new Error(authError.message || 'Failed to create user');
  }
  if (!authData.user) throw new Error('Failed to create user');

  const profileData: any = {
    id: authData.user.id,
    email: params.email.trim(),
    full_name: params.full_name.trim(),
    phone: params.phone.trim(),
    role: params.role,
    user_type: 'internal', // Always internal for users created via Create New User
    is_banned: false,
  };

  if (params.role === 'warehouse_staff' || params.is_warehouse_staff) {
    profileData.is_warehouse_staff = true;
    profileData.assigned_warehouse_id = params.assigned_warehouse_id || null;
    profileData.role = 'warehouse_staff';
  }

  const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(profileData, { onConflict: 'id' });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Profile creation failed: ${profileErr.message}`);
  }

  if (params.roleId) {
    const { error: roleErr } = await supabaseAdmin.from('user_roles').upsert({
      user_id: authData.user.id,
      role_id: params.roleId,
    }, { onConflict: 'user_id,role_id' });
    if (roleErr) console.error('Role assign error:', roleErr);
  }

  // If creating warehouse staff, ensure the warehouse_staff role is assigned
  if (params.role === 'warehouse_staff' || params.is_warehouse_staff) {
    const { data: staffRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'warehouse_staff')
      .maybeSingle();

    if (staffRole) {
      const { error: staffRoleErr } = await supabaseAdmin.from('user_roles').upsert({
        user_id: authData.user.id,
        role_id: staffRole.id,
      }, { onConflict: 'user_id,role_id' });
      if (staffRoleErr) console.error('Warehouse staff role assign error:', staffRoleErr);
    }
  }

  revalidatePath('/admin/users');
  return { user: authData.user, initialPassword };
}

/**
 * Get internal system users only (never customers).
 */
export async function getUsers(page: number = 1, perPage: number = 20, filters?: {
  search?: string;
  role?: string;
  isBanned?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };
  const { requirePermission } = await import('./security');
  await requirePermission('users.view');

  let query = supabase
    .from('profiles')
    .select('*, user_roles:user_roles!user_id(role:role_id(*))', { count: 'exact' })
    .eq('user_type', 'internal'); // ONLY internal users

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters?.role) {
    if (filters.role === 'warehouse_staff') {
      query = query.eq('is_warehouse_staff', true);
    } else {
      query = query.eq('role', filters.role);
    }
  }
  if (filters?.isBanned !== undefined) {
    query = query.eq('is_banned', filters.isBanned);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('getUsers error:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

/**
 * Get real customers only (never internal users).
 */
export async function getCustomers(page: number = 1, perPage: number = 20, filters?: {
  search?: string;
  isBanned?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };
  const { requirePermission } = await import('./security');
  await requirePermission('customers.view');

  let query = supabase
    .from('profiles')
    .select('*, user_roles:user_roles!user_id(role:role_id(*))', { count: 'exact' })
    .eq('user_type', 'customer') // ONLY real customers
    .eq('role', 'customer')
    .eq('is_warehouse_staff', false);

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters?.isBanned !== undefined) {
    query = query.eq('is_banned', filters.isBanned);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('getCustomers error:', error);
    return { data: [], total: 0 };
  }
  return { data: data || [], total: count || 0 };
}

export async function getUserById(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { requirePermission } = await import('./security');
  await requirePermission('users.view');

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_roles:user_roles!user_id(id, role:role_id(id, name, description, color, icon, priority)),
      user_permissions:user_permissions(id, permission:permission_id(id, code, name, module), granted, notes)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getUserById error:', error);
    return null;
  }
  return data;
}

export async function updateUserProfile(userId: string, data: {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_banned?: boolean;
  notes?: string;
  avatar_url?: string;
  is_warehouse_staff?: boolean;
  assigned_warehouse_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertCanManageTargetUser } = await import('./security');
  await requirePermission('users.edit');
  await assertCanManageTargetUser(userId);

  // Use service-role client for the actual profile update so that
  // sensitive columns (is_warehouse_staff, assigned_warehouse_id, role)
  // are not blocked by the prevent_privilege_escalation trigger.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check for duplicate email if email is being changed
  if (data.email) {
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', data.email)
      .neq('id', userId)
      .maybeSingle();
    if (existingEmail) {
      return { error: 'An account with this email already exists' };
    }
  }

  // Use service-role client for the actual profile update so that
  // sensitive columns (is_warehouse_staff, assigned_warehouse_id, role)
  // are not blocked by the prevent_privilege_escalation trigger.
  const { error } = await supabaseAdmin.from('profiles').update(data).eq('id', userId);
  if (error) return { error: error.message };

  // Sync auth user_metadata when is_warehouse_staff changes (critical for login redirect)
  if (data.is_warehouse_staff !== undefined || data.assigned_warehouse_id !== undefined) {
    try {
      const { data: currentProfile } = await supabaseAdmin.from('profiles')
        .select('is_warehouse_staff, assigned_warehouse_id')
        .eq('id', userId).single();

      const isWarehouseStaff = currentProfile?.is_warehouse_staff ?? data.is_warehouse_staff ?? false;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          is_warehouse_staff: isWarehouseStaff,
          assigned_warehouse_id: currentProfile?.assigned_warehouse_id ?? data.assigned_warehouse_id ?? null,
          role: isWarehouseStaff ? 'warehouse_staff' : 'customer',
          user_type: isWarehouseStaff ? 'internal' : 'customer',
        },
      });

      // Sync the warehouse_staff RBAC role
      const { data: staffRole } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', 'warehouse_staff')
        .maybeSingle();

      if (staffRole) {
        if (isWarehouseStaff) {
          await supabaseAdmin.from('user_roles').upsert({
            user_id: userId,
            role_id: staffRole.id,
          }, { onConflict: 'user_id,role_id' });
        } else {
          await supabaseAdmin.from('user_roles').delete()
            .eq('user_id', userId)
            .eq('role_id', staffRole.id);
        }
      }
    } catch (metaErr) {
      console.error('Failed to sync auth metadata (non-fatal):', metaErr);
    }
  }

  const { logAudit } = await import('./security');
  await logAudit('update_user', 'profiles', userId, `Updated user profile`, { fields: Object.keys(data) });

  return { error: null };
}

export async function toggleUserBan(userId: string, banned: boolean) {
  const { requirePermission, assertCanManageTargetUser } = await import('./security');
  await requirePermission('users.manage');
  await assertCanManageTargetUser(userId);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('profiles').update({ is_banned: banned }).eq('id', userId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit(banned ? 'ban_user' : 'unban_user', 'profiles', userId, `${banned ? 'Banned' : 'Unbanned'} user`);

  return { error: null };
}

export async function deleteUser(userId: string) {
  const { requirePermission, assertCanManageTargetUser } = await import('./security');
  await requirePermission('users.delete');
  await assertCanManageTargetUser(userId);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('delete_user', 'profiles', userId, 'Deleted user account');

  return { error: null };
}

// ============================================================
// USER ROLE MANAGEMENT
// ============================================================

export async function assignUserRole(userId: string, roleId: string) {
  const { requirePermission, assertRoleAssignable } = await import('./security');
  await requirePermission('users.manage');
  await assertRoleAssignable(roleId, userId);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role_id: roleId, assigned_by: user.id }, { onConflict: 'user_id,role_id' });
  if (error) return { error: error.message };

  // When a role is assigned, ensure the user is marked as internal
  await supabase.from('profiles').update({ user_type: 'internal' }).eq('id', userId);

  const { logAudit } = await import('./security');
  const { data: role } = await supabase.from('roles').select('name').eq('id', roleId).single();
  await logAudit('assign_role', 'user_roles', userId, `Assigned role: ${role?.name}`);

  return { error: null };
}

export async function removeUserRole(userId: string, roleId: string) {
  const { requirePermission, assertRoleRemovable } = await import('./security');
  await requirePermission('users.manage');
  await assertRoleRemovable(roleId);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('remove_role', 'user_roles', userId, 'Removed role from user');

  return { error: null };
}

// ============================================================
// USER PERMISSION OVERRIDES
// ============================================================

export async function setUserPermission(userId: string, permissionId: string, granted: boolean, notes?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertCanManageTargetUser } = await import('./security');
  await requirePermission('users.manage');
  await assertCanManageTargetUser(userId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      permission_id: permissionId,
      granted,
      assigned_by: user.id,
      notes: notes || null,
    }, { onConflict: 'user_id,permission_id' });

  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('set_user_permission', 'user_permissions', userId, `${granted ? 'Granted' : 'Revoked'} per-user permission override`);

  return { error: null };
}

export async function removeUserPermission(userId: string, permissionId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertCanManageTargetUser } = await import('./security');
  await requirePermission('users.manage');
  await assertCanManageTargetUser(userId);

  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('permission_id', permissionId);

  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('remove_user_permission', 'user_permissions', userId, 'Removed per-user permission override');

  return { error: null };
}

// ============================================================
// ROLE CRUD
// ============================================================

export async function createRole(name: string, description?: string, color?: string, icon?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission } = await import('./security');
  await requirePermission('security_center.edit');

  const { data, error } = await supabase
    .from('roles')
    .insert({ name, description, color: color || '#1a4731', icon: icon || 'Shield' })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('create_role', 'roles', data.id, `Created role: ${name}`);

  return { error: null, id: data.id };
}

export async function updateRole(id: string, data: { name?: string; description?: string; priority?: number; color?: string; icon?: string; is_default?: boolean }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertRoleEditable } = await import('./security');
  await requirePermission('security_center.edit');
  await assertRoleEditable(id);

  const { error } = await supabase.from('roles').update(data).eq('id', id);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('update_role', 'roles', id, `Updated role`, { fields: Object.keys(data) });

  return { error: null };
}

export async function deleteRole(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertRoleEditable } = await import('./security');
  await requirePermission('security_center.delete');
  await assertRoleEditable(id);

  const { data: role } = await supabase.from('roles').select('name, is_system').eq('id', id).single();
  if (role?.is_system) return { error: 'Cannot delete system roles' };

  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('delete_role', 'roles', id, `Deleted role: ${role?.name}`);

  return { error: null };
}

export async function cloneRole(sourceRoleId: string, newName: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertRoleEditable } = await import('./security');
  await requirePermission('security_center.edit');
  await assertRoleEditable(sourceRoleId);

  const { data: sourceRole } = await supabase.from('roles').select('*').eq('id', sourceRoleId).single();
  if (!sourceRole) return { error: 'Source role not found' };

  const { data: newRole, error: roleError } = await supabase
    .from('roles')
    .insert({
      name: newName,
      description: `Cloned from ${sourceRole.name}`,
      color: sourceRole.color,
      icon: sourceRole.icon,
      priority: sourceRole.priority - 1,
    })
    .select('id')
    .single();
  if (roleError) return { error: roleError.message };

  const { data: sourcePerms } = await supabase
    .from('role_permissions')
    .select('permission_id, granted')
    .eq('role_id', sourceRoleId);

  if (sourcePerms && sourcePerms.length > 0) {
    const newPerms = sourcePerms.map(sp => ({
      role_id: newRole.id,
      permission_id: sp.permission_id,
      granted: sp.granted,
    }));
    await supabase.from('role_permissions').insert(newPerms);
  }

  const { logAudit } = await import('./security');
  await logAudit('clone_role', 'roles', newRole.id, `Cloned role "${sourceRole.name}" → "${newName}"`);

  return { error: null, id: newRole.id };
}

// ============================================================
// ROLES & PERMISSIONS FETCH
// ============================================================

export async function getAllRoles(): Promise<Role[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { requirePermission } = await import('./security');
  await requirePermission('security_center.view');

  const { data } = await supabase.from('roles').select('*').order('priority', { ascending: false });
  return (data || []) as Role[];
}

export async function getAllPermissions(): Promise<Permission[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { requirePermission } = await import('./security');
  await requirePermission('security_center.view');

  const { data } = await supabase.from('permissions').select('*').order('module').order('name');
  return (data || []) as Permission[];
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { requirePermission } = await import('./security');
  await requirePermission('security_center.view');

  const { data } = await supabase
    .from('role_permissions')
    .select('permission:permission_id(code)')
    .eq('role_id', roleId)
    .eq('granted', true);

  if (!data) return [];
  return data.map((rp: any) => rp.permission?.code).filter(Boolean);
}

export async function updateRolePermission(roleId: string, permissionCode: string, granted: boolean) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission, assertRoleEditable } = await import('./security');
  await requirePermission('security_center.manage');
  await assertRoleEditable(roleId);

  const { data: perm } = await supabase.from('permissions').select('id').eq('code', permissionCode).single();
  if (!perm) return { error: 'Permission not found' };

  if (granted) {
    const { error } = await supabase
      .from('role_permissions')
      .upsert({ role_id: roleId, permission_id: perm.id, granted: true }, { onConflict: 'role_id,permission_id' });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', perm.id);
    if (error) return { error: error.message };
  }

  const { logAudit } = await import('./security');
  await logAudit('update_role_permission', 'role_permissions', `${roleId}_${perm.id}`, `${granted ? 'Granted' : 'Revoked'} ${permissionCode}`);

  return { error: null };
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

export async function getUserSessions(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { requirePermission } = await import('./security');
  await requirePermission('users.view');

  const { data } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false });

  return (data || []) as any[];
}

export async function terminateSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission } = await import('./security');
  await requirePermission('users.manage');

  const { error } = await supabase.from('user_sessions').update({ is_active: false }).eq('id', sessionId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('terminate_session', 'user_sessions', sessionId, 'Terminated user session');

  return { error: null };
}

export async function terminateAllUserSessions(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { requirePermission } = await import('./security');
  await requirePermission('users.manage');

  const { error } = await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('terminate_all_sessions', 'user_sessions', userId, 'Terminated all user sessions');

  return { error: null };
}