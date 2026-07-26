'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Search, Shield, Ban, Trash2, Edit,
  UserCheck, UserX, AlertTriangle, Building2,
  ChevronLeft, ChevronRight, X, Check, Warehouse,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createUser, updateUserProfile } from '@/lib/actions/user-management';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/components/PermissionGate';

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_banned: boolean;
  avatar_url: string | null;
  created_at: string;
  is_warehouse_staff: boolean;
  assigned_warehouse_id: string | null;
  user_roles?: { role: { id: string; name: string; description: string; color: string; priority: number } }[];
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  priority: number;
  is_system: boolean;
}

interface WarehouseType {
  id: string;
  name: string;
  is_active: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-50 text-red-700 border-red-100',
  owner: 'bg-purple-50 text-purple-700 border-purple-100',
  manager: 'bg-blue-50 text-blue-700 border-blue-100',
  inventory_manager: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  sales_manager: 'bg-amber-50 text-amber-700 border-amber-100',
  marketing_manager: 'bg-pink-50 text-pink-700 border-pink-100',
  customer_support: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  content_manager: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  finance_manager: 'bg-orange-50 text-orange-700 border-orange-100',
  staff: 'bg-slate-50 text-slate-700 border-slate-100',
};

export default function UsersPage() {
  const supabase = createSupabaseBrowserClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const perPage = 20;

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<AdminUser | null>(null);
  const [showAssignRole, setShowAssignRole] = useState<AdminUser | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ action: string; user: AdminUser; label: string } | null>(null);

  const refreshUsers = useCallback(() => {
    setPage(1);
    setRefreshKey(k => k + 1);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*, user_roles:user_roles!user_id(role:role_id(id, name, description, color, priority))', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (filterRole === 'warehouse_staff') {
        query = query.eq('is_warehouse_staff', true);
      } else if (filterRole) {
        query = query.eq('role', filterRole);
      }

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error) {
        console.error('Failed to fetch users:', error.message);
        toast.error('Failed to load users');
      }

      setUsers((data || []) as AdminUser[]);
      setTotal(count || 0);
    } catch (err: any) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, page, refreshKey, filterRole]);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase.from('roles').select('*').order('priority', { ascending: false });
    setRoles((data || []) as Role[]);
  }, [supabase]);

  const fetchWarehouses = useCallback(async () => {
    const { data } = await supabase.from('warehouses').select('id, name, is_active').eq('is_active', true).order('name');
    setWarehouses((data || []) as WarehouseType[]);
  }, [supabase]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const getRoleBadges = (user: AdminUser) => {
    if (user.is_warehouse_staff) {
      const badges = [{ name: 'Warehouse Staff', color: 'bg-blue-50 text-blue-700 border-blue-100' }];
      if (user.user_roles && user.user_roles.length > 0) {
        badges.push(...user.user_roles.map(ur => ({
          name: ur.role?.name || 'Unknown',
          color: ROLE_COLORS[ur.role?.name] || 'bg-slate-50 text-slate-700 border-slate-100',
        })));
      }
      return badges;
    }
    if (!user.user_roles || user.user_roles.length === 0) {
      return [{ name: user.role, color: user.role === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600' }];
    }
    return user.user_roles.map(ur => ({
      name: ur.role?.name || 'Unknown',
      color: ROLE_COLORS[ur.role?.name] || 'bg-slate-50 text-slate-700 border-slate-100',
    }));
  };

  const handleBan = async (user: AdminUser) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id);
    if (error) return toast.error(error.message);
    toast.success(user.is_banned ? 'User unbanned' : 'User banned');
    refreshUsers();
    setShowConfirm(null);
  };

  const handleDelete = async (user: AdminUser) => {
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) return toast.error(error.message);
    toast.success('User deleted');
    refreshUsers();
    setShowConfirm(null);
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id,role_id' });
    if (error) return toast.error(error.message);
    toast.success('Role assigned');
    refreshUsers();
    setShowAssignRole(null);
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
    if (error) return toast.error(error.message);
    toast.success('Role removed');
    refreshUsers();
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6 max-w-7xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">{total} total users</p>
        </div>
        <PermissionGate permission="users.create">
          <button onClick={() => setShowCreateUser(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#1a4731] hover:bg-[#0e2f20] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#1a4731]/20">
            <Plus className="h-4 w-4" /> Add User
          </button>
        </PermissionGate>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
        </div>
        <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}
          className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="customer">Customer</option>
          <option value="warehouse_staff">Warehouse Staff</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <div className="h-8 w-8 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Roles</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#1a4731] flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-white">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">{user.full_name || 'No name'}</div>
                          <div className="text-xs text-slate-500 truncate">{user.email}</div>
                          {user.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
                          {user.is_warehouse_staff && (
                            <div className="flex items-center gap-1 mt-1">
                              <Warehouse className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] text-blue-600 font-bold">Warehouse Staff</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {getRoleBadges(user).map((badge, i) => (
                          <span key={i} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.color}`}>
                            {badge.name.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                          <Ban className="h-3 w-3" /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                          <UserCheck className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <PermissionGate permission="users.edit">
                          <button onClick={() => setShowEditUser(user)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="users.manage_roles">
                          <button onClick={() => setShowAssignRole(user)}
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Manage Roles">
                            <Shield className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="users.suspend">
                          <button onClick={() => setShowConfirm({ action: 'ban', user, label: user.is_banned ? 'unban' : 'ban' })}
                            className={`p-2 rounded-lg transition ${user.is_banned ? 'text-slate-400 hover:text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                            title={user.is_banned ? 'Unban' : 'Ban'}>
                            {user.is_banned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="users.delete">
                          <button onClick={() => setShowConfirm({ action: 'delete', user, label: 'delete' })}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-slate-700">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAssignRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAssignRole(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Manage Roles</h3>
              <button onClick={() => setShowAssignRole(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <div className="text-sm text-slate-500">
              Assigning roles for <strong>{showAssignRole.full_name || showAssignRole.email}</strong>
            </div>
            <div className="space-y-2">
              {roles.map(role => {
                const isAssigned = showAssignRole.user_roles?.some(ur => ur.role?.id === role.id);
                return (
                  <div key={role.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color || '#1a4731' }} />
                      <div>
                        <div className="text-sm font-bold text-slate-900">{role.name.replace(/_/g, ' ')}</div>
                        {role.description && <div className="text-xs text-slate-500">{role.description}</div>}
                      </div>
                    </div>
                    {isAssigned ? (
                      <button onClick={() => handleRemoveRole(showAssignRole.id, role.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition">
                        Remove
                      </button>
                    ) : (
                      <button onClick={() => handleAssignRole(showAssignRole.id, role.id)}
                        className="px-3 py-1.5 bg-[#1a4731] text-white text-xs font-bold rounded-lg hover:bg-[#0e2f20] transition">
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 space-y-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 capitalize">{showConfirm.label} User</h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to {showConfirm.label} <strong>{showConfirm.user.full_name || showConfirm.user.email}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={() => showConfirm.action === 'ban' ? handleBan(showConfirm.user) : handleDelete(showConfirm.user)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition">
                {showConfirm.label === 'delete' ? 'Delete' : showConfirm.user.is_banned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateUser && (
        <CreateUserModal
          roles={roles}
          warehouses={warehouses}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => { setShowCreateUser(false); refreshUsers(); }}
        />
      )}

      {showEditUser && (
        <EditUserModal
          user={showEditUser}
          roles={roles}
          warehouses={warehouses}
          onClose={() => setShowEditUser(null)}
          onUpdated={() => { setShowEditUser(null); refreshUsers(); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CREATE USER MODAL
// ═══════════════════════════════════════════════

function CreateUserModal({ roles, warehouses, onClose, onCreated }: {
  roles: Role[];
  warehouses: WarehouseType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '',
    role: 'customer', roleId: '',
    is_warehouse_staff: false, assigned_warehouse_id: '',
  });

  const handleCreate = async () => {
    if (!form.email || !form.password) return toast.error('Email and password required');
    if (form.is_warehouse_staff && !form.assigned_warehouse_id) return toast.error('Please assign a warehouse for warehouse staff');
    if (form.role === 'admin' && !form.roleId) return toast.error('Admin users must have an RBAC role assigned');
    if (!form.is_warehouse_staff && form.role === 'customer' && !form.roleId) return toast.error('Please assign an RBAC role to this user');

    setSaving(true);
    try {
      await createUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone || undefined,
        role: form.is_warehouse_staff ? 'customer' : form.role,
        roleId: form.roleId || undefined,
        is_warehouse_staff: form.is_warehouse_staff,
        assigned_warehouse_id: form.assigned_warehouse_id || undefined,
      });

      toast.success('User created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Create New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
            <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Account Type</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              RBAC Role {form.role === 'admin' && <span className="text-red-500">*</span>}
            </label>
            <select value={form.roleId} onChange={e => setForm(p => ({ ...p, roleId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
              <option value="">-- Select a role --</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
            </select>
            {form.role === 'admin' && !form.roleId && (
              <p className="text-[10px] text-red-500 mt-1">Required — admin users must have an RBAC role to determine their permissions</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_warehouse_staff}
                onChange={e => setForm(p => ({ ...p, is_warehouse_staff: e.target.checked, assigned_warehouse_id: e.target.checked ? p.assigned_warehouse_id : '' }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]" />
              <div>
                <span className="text-sm font-bold text-slate-700">Warehouse Staff</span>
                <span className="block text-[11px] text-slate-400">Enable warehouse staff access for this user</span>
              </div>
            </label>
          </div>

          {form.is_warehouse_staff && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold">Warehouse Assignment Required</span>
              </div>
              <select value={form.assigned_warehouse_id}
                onChange={e => setForm(p => ({ ...p, assigned_warehouse_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30">
                <option value="">Select a warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {warehouses.length === 0 && (
                <p className="text-xs text-blue-600">No active warehouses found. Create a warehouse first.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1a4731] text-white text-sm font-bold hover:bg-[#0e2f20] disabled:opacity-50 transition flex items-center justify-center gap-2">
            {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// EDIT USER MODAL (uses server action for reliability)
// ═══════════════════════════════════════════════

function EditUserModal({ user, roles, warehouses, onClose, onUpdated }: {
  user: AdminUser;
  roles: Role[];
  warehouses: WarehouseType[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    role: user.role || 'customer',
    is_warehouse_staff: user.is_warehouse_staff || false,
    assigned_warehouse_id: user.assigned_warehouse_id || '',
  });

  const handleSave = async () => {
    if (form.is_warehouse_staff && !form.assigned_warehouse_id) return toast.error('Please assign a warehouse for warehouse staff');

    setSaving(true);
    try {
      const result = await updateUserProfile(user.id, {
        full_name: form.full_name,
        phone: form.phone,
        role: form.is_warehouse_staff ? 'customer' : form.role,
        is_warehouse_staff: form.is_warehouse_staff,
        assigned_warehouse_id: form.assigned_warehouse_id || null,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('User updated');
        onUpdated();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Edit User</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
            <input type="email" value={user.email || ''} disabled
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500" />
            <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
            <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Account Type</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_warehouse_staff}
                onChange={e => setForm(p => ({ ...p, is_warehouse_staff: e.target.checked, assigned_warehouse_id: e.target.checked ? p.assigned_warehouse_id : '' }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]" />
              <div>
                <span className="text-sm font-bold text-slate-700">Warehouse Staff</span>
                <span className="block text-[11px] text-slate-400">Enable warehouse staff access</span>
              </div>
            </label>
          </div>

          {form.is_warehouse_staff && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold">Assigned Warehouse</span>
              </div>
              <select value={form.assigned_warehouse_id}
                onChange={e => setForm(p => ({ ...p, assigned_warehouse_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30">
                <option value="">Select a warehouse...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1a4731] text-white text-sm font-bold hover:bg-[#0e2f20] disabled:opacity-50 transition flex items-center justify-center gap-2">
            {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
