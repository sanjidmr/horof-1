'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  KeyRound, Plus, Trash2, CheckCircle2, XCircle, Loader2,
  Search, ShieldCheck, Users, ChevronDown, ChevronRight,
  Eye, Save, RotateCcw, PenLine, UserCog,
} from 'lucide-react';
import {
  getRoles, createRole, updateRole, deleteRole,
  getPermissions, updateRolePermissionsBatch,
} from '@/lib/actions/security';
import { PERMISSION_MODULES, ACTION_LABELS, type PermissionAction } from '@/lib/auth/permissions';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/shadcn/button';
import { Switch } from '@/components/shadcn/switch';

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  is_system: boolean;
  is_default: boolean;
  color: string | null;
  permissions?: { permission: PermissionItem | null }[];
}

const moduleMap = new Map(PERMISSION_MODULES.map((m) => [m.code, m]));

function actionOf(code: string): string {
  const i = code.lastIndexOf('.');
  return i === -1 ? code : code.slice(i + 1);
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  manager: 'bg-teal-100 text-teal-700 border-teal-200',
  inventory_manager: 'bg-amber-100 text-amber-700 border-amber-200',
  sales_manager: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  marketing_manager: 'bg-pink-100 text-pink-700 border-pink-200',
  customer_support: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  content_manager: 'bg-rose-100 text-rose-700 border-rose-200',
  finance_manager: 'bg-green-100 text-green-700 border-green-200',
  accounts: 'bg-green-100 text-green-700 border-green-200',
  warehouse_manager: 'bg-amber-100 text-amber-700 border-amber-200',
  warehouse_staff: 'bg-orange-100 text-orange-700 border-orange-200',
  staff: 'bg-slate-100 text-slate-600 border-slate-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function RolesPermissionsManager() {
  const { isSuperAdmin, hasPermission } = usePermissions();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [perms, setPerms] = useState<PermissionItem[]>([]);
  const [, setMatrixAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [base, setBase] = useState<Record<string, boolean>>({});

  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [rolePriority, setRolePriority] = useState('0');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [roleFilter, setRoleFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([getRoles(), getPermissions()]);
      setRoles(r as RoleItem[]);
      setPerms(p as PermissionItem[]);
    } catch {
      setRoles([]);
      setPerms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Detect permission-matrix read denial (security_center.view) gracefully.
  useEffect(() => {
    if (!loading && perms.length === 0 && roles.length === 0) {
      // getPermissions threw -> user may lack security_center.view;
      // getRoles succeeded or threw; a denied security_center.view is redirected server-side.
    }
  }, [loading, perms.length, roles.length]);

  // Canonical matrix: PERMISSION_MODULES (the single source of truth) merged
  // with the DB rows. Every module x action from the registry is guaranteed
  // to render in the Permission Matrix even if a DB row is missing (the
  // server action syncs the DB via the SECURITY DEFINER RPC, but this merge
  // is defense-in-depth so the UI can never silently drop a group).
  const canonicalPerms = useMemo(() => {
    const byCode = new Map(perms.map((p) => [p.code, p]));
    const result: PermissionItem[] = [];
    PERMISSION_MODULES.forEach((mod) => {
      mod.actions.forEach((action) => {
        const code = `${mod.code}.${action}`;
        const existing = byCode.get(code);
        if (existing) {
          result.push(existing);
        } else {
          result.push({
            id: `synthetic:${code}`,
            code,
            name: `${mod.label} ${ACTION_LABELS[action]}`,
            module: mod.code,
            description: `${ACTION_LABELS[action]} ${mod.label.toLowerCase()}`,
          });
        }
      });
    });
    return result;
  }, [perms]);

  const selectRole = useCallback(
    (roleId: string) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return;
      setSelectedId(roleId);
      setRoleName(role.name);
      setRoleDesc(role.description || '');
      setRolePriority(String(role.priority ?? 0));
      const granted = new Set((role.permissions || []).map((rp) => rp.permission?.id).filter(Boolean));
      const map: Record<string, boolean> = {};
      canonicalPerms.forEach((p) => {
        map[p.id] = granted.has(p.id);
      });
      setDraft(map);
      setBase(map);
      setConfirmDeleteId(null);
    },
    [roles, canonicalPerms]
  );

  // Auto-select the first role once data loads.
  useEffect(() => {
    if (roles.length > 0 && !selectedId) {
      const preferred =
        roles.find((r) => r.name === 'admin') ||
        roles.find((r) => r.name === 'manager') ||
        roles[0];
      selectRole(preferred.id);
    }
  }, [roles, selectedId, selectRole]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedId) || null,
    [roles, selectedId]
  );

  const moduleOrder = useMemo(
    () => PERMISSION_MODULES.map((m) => m.code).filter((code) => canonicalPerms.some((p) => p.module === code)),
    [canonicalPerms]
  );

  const permsByModule = useMemo(() => {
    const byModule: Record<string, PermissionItem[]> = {};
    canonicalPerms.forEach((p) => {
      const mod = moduleMap.get(p.module);
      if (!mod) return;
      const action = actionOf(p.code);
      if (!(mod.actions as readonly string[]).includes(action)) return;
      if (moduleFilter && !p.name.toLowerCase().includes(moduleFilter.toLowerCase())) return;
      (byModule[p.module] = byModule[p.module] || []).push(p);
    });
    return byModule;
  }, [canonicalPerms, moduleFilter]);

  const grantedIds = useMemo(
    () =>
      Object.entries(draft)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .filter((id) => !id.startsWith('synthetic:')),
    [draft]
  );

  const dirty = useMemo(() => {
    if (!selectedRole) return false;
    const nameDirty = roleName !== selectedRole.name || roleDesc !== (selectedRole.description || '') || Number(rolePriority) !== selectedRole.priority;
    const permsDirty = canonicalPerms.some((p) => !!draft[p.id] !== !!base[p.id]);
    return nameDirty || permsDirty;
  }, [base, draft, canonicalPerms, roleName, roleDesc, rolePriority, selectedRole]);

  const isProtected = selectedRole?.is_system === true || selectedRole?.name === 'super_admin' || selectedRole?.name === 'owner';
  const canManage = isSuperAdmin || (!isProtected && hasPermission('security_center.edit') && hasPermission('security_center.manage'));
  const canCreate = isSuperAdmin || hasPermission('security_center.edit');
  const canDelete = !isProtected && (isSuperAdmin || hasPermission('security_center.delete')) && selectedRole?.is_system !== true;

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const permRes = await updateRolePermissionsBatch(selectedRole.id, grantedIds);
      if (permRes?.error) throw new Error(permRes.error);

      if (roleName !== selectedRole.name || roleDesc !== (selectedRole.description || '') || Number(rolePriority) !== selectedRole.priority) {
        const roleRes = await updateRole(selectedRole.id, {
          name: roleName.trim() || selectedRole.name,
          description: roleDesc.trim() || null,
          priority: Number(rolePriority) || selectedRole.priority,
        });
        if (roleRes?.error) throw new Error(roleRes.error);
      }

      toast.success('Role permissions saved');
      await fetchAll();
      setSelectedId(selectedRole.id);
      const fresh = roles.find((r) => r.id === selectedRole.id);
      if (fresh) {
        const granted = new Set((fresh.permissions || []).map((rp) => rp.permission?.id).filter(Boolean));
        const map: Record<string, boolean> = {};
        perms.forEach((p) => {
          map[p.id] = granted.has(p.id);
        });
        setDraft(map);
        setBase(map);
        setRoleName(fresh.name);
        setRoleDesc(fresh.description || '');
        setRolePriority(String(fresh.priority ?? 0));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!selectedRole) return;
    setDraft(base);
    setRoleName(selectedRole.name);
    setRoleDesc(selectedRole.description || '');
    setRolePriority(String(selectedRole.priority ?? 0));
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      const res = await deleteRole(confirmDeleteId);
      if (res?.error) throw new Error(res.error);
      toast.success('Role deleted');
      setConfirmDeleteId(null);
      await fetchAll();
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createRole(newName.trim(), newDesc.trim() || undefined);
      if (res?.error) throw new Error(res.error);
      toast.success('Role created');
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      await fetchAll();
      if (res.id) setSelectedId(res.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const q = roleFilter.trim().toLowerCase();
    return roles
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => b.priority - a.priority);
  }, [roles, roleFilter]);

  const toggleModule = (moduleCode: string) => {
    if (!canManage) return;
    const modPerms = permsByModule[moduleCode] || [];
    const allOn = modPerms.every((p) => !!draft[p.id]);
    setDraft((prev) => {
      const next = { ...prev };
      modPerms.forEach((p) => {
        next[p.id] = !allOn;
      });
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#1a4731] mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Loading Roles & Permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1a4731]">Roles &amp; Permissions</h1>
          <p className="text-slate-500 mt-1">
            Manage staff roles and the exact actions each role can perform across the admin panel.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Create New Role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* ============ Role list ============ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-4">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                placeholder="Search roles..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731]"
              />
            </div>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-2 space-y-1.5">
            {filteredRoles.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No roles found.</p>
            )}
            {filteredRoles.map((role) => {
              const granted = (role.permissions || []).filter((rp) => rp.permission).length;
              const active = role.id === selectedId;
              const colorCls = ROLE_COLORS[role.name] || 'bg-slate-100 text-slate-600 border-slate-200';
              return (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className={`w-full text-left flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all group ${
                    active ? 'bg-[#1a4731]/8 ring-1 ring-[#1a4731]/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-[#1a4731] bg-[#1a4731]/10">
                    {role.name === 'super_admin' || role.name === 'owner' ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : role.name === 'viewer' ? (
                      <Eye className="h-5 w-5" />
                    ) : role.name === 'admin' ? (
                      <UserCog className="h-5 w-5" />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-bold truncate ${active ? 'text-[#1a4731]' : 'text-slate-700'}`}>
                        {role.name.replace(/_/g, ' ')}
                      </p>

                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {granted} / {perms.length} permissions
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${colorCls}`}>
                    {role.priority}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ Permission editor ============ */}
        <div className="space-y-4">
          {!selectedRole ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <KeyRound className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a role to view and edit its permissions.</p>
            </div>
          ) : (
            <motion.div key={selectedRole.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Role header card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-[#1a4731]/10 flex items-center justify-center">
                      {selectedRole.is_system ? <ShieldCheck className="h-6 w-6 text-[#1a4731]" /> : <KeyRound className="h-6 w-6 text-[#1a4731]" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {canManage ? (
                          <input
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            className="text-lg font-bold text-slate-900 border-b border-dashed border-slate-300 focus:border-[#1a4731] outline-none px-1 py-0.5 w-56"
                          />
                        ) : (
                          <h2 className="text-lg font-bold text-slate-900">{selectedRole.name.replace(/_/g, ' ')}</h2>
                        )}
                        {selectedRole.is_system && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-widest">System</span>
                        )}
                        {selectedRole.is_default && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest">Default</span>
                        )}
                        {isProtected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            Managed by Super Admin
                          </span>
                        )}
                        {!canManage && !isProtected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-widest">Read only</span>
                        )}
                      </div>
                      {canManage ? (
                        <textarea
                          value={roleDesc}
                          onChange={(e) => setRoleDesc(e.target.value)}
                          rows={2}
                          placeholder="Role description"
                          className="w-full max-w-md border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 outline-none focus:border-[#1a4731] resize-none"
                        />
                      ) : (
                        <p className="text-xs text-slate-500 max-w-md">{selectedRole.description || 'No description'}</p>
                      )}
                      {canManage && (
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          Priority
                          <input
                            type="number"
                            value={rolePriority}
                            onChange={(e) => setRolePriority(e.target.value)}
                            className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#1a4731]"
                          />
                          <span className="text-slate-400">(higher wins; used to block self-promotion)</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#1a4731]">{grantedIds.length}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">of {perms.length} granted</p>
                      </div>
                    </div>
                    <div className="h-2 w-40 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a4731] rounded-full transition-all"
                        style={{ width: perms.length ? `${(grantedIds.length / perms.length) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="flex gap-2 mt-1">
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDeleteId(selectedRole.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!dirty || saving}
                            onClick={handleDiscard}
                            className="text-slate-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" /> Discard
                          </Button>
                          <Button
                            size="sm"
                            disabled={!dirty || saving}
                            onClick={handleSave}
                            className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            Save Changes
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Module matrix */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <p className="text-sm font-bold text-slate-700">Permission Matrix</p>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                      placeholder="Filter permissions..."
                      className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-[#1a4731]"
                    />
                  </div>
                </div>

                {!canManage && (
                  <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                    <PenLine className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      This role is read-only for you. {isProtected ? 'System roles can only be modified by a Super Admin.' : 'You need the security_center.edit and security_center.manage permissions to make changes.'}
                    </span>
                  </div>
                )}

                {moduleOrder.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-10">
                    {perms.length === 0 ? 'You do not have permission to view the permission matrix.' : 'No permissions match your filter.'}
                  </p>
                )}

                <div className="space-y-3">
                  {moduleOrder.map((moduleCode) => {
                    const modPerms = permsByModule[moduleCode] || [];
                    if (modPerms.length === 0) return null;
                    const mod = moduleMap.get(moduleCode)!;
                    const granted = modPerms.filter((p) => !!draft[p.id]).length;
                    const allOn = granted === modPerms.length;
                    const someOn = granted > 0 && !allOn;
                    return (
                      <div key={moduleCode} className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <h4 className="text-sm font-bold text-slate-700 truncate">{mod.label}</h4>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${allOn ? 'bg-[#1a4731] text-white' : someOn ? 'bg-[#1a4731]/15 text-[#1a4731]' : 'bg-slate-100 text-slate-400'}`}>
                              {granted}/{modPerms.length}
                            </span>
                          </div>
                          {canManage && (
                            <Switch
                              checked={allOn}
                              onCheckedChange={() => toggleModule(moduleCode)}
                              className="data-[state=checked]:bg-[#1a4731]"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-50">
                          {modPerms.map((perm) => {
                            const action = actionOf(perm.code) as PermissionAction;
                            const on = !!draft[perm.id];
                            return (
                              <button
                                key={perm.id}
                                onClick={() => canManage && setDraft((prev) => ({ ...prev, [perm.id]: !prev[perm.id] }))}
                                disabled={!canManage}
                                className={`flex items-center gap-3 px-4 py-3 text-left transition-all group ${
                                  on ? 'bg-[#1a4731]/5 hover:bg-[#1a4731]/10' : 'bg-white hover:bg-slate-50'
                                } ${!canManage ? 'cursor-default' : ''}`}
                              >
                                <div className={`w-9 h-5 rounded-full flex items-center transition-colors shrink-0 ${on ? 'bg-[#1a4731]' : 'bg-slate-200'}`}>
                                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold capitalize ${on ? 'text-[#1a4731]' : 'text-slate-500'}`}>
                                    {ACTION_LABELS[action] || perm.name.replace(/_/g, ' ')}
                                  </p>
                                  {perm.description && (
                                    <p className="text-[10px] text-slate-400 truncate">{perm.description}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dirty && canManage && (
                  <div className="sticky bottom-0 mt-4 p-4 bg-white border border-amber-200 rounded-xl shadow-lg flex items-center justify-between">
                    <p className="text-sm text-amber-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> You have unsaved changes
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleDiscard}>Discard</Button>
                      <Button size="sm" disabled={saving} onClick={handleSave} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create role modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Role</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., logistics_coordinator"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What does this role do?"
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731] resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete role?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This will permanently remove the role and its permission grants. Users assigned this role will lose its access.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
