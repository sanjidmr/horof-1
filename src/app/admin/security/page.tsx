'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shield, Activity, FileText, Users, Database, Ban, UserCheck,
  ClipboardList, Search, Filter, ChevronDown, ChevronRight, Plus,
  Trash2, Download, Upload, RefreshCw,
  Clock, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  Server, HardDrive, Calendar, Play, Loader2, Settings,
  UserPlus, UserMinus, List, Zap, Globe, Mail, Phone,
  Key, Lock, Unlock, ArrowUpDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import {
  getSecurityDashboardStats, getAuditLogs, clearAuditLogs,
  getRoles, createRole, updateRole, deleteRole,
  getPermissions, updateRolePermission, updateRolePermissionsBatch,
  getAdminUsers, assignUserRole, removeUserRole,
  getBackups, createBackup, getRestoreHistory, getBackupSchedules,
  createBackupSchedule, updateBackupSchedule,
  getFraudRules, logAudit
} from '@/lib/actions/security';
import { Button } from '@/components/shadcn/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/shadcn/select';
import { Switch } from '@/components/shadcn/switch';

interface AuditLog {
  id: string; user_id: string; user_email?: string; user_role?: string;
  action: string; entity_type: string; entity_id?: string;
  description?: string; severity: string; created_at: string;
  metadata?: any; user?: { id: string; full_name?: string; email?: string; avatar_url?: string };
}

interface Role {
  id: string; name: string; description?: string; priority: number;
  is_system?: boolean; created_at: string;
  permissions?: { permission: Permission }[];
}

interface Permission {
  id: string; name: string; module: string; description?: string;
}

interface AdminUser {
  id: string; full_name?: string; email?: string; avatar_url?: string;
  role?: string; created_at: string; is_warehouse_staff?: boolean;
  assigned_warehouse_id?: string | null;
  user_roles?: { role: Role }[];
}

interface Backup {
  id: string; name: string; type: string; status: string;
  size_bytes?: number; created_at: string; completed_at?: string;
  file_path?: string; error_message?: string;
}

interface RestoreHistoryItem {
  id: string; backup_id: string; status: string; created_at: string;
  notes?: string; backup?: { name: string; type: string; size_bytes?: number };
}

interface BackupSchedule {
  id: string; name: string; type: string; frequency: string;
  time_of_day: string; retention_days: number; is_active: boolean;
  next_run_at: string; created_at: string;
}

interface FraudRule {
  id: string; name: string; rule_type: string; config?: any;
  priority: number; score: number; is_active: boolean;
}

interface DashboardStats {
  totalAuditLogs: number; activeSessions: number;
  unresolvedSecurityEvents: number;
  totalBackups: number; totalRoles: number;
  totalAdminUsers: number; failedLogins24h: number;
  recentActivity: AuditLog[];
  loginHistory: any[];
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { id: 'roles', label: 'Roles & Permissions', icon: Key },
  { id: 'user-roles', label: 'User Roles', icon: UserCheck },
  { id: 'backup', label: 'Backup & Recovery', icon: Database },
  { id: 'fraud', label: 'Fraud Protection', icon: Ban },
];

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  error: 'bg-orange-100 text-orange-700 border-orange-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

const backupStatusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  running: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  verified: 'bg-green-100 text-green-700',
};

export default function SecurityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Overview
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilters, setAuditFilters] = useState<{ action?: string; entityType?: string; severity?: string; from?: string; to?: string }>({});
  const [auditSearchUser, setAuditSearchUser] = useState('');
  const [clearingLogs, setClearingLogs] = useState(false);

  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // User Roles
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assigningRoleId, setAssigningRoleId] = useState('');

  // Backup
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupTotal, setBackupTotal] = useState(0);
  const [backupPage, setBackupPage] = useState(1);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreHistory, setRestoreHistory] = useState<RestoreHistoryItem[]>([]);
  const [restoreTotal, setRestoreTotal] = useState(0);
  const [backupSchedules, setBackupSchedules] = useState<BackupSchedule[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ name: '', type: 'full', frequency: 'daily', timeOfDay: '02:00', retentionDays: 30 });
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  // Fraud
  const [fraudRules, setFraudRules] = useState<FraudRule[]>([]);

  const perPage = 25;

  const fetchDashboard = useCallback(async () => {
    const data = await getSecurityDashboardStats();
    setStats(data);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data, total } = await getAuditLogs(auditPage, perPage, {
      ...auditFilters,
      userId: auditSearchUser || undefined,
    });
    setAuditLogs(data);
    setAuditTotal(total);
  }, [auditPage, auditFilters, auditSearchUser]);

  const fetchRoles = useCallback(async () => {
    const [r, p] = await Promise.all([getRoles(), getPermissions()]);
    setRoles(r);
    setPermissions(p);
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    const u = await getAdminUsers();
    setAdminUsers(u);
  }, []);

  const fetchBackups = useCallback(async () => {
    const { data, total } = await getBackups(backupPage, perPage);
    setBackups(data);
    setBackupTotal(total);
    const { data: rh } = await getRestoreHistory(1, 10);
    setRestoreHistory(rh);
    const sch = await getBackupSchedules();
    setBackupSchedules(sch);
  }, [backupPage]);

  const fetchFraud = useCallback(async () => {
    const fr = await getFraudRules();
    setFraudRules(fr);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDashboard(),
      fetchAuditLogs(),
      fetchRoles(),
      fetchAdminUsers(),
      fetchBackups(),
      fetchFraud(),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeTab === 'audit-logs') fetchAuditLogs(); }, [auditPage, auditFilters, auditSearchUser]);
  useEffect(() => { if (activeTab === 'backup') fetchBackups(); }, [backupPage]);
  useEffect(() => { if (activeTab === 'fraud') fetchFraud(); }, []);

  const handleClearLogs = async () => {
    setClearingLogs(true);
    const { error } = await clearAuditLogs();
    if (error) toast.error(error);
    else { toast.success('Old audit logs cleared'); fetchAuditLogs(); }
    setClearingLogs(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    const { error } = await createRole(newRoleName.trim(), newRoleDesc.trim() || undefined);
    if (error) toast.error(error);
    else { toast.success('Role created'); setRoleModalOpen(false); setNewRoleName(''); setNewRoleDesc(''); fetchRoles(); }
    setCreatingRole(false);
  };

  const handleDeleteRole = async (id: string) => {
    setDeletingRoleId(id);
    const { error } = await deleteRole(id);
    if (error) toast.error(error);
    else { toast.success('Role deleted'); fetchRoles(); }
    setDeletingRoleId(null);
  };

  const handleTogglePermission = async (roleId: string, permId: string, granted: boolean) => {
    setEditingPerms(prev => ({ ...prev, [permId]: granted }));
  };

  const initRolePerms = (role: Role) => {
    const map: Record<string, boolean> = {};
    permissions.forEach(p => {
      const rolePerm = role.permissions?.find(rp => rp.permission?.id === p.id);
      map[p.id] = !!rolePerm;
    });
    setEditingPerms(map);
  };

  const hasPermChanges = (role: Role) => {
    return permissions.some(p => {
      const orig = !!role.permissions?.find(rp => rp.permission?.id === p.id);
      return editingPerms[p.id] !== orig;
    });
  };

  const handleSavePermissions = async (roleId: string) => {
    setSavingPerms(true);
    const grantedIds = Object.entries(editingPerms).filter(([, v]) => v).map(([k]) => k);
    const { error } = await updateRolePermissionsBatch(roleId, grantedIds);
    if (error) toast.error(error);
    else { toast.success('Permissions saved successfully'); fetchRoles(); }
    setSavingPerms(false);
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    const { error } = await assignUserRole(userId, roleId);
    if (error) toast.error(error);
    else { toast.success('Role assigned'); fetchAdminUsers(); }
    setAssigningUserId(null);
    setAssigningRoleId('');
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const { error } = await removeUserRole(userId, roleId);
    if (error) toast.error(error);
    else { toast.success('Role removed'); fetchAdminUsers(); }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    const { error } = await createBackup('manual');
    if (error) toast.error(error);
    else { toast.success('Backup started'); fetchBackups(); }
    setCreatingBackup(false);
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name.trim()) return;
    setCreatingSchedule(true);
    const { error } = await createBackupSchedule(newSchedule);
    if (error) toast.error(error);
    else { toast.success('Schedule created'); setScheduleModalOpen(false); setNewSchedule({ name: '', type: 'full', frequency: 'daily', timeOfDay: '02:00', retentionDays: 30 }); fetchBackups(); }
    setCreatingSchedule(false);
  };

  const handleToggleSchedule = async (id: string, isActive: boolean) => {
    const { error } = await updateBackupSchedule(id, { is_active: isActive });
    if (error) toast.error(error);
    else { toast.success(isActive ? 'Schedule activated' : 'Schedule deactivated'); fetchBackups(); }
  };


  const renderSeverityBadge = (severity: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${severityColors[severity] || severityColors.info}`}>
      {severity}
    </span>
  );

  const renderStatusBadge = (status: string, colorMap: Record<string, string>) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${colorMap[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const modules = [...new Set(permissions.map(p => p.module))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#1a4731] mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Loading Security Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1a4731]">Security Center</h1>
          <p className="text-slate-500 mt-1">Administration, roles, backups, and fraud protection.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              // The redesigned Roles & Permissions manager lives at its own route.
              if (tab.id === 'roles') {
                router.push('/admin/security/roles');
                return;
              }
              setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-t-xl transition-all ${
              activeTab === tab.id
                ? 'bg-[#1a4731] text-white shadow-lg shadow-[#1a4731]/20'
                : 'text-slate-500 hover:text-[#1a4731] hover:bg-[#1a4731]/5'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[
              { label: 'Total Audit Logs', value: stats?.totalAuditLogs ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Active Sessions', value: stats?.activeSessions ?? 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Unresolved Security Events', value: stats?.unresolvedSecurityEvents ?? 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Completed Backups', value: stats?.totalBackups ?? 0, icon: Database, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Failed Logins (24h)', value: stats?.failedLogins24h ?? 0, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Admin Users', value: stats?.totalAdminUsers ?? 0, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { label: 'Total Roles', value: stats?.totalRoles ?? 0, icon: Key, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-display font-bold text-slate-900">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity Timeline */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1a4731]/10 rounded-xl">
                    <Activity className="h-5 w-5 text-[#1a4731]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Recent Security Activity</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last 10 entries</span>
              </div>
              <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                {(stats?.recentActivity?.length ?? 0) > 0 ? (
                  stats!.recentActivity.map((log) => (
                    <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.severity === 'critical' || log.severity === 'error' ? 'bg-red-50 text-red-600' :
                        log.severity === 'warning' ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {log.severity === 'critical' || log.severity === 'error' ? <XCircle className="h-4 w-4" /> :
                         log.severity === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                          {renderSeverityBadge(log.severity)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {log.description || `${log.action} on ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                          <span>{log.user_email || 'System'}</span>
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No recent activity recorded.</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button onClick={() => setActiveTab('audit-logs')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#1a4731]/5 transition-colors text-left">
                    <ClipboardList className="h-5 w-5 text-[#1a4731]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">View Audit Logs</p>
                      <p className="text-[10px] text-slate-500">Review all security events</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('backup')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#1a4731]/5 transition-colors text-left">
                    <Database className="h-5 w-5 text-[#1a4731]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Create Backup</p>
                      <p className="text-[10px] text-slate-500">Manual database backup</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('roles')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#1a4731]/5 transition-colors text-left">
                    <Key className="h-5 w-5 text-[#1a4731]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Manage Roles</p>
                      <p className="text-[10px] text-slate-500">Configure permissions</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('fraud')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#1a4731]/5 transition-colors text-left">
                    <Ban className="h-5 w-5 text-[#1a4731]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Fraud Protection</p>
                      <p className="text-[10px] text-slate-500">Manage blacklist/whitelist</p>
                    </div>
                  </button>
                  <button onClick={() => setActiveTab('user-roles')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#1a4731]/5 transition-colors text-left">
                    <UserCheck className="h-5 w-5 text-[#1a4731]" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">User Roles</p>
                      <p className="text-[10px] text-slate-500">Assign roles to admins</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1a4731] to-[#0d2b1e] p-6 rounded-2xl text-white shadow-xl shadow-[#1a4731]/20">
                <h3 className="text-lg font-bold mb-2">Security Status</h3>
                <p className="text-sm text-white/70 mb-4">Overall system security health</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-400/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {stats?.unresolvedSecurityEvents && stats.unresolvedSecurityEvents > 0 ? 'Issues Detected' : 'All Clear'}
                    </p>
                    <p className="text-xs text-white/60">
                      {stats?.unresolvedSecurityEvents ?? 0} unresolved events
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit-logs' && (
        <motion.div key="audit-logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={auditFilters.severity || '_all'} onValueChange={v => setAuditFilters(f => ({ ...f, severity: v === '_all' ? undefined : v }))}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="text"
                placeholder="Filter by user email..."
                value={auditSearchUser}
                onChange={e => setAuditSearchUser(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731] w-60"
              />
              <input
                type="date"
                value={auditFilters.from || ''}
                onChange={e => setAuditFilters(f => ({ ...f, from: e.target.value || undefined }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a4731]"
              />
              <input
                type="date"
                value={auditFilters.to || ''}
                onChange={e => setAuditFilters(f => ({ ...f, to: e.target.value || undefined }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1a4731]"
              />
              <Button variant="outline" size="sm" onClick={() => { setAuditFilters({}); setAuditSearchUser(''); setAuditPage(1); }} className="text-slate-600">
                <Filter className="h-4 w-4 mr-1" /> Clear
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} className="text-slate-600">
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button size="sm" onClick={handleClearLogs} disabled={clearingLogs} className="bg-red-600 hover:bg-red-700 text-white ml-auto">
                {clearingLogs ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Clear Old Logs
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Severity</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditLogs.length > 0 ? (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#1a4731]/10 flex items-center justify-center text-[10px] font-bold text-[#1a4731]">
                              {(log.user_email || 'S')[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700">{log.user_email || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900 capitalize">{log.action.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</span>
                        </td>
                        <td className="px-6 py-4 max-w-[250px]">
                          <p className="text-sm text-slate-600 truncate">{log.description || '-'}</p>
                        </td>
                        <td className="px-6 py-4">{renderSeverityBadge(log.severity)}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">No audit logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">{auditTotal} total log entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(p => Math.max(1, p - 1))}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 px-3">Page {auditPage} of {Math.ceil(auditTotal / perPage) || 1}</span>
                <Button variant="outline" size="sm" disabled={auditPage >= Math.ceil(auditTotal / perPage)} onClick={() => setAuditPage(p => p + 1)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Roles & Permissions */}
      {activeTab === 'roles' && (
        <motion.div key="roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setRoleModalOpen(true)} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Create New Role
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {roles.map(role => {
              const isEditing = expandedRole === role.id;
              const dirty = isEditing && hasPermChanges(role);
              return (
                <div key={role.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => {
                      if (expandedRole === role.id) { setExpandedRole(null); setEditingPerms({}); }
                      else { setExpandedRole(role.id); initRolePerms(role); }
                    }}
                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-[#1a4731]/10">
                        <Key className="h-5 w-5 text-[#1a4731]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                        <p className="text-xs text-slate-500">{role.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {dirty && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Unsaved</span>}
                      <span className="text-[10px] text-slate-400 font-bold">Priority: {role.priority}</span>
                      {role.is_system && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-widest">System</span>
                      )}
                      {isEditing ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                    </div>
                  </button>

                  {isEditing && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-sm text-slate-500">
                          {Object.values(editingPerms).filter(Boolean).length} / {permissions.length} permissions enabled
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!role.is_system}
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {deletingRoleId === role.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            disabled={!dirty || savingPerms}
                            onClick={() => handleSavePermissions(role.id)}
                            className={`rounded-xl ${dirty ? 'bg-[#1a4731] hover:bg-[#2d6a4f] text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {savingPerms ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Save Permissions
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {modules.map(mod => {
                          const modPerms = permissions.filter(p => p.module === mod);
                          const allModOn = modPerms.every(p => editingPerms[p.id]);
                          const someModOn = modPerms.some(p => editingPerms[p.id]);
                          return (
                            <div key={mod} className="rounded-xl border border-slate-100 overflow-hidden">
                              <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest capitalize">{mod.replace(/_/g, ' ')}</h4>
                                <button
                                  onClick={() => {
                                    const next = !allModOn;
                                    setEditingPerms(prev => {
                                      const updated = { ...prev };
                                      modPerms.forEach(p => { updated[p.id] = next; });
                                      return updated;
                                    });
                                  }}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allModOn ? 'bg-[#1a4731]' : someModOn ? 'bg-[#1a4731]/40' : 'bg-slate-300'}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allModOn ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-50">
                                {modPerms.map(perm => {
                                  const on = !!editingPerms[perm.id];
                                  return (
                                    <button
                                      key={perm.id}
                                      onClick={() => handleTogglePermission(role.id, perm.id, !on)}
                                      className={`flex items-center gap-3 p-4 transition-all text-left group ${on ? 'bg-[#1a4731]/5 hover:bg-[#1a4731]/10' : 'bg-white hover:bg-slate-50'}`}
                                    >
                                      <div className={`w-12 h-7 rounded-full flex items-center transition-colors shrink-0 ${on ? 'bg-[#1a4731]' : 'bg-slate-200'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-sm font-semibold capitalize ${on ? 'text-[#1a4731]' : 'text-slate-500'}`}>{perm.name.replace(/_/g, ' ')}</p>
                                        {perm.description && <p className="text-[10px] text-slate-400 truncate">{perm.description}</p>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {dirty && (
                        <div className="sticky bottom-0 mt-6 p-4 bg-white border border-amber-200 rounded-xl shadow-lg flex items-center justify-between">
                          <p className="text-sm text-amber-700 font-semibold">You have unsaved changes</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => initRolePerms(role)}>Discard</Button>
                            <Button size="sm" disabled={savingPerms} onClick={() => handleSavePermissions(role.id)} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white">
                              {savingPerms ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create Role Modal */}
          {roleModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Create New Role</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="e.g., content_manager"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={newRoleDesc}
                      onChange={e => setNewRoleDesc(e.target.value)}
                      placeholder="Optional description"
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731] resize-none"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateRole} disabled={creatingRole || !newRoleName.trim()} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white">
                      {creatingRole ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Create
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab: User Roles */}
      {activeTab === 'user-roles' && (
        <motion.div key="user-roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {adminUsers.map(user => (
            <div key={user.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#1a4731]/10 flex items-center justify-center text-lg font-bold text-[#1a4731]">
                    {(user.full_name || user.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{user.full_name || 'Unnamed'}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Base role: {user.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.is_warehouse_staff && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-widest">
                      Warehouse Staff
                    </span>
                  )}
                  {user.user_roles?.map(ur => (
                    <span key={ur.role?.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#1a4731]/10 text-[#1a4731] uppercase tracking-widest">
                      {ur.role?.name}
                      <button onClick={() => handleRemoveRole(user.id, ur.role!.id)} className="hover:text-red-600 transition-colors">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {(!user.user_roles || user.user_roles.length === 0) && (
                    <span className="text-xs text-slate-400 italic">No roles assigned</span>
                  )}
                  {assigningUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <Select value={assigningRoleId} onValueChange={setAssigningRoleId}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {roles.filter(r => !user.user_roles?.some(ur => ur.role?.id === r.id)).map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => { if (assigningRoleId) handleAssignRole(user.id, assigningRoleId); }} disabled={!assigningRoleId} className="bg-[#1a4731] text-white">
                        <CheckCircle className="h-3 w-3 mr-1" /> Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAssigningUserId(null)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setAssigningUserId(user.id); setAssigningRoleId(''); }} className="text-[#1a4731] border-[#1a4731]/30">
                      <UserPlus className="h-4 w-4 mr-1" /> Assign Role
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {adminUsers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">No admin or warehouse staff users found.</div>
          )}
        </motion.div>
      )}

      {/* Tab: Backup & Recovery */}
      {activeTab === 'backup' && (
        <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Backup Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Backups', value: backupTotal, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Last Backup', value: backups[0] ? formatDate(backups[0].created_at) : 'N/A', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Storage Used', value: formatBytes(backups.reduce((a, b) => a + (b.size_bytes || 0), 0)), icon: HardDrive, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl font-display font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCreateBackup} disabled={creatingBackup} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl">
              {creatingBackup ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Create Backup Now
            </Button>
            <Button onClick={() => setScheduleModalOpen(true)} variant="outline" className="border-[#1a4731] text-[#1a4731] rounded-xl">
              <Calendar className="h-4 w-4 mr-2" /> Schedule Backup
            </Button>
          </div>

          {/* Backup History Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Backup History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {backups.length > 0 ? backups.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{b.name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 capitalize">{b.type}</td>
                      <td className="px-6 py-4">{renderStatusBadge(b.status, backupStatusColors)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatBytes(b.size_bytes)}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(b.created_at)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">No backups found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">{backupTotal} total backups</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={backupPage <= 1} onClick={() => setBackupPage(p => Math.max(1, p - 1))}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 px-3">Page {backupPage}</span>
                <Button variant="outline" size="sm" disabled={backupPage >= Math.ceil(backupTotal / perPage)} onClick={() => setBackupPage(p => p + 1)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Restore History */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Restore History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-6 py-4">Backup</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {restoreHistory.length > 0 ? restoreHistory.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900">{r.backup?.name || r.backup_id.slice(0, 8)}</td>
                      <td className="px-6 py-4">{renderStatusBadge(r.status, { completed: 'bg-emerald-100 text-emerald-700', failed: 'bg-red-100 text-red-700', running: 'bg-blue-100 text-blue-700' })}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{r.notes || '-'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 text-sm">No restore history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Backups */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Scheduled Backups</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {backupSchedules.length > 0 ? backupSchedules.map(s => (
                <div key={s.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-blue-50"><Calendar className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{s.frequency} &middot; {s.time_of_day} &middot; {s.type} &middot; Retain {s.retention_days}d</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Next: {formatDate(s.next_run_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={s.is_active} onCheckedChange={v => handleToggleSchedule(s.id, v)} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${s.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">No backup schedules configured.</div>
              )}
            </div>
          </div>

          {/* Schedule Modal */}
          {scheduleModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-slate-900 mb-4">New Backup Schedule</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Name</label>
                    <input type="text" value={newSchedule.name} onChange={e => setNewSchedule(s => ({ ...s, name: e.target.value }))} placeholder="e.g., Nightly Full Backup" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                      <Select value={newSchedule.frequency} onValueChange={v => setNewSchedule(s => ({ ...s, frequency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Time of Day</label>
                      <input type="time" value={newSchedule.timeOfDay} onChange={e => setNewSchedule(s => ({ ...s, timeOfDay: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <Select value={newSchedule.type} onValueChange={v => setNewSchedule(s => ({ ...s, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Backup</SelectItem>
                        <SelectItem value="incremental">Incremental</SelectItem>
                        <SelectItem value="differential">Differential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Retention (days)</label>
                    <input type="number" value={newSchedule.retentionDays || ''} onChange={e => setNewSchedule(s => ({ ...s, retentionDays: parseInt(e.target.value) || 30 }))} min={1} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731]" />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSchedule} disabled={creatingSchedule || !newSchedule.name.trim()} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white">
                      {creatingSchedule ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Create
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tab: Fraud Protection */}
      {activeTab === 'fraud' && (
        <motion.div key="fraud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Fraud Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Rules', value: fraudRules.length, icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-display font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Fraud Rules */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Active Fraud Rules</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {fraudRules.length > 0 ? fraudRules.map(rule => (
                <div key={rule.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-orange-50"><Zap className="h-4 w-4 text-orange-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{rule.rule_type} &middot; Score: {rule.score} &middot; Priority: {rule.priority}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest">Active</span>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">No active fraud rules.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
