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

  const { data, error } = await supabase.rpc('check_user_permission', {
    p_user_id: userId,
    p_permission_code: permissionCode,
  });

  if (error) {
    console.error('checkPermission error:', error);
    return false;
  }

  return data === true;
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('getCurrentUserPermissions error:', error);
    return [];
  }

  if (!data) return [];

  return data
    .filter((p: { granted: boolean }) => p.granted)
    .map((p: { permission_code: string }) => p.permission_code);
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

export async function createUser(params: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: string;
  roleId?: string;
  is_warehouse_staff?: boolean;
  assigned_warehouse_id?: string | null;
}) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.full_name },
  });

  if (authError) {
    if (authError.message?.includes('already exists')) {
      throw new Error('An account with this email already exists');
    }
    throw new Error(authError.message || 'Failed to create user');
  }
  if (!authData.user) throw new Error('Failed to create user');

  const profileData: any = {
    id: authData.user.id,
    email: params.email,
    full_name: params.full_name,
    phone: params.phone || null,
    role: params.role,
    is_banned: false,
  };

  if (params.role === 'warehouse_staff' || params.is_warehouse_staff) {
    profileData.is_warehouse_staff = true;
    profileData.assigned_warehouse_id = params.assigned_warehouse_id || null;
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

  revalidatePath('/admin/users');
  return { user: authData.user };
}

export async function getUsers(page: number = 1, perPage: number = 20, filters?: {
  search?: string;
  role?: string;
  isBanned?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };

  let query = supabase.from('profiles').select('*, user_roles:user_roles!user_id(role:role_id(*))', { count: 'exact' });

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters?.role) {
    query = query.eq('role', filters.role);
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

export async function getUserById(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

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

  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('update_user', 'profiles', userId, `Updated user profile`, { fields: Object.keys(data) });

  return { error: null };
}

export async function toggleUserBan(userId: string, banned: boolean) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('profiles').update({ is_banned: banned }).eq('id', userId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit(banned ? 'ban_user' : 'unban_user', 'profiles', userId, `${banned ? 'Banned' : 'Unbanned'} user`);

  return { error: null };
}

export async function deleteUser(userId: string) {
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
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role_id: roleId, assigned_by: user.id }, { onConflict: 'user_id,role_id' });
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  const { data: role } = await supabase.from('roles').select('name').eq('id', roleId).single();
  await logAudit('assign_role', 'user_roles', userId, `Assigned role: ${role?.name}`);

  return { error: null };
}

export async function removeUserRole(userId: string, roleId: string) {
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

  const { error } = await supabase.from('roles').update(data).eq('id', id);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('update_role', 'roles', id, `Updated role`, { fields: Object.keys(data) });

  return { error: null };
}

export async function deleteRole(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

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

  const { data } = await supabase.from('roles').select('*').order('priority', { ascending: false });
  return (data || []) as Role[];
}

export async function getAllPermissions(): Promise<Permission[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase.from('permissions').select('*').order('module').order('name');
  return (data || []) as Permission[];
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

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

  const { error } = await supabase.from('user_sessions').update({ is_active: false }).eq('id', sessionId);
  if (error) return { error: error.message };

  const { logAudit } = await import('./security');
  await logAudit('terminate_session', 'user_sessions', sessionId, 'Terminated user session');

  return { error: null };
}

export async function terminateAllUserSessions(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

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
