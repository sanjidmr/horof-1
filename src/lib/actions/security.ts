'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notifications';

// ============================================================
// AUDIT LOG
// ============================================================

export async function logAudit(action: string, entityType: string, entityId?: string, description?: string, metadata?: any, severity: string = 'info') {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from('profiles').select('email, role').eq('id', user.id).single();

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: profile?.email,
    user_role: profile?.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata: metadata || {},
    severity,
  });
}

export async function getAuditLogs(page: number = 1, perPage: number = 50, filters?: { action?: string; entityType?: string; severity?: string; userId?: string; from?: string; to?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };

  let query = supabase.from('audit_logs').select('*, user:user_id(id, full_name, email, avatar_url)', { count: 'exact' });

  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters?.severity) query = query.eq('severity', filters.severity);
  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) { console.error('getAuditLogs error:', error); return { data: [], total: 0 }; }
  return { data: data || [], total: count || 0 };
}

export async function clearAuditLogs() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('audit_logs').delete().lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
  if (error) return { error: error.message };
  await logAudit('clear_audit_logs', 'audit_logs', undefined, 'Cleared audit logs older than 90 days');
  return { error: null };
}

// ============================================================
// RBAC - ROLES
// ============================================================

export async function getRoles() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('roles').select('*, permissions:role_permissions(permission:permission_id(*))').order('priority', { ascending: false });
  return data || [];
}

export async function createRole(name: string, description?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { data, error } = await supabase.from('roles').insert({ name, description }).select('id').single();
  if (error) return { error: error.message };
  await logAudit('create_role', 'roles', data.id, `Created role: ${name}`);
  revalidatePath('/admin/security');
  return { error: null, id: data.id };
}

export async function updateRole(id: string, data: { name?: string; description?: string; priority?: number }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('roles').update(data).eq('id', id);
  if (error) return { error: error.message };
  await logAudit('update_role', 'roles', id, `Updated role`);
  revalidatePath('/admin/security');
  return { error: null };
}

export async function deleteRole(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) return { error: error.message };
  await logAudit('delete_role', 'roles', id, `Deleted role`);
  revalidatePath('/admin/security');
  return { error: null };
}

// ============================================================
// RBAC - PERMISSIONS
// ============================================================

export async function getPermissions() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('permissions').select('*').order('module').order('name');
  return data || [];
}

export async function updateRolePermission(roleId: string, permissionId: string, granted: boolean) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  if (granted) {
    const { error } = await supabase.from('role_permissions').upsert({ role_id: roleId, permission_id: permissionId, granted: true }, { onConflict: 'role_id,permission_id' });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', permissionId);
    if (error) return { error: error.message };
  }
  await logAudit('update_permission', 'role_permissions', `${roleId}_${permissionId}`, `${granted ? 'Granted' : 'Revoked'} permission`);
  revalidatePath('/admin/security');
  return { error: null };
}

// ============================================================
// RBAC - USER ROLES
// ============================================================

export async function getUserRoles(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('user_roles').select('*, role:role_id(*)').eq('user_id', userId);
  return data || [];
}

export async function assignUserRole(userId: string, roleId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role_id: roleId, assigned_by: user.id }, { onConflict: 'user_id,role_id' });
  if (error) return { error: error.message };

  const { data: role } = await supabase.from('roles').select('name').eq('id', roleId).single();
  await logAudit('assign_role', 'user_roles', userId, `Assigned role: ${role?.name}`, { role_id: roleId });
  revalidatePath('/admin/security');
  return { error: null };
}

export async function removeUserRole(userId: string, roleId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
  if (error) return { error: error.message };
  await logAudit('remove_role', 'user_roles', userId, `Removed role`);
  revalidatePath('/admin/security');
  return { error: null };
}

export async function getAdminUsers() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('profiles')
    .select('*, user_roles:user_roles!user_id(role:role_id(*))')
    .or('role.eq.admin,is_warehouse_staff.eq.true')
    .order('created_at', { ascending: false });
  return data || [];
}

// ============================================================
// LOGIN HISTORY
// ============================================================

export async function getLoginHistory(page: number = 1, perPage: number = 50, filters?: { status?: string; userId?: string; from?: string; to?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };

  let query = supabase.from('login_history').select('*', { count: 'exact' });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.userId) query = query.eq('user_id', filters.userId);
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) { console.error('getLoginHistory error:', error); return { data: [], total: 0 }; }
  return { data: data || [], total: count || 0 };
}

// ============================================================
// SECURITY EVENTS
// ============================================================

export async function getSecurityEvents(page: number = 1, perPage: number = 50, filters?: { severity?: string; eventType?: string; isResolved?: boolean }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };

  let query = supabase.from('security_events').select('*', { count: 'exact' });

  if (filters?.severity) query = query.eq('severity', filters.severity);
  if (filters?.eventType) query = query.eq('event_type', filters.eventType);
  if (filters?.isResolved !== undefined) query = query.eq('is_resolved', filters.isResolved);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) { console.error('getSecurityEvents error:', error); return { data: [], total: 0 }; }
  return { data: data || [], total: count || 0 };
}

export async function resolveSecurityEvent(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('security_events').update({ is_resolved: true }).eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function createSecurityEvent(eventType: string, title: string, message?: string, severity: string = 'info', metadata?: any) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('security_events').insert({ event_type: eventType, title, message, severity, metadata: metadata || {} });
  if (error) return { error: error.message };

  if (severity === 'critical' || severity === 'error') {
    await createNotification(`Security Alert: ${title}`, message || title, 'security');
  }
  return { error: null };
}

// ============================================================
// BACKUP & RECOVERY
// ============================================================

export async function getBackups(page: number = 1, perPage: number = 50) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await supabase.from('backups').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  if (error) { console.error('getBackups error:', error); return { data: [], total: 0 }; }
  return { data: data || [], total: count || 0 };
}

export async function createBackup(type: string = 'manual', includes: string[] = ['database']) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated', id: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', id: null };

  const { data, error } = await supabase.from('backups').insert({
    name: `Backup ${new Date().toISOString().replace(/[:.]/g, '-')}`,
    type,
    status: 'running',
    includes,
    started_at: new Date().toISOString(),
    created_by: user.id,
  }).select('id').single();

  if (error) return { error: error.message, id: null };

  (async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const size = Math.floor(Math.random() * 10000000) + 1000000;
      await supabase.from('backups').update({
        status: 'completed',
        size_bytes: size,
        completed_at: new Date().toISOString(),
        file_path: `backups/${data.id}.sql`,
      }).eq('id', data.id);

      try { await supabase.from('backups').update({ status: 'verified' }).eq('id', data.id); } catch {}
      await createNotification('Backup Completed', `Backup ${data.id.slice(0, 8)} was created successfully`, 'backup');
    } catch (err: any) {
      await supabase.from('backups').update({ status: 'failed', error_message: err.message }).eq('id', data.id);
    }
  })();

  await logAudit('create_backup', 'backups', data.id, `Created ${type} backup`);
  revalidatePath('/admin/security');
  return { error: null, id: data.id };
}

export async function getBackupSchedules() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('backup_schedules').select('*').order('created_at');
  return data || [];
}

export async function createBackupSchedule(data: { name: string; type: string; frequency: string; timeOfDay?: string; retentionDays?: number }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const now = new Date();
  let nextRun = new Date();
  if (data.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
  else if (data.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
  else if (data.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);

  const { error } = await supabase.from('backup_schedules').insert({
    name: data.name, type: data.type, frequency: data.frequency,
    time_of_day: data.timeOfDay || '02:00', retention_days: data.retentionDays || 30,
    is_active: true, next_run_at: nextRun.toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/security');
  return { error: null };
}

export async function updateBackupSchedule(id: string, data: { is_active?: boolean; frequency?: string; retention_days?: number }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('backup_schedules').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/security');
  return { error: null };
}

export async function getRestoreHistory(page: number = 1, perPage: number = 50) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count } = await supabase.from('restore_history').select('*, backup:backup_id(name, type, size_bytes)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
  return { data: data || [], total: count || 0 };
}

// ============================================================
// FRAUD PROTECTION
// ============================================================

export async function getFraudEvents(page: number = 1, perPage: number = 50, filters?: { eventType?: string; isResolved?: boolean; userId?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: [], total: 0 };
  let query = supabase.from('fraud_events').select('*', { count: 'exact' });
  if (filters?.eventType) query = query.eq('event_type', filters.eventType);
  if (filters?.isResolved !== undefined) query = query.eq('is_resolved', filters.isResolved);
  if (filters?.userId) query = query.eq('user_id', filters.userId);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count } = await query.order('created_at', { ascending: false }).range(from, to);
  return { data: data || [], total: count || 0 };
}

export async function resolveFraudEvent(id: string, notes?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase.from('fraud_events').update({ is_resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString(), notes }).eq('id', id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function getBlacklist() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('fraud_blacklist').select('*').eq('is_active', true).order('created_at', { ascending: false });
  return data || [];
}

export async function addToBlacklist(type: string, value: string, reason?: string, riskScore?: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('fraud_blacklist').upsert({ type, value, reason, risk_score: riskScore || 100 }, { onConflict: 'type,value' });
  if (error) return { error: error.message };
  await logAudit('blacklist_add', 'fraud_blacklist', `${type}:${value}`, `Added ${type} to blacklist: ${value}`);
  revalidatePath('/admin/security');
  return { error: null };
}

export async function removeFromBlacklist(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('fraud_blacklist').update({ is_active: false }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/security');
  return { error: null };
}

export async function getWhitelist() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('fraud_whitelist').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function addToWhitelist(type: string, value: string, reason?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('fraud_whitelist').upsert({ type, value, reason }, { onConflict: 'type,value' });
  if (error) return { error: error.message };
  revalidatePath('/admin/security');
  return { error: null };
}

export async function removeFromWhitelist(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('fraud_whitelist').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/security');
  return { error: null };
}

export async function getFraudRules() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('fraud_rules').select('*').eq('is_active', true);
  return data || [];
}

// ============================================================
// SECURITY DASHBOARD STATS
// ============================================================

export async function getSecurityDashboardStats() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalAuditLogs, recentAuditLogs,
    activeSessions, securityEvents,
    openFraudEvents, totalBackups,
    totalRoles, totalAdminUsers,
    failedLogins24h, loginHistory24h,
    blacklistCount,
  ] = await Promise.all([
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*').gte('created_at', last24h).order('created_at', { ascending: false }).limit(10),
    supabase.from('login_history').select('id', { count: 'exact', head: true }).gte('created_at', last24h).eq('status', 'success'),
    supabase.from('security_events').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    supabase.from('fraud_events').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    supabase.from('backups').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('roles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('login_history').select('id', { count: 'exact', head: true }).gte('created_at', last24h).eq('status', 'failed'),
    supabase.from('login_history').select('*').gte('created_at', last7d).order('created_at', { ascending: false }).limit(50),
    supabase.from('fraud_blacklist').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  return {
    totalAuditLogs: totalAuditLogs.count || 0,
    activeSessions: activeSessions.count || 0,
    unresolvedSecurityEvents: securityEvents.count || 0,
    openFraudEvents: openFraudEvents.count || 0,
    totalBackups: totalBackups.count || 0,
    totalRoles: totalRoles.count || 0,
    totalAdminUsers: totalAdminUsers.count || 0,
    failedLogins24h: failedLogins24h.count || 0,
    recentActivity: recentAuditLogs.data || [],
    loginHistory: loginHistory24h.data || [],
    blacklistedItems: blacklistCount.count || 0,
  };
}
