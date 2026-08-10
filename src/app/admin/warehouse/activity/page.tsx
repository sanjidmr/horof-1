'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity as ActivityIcon, Search, RefreshCw, Loader2, Filter,
  CheckCircle, XCircle, AlertTriangle, Clock, User, Warehouse as WarehouseIcon,
  Box, ShoppingBag, ArrowRight, PackageCheck, ShieldAlert,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  getAllAssignments,
  getWarehouseAssignments,
  adminReviewAssignment,
  adminEditAssignmentStatus,
  cancelAssignment,
  getWarehouseActivity,
} from '@/lib/actions/warehouse';
import { useWarehouseRealtime } from '@/hooks/useWarehouseRealtime';
import { isInternalAdminRole } from '@/lib/auth/roles';

type Assignment = {
  id: string;
  entity_type: 'order';
  entity_id: string;
  warehouse_id: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  priority: string;
  status: string;
  admin_approval: string;
  admin_approval_notes: string | null;
  processing_status: string;
  packing_status: string;
  shipping_ready: boolean;
  notes: string | null;
  assigned_notes: string | null;
  assigned_at: string;
  accepted_at: string | null;
  packed_at: string | null;
  ready_for_dispatch_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  warehouses?: { name: string; location: string | null } | null;
  assigned_by_profile?: { full_name: string | null; email: string | null } | null;
  admins?: { full_name: string | null; email: string | null } | null;
};

type ActivityLog = {
  id: string;
  entity_type: 'order';
  entity_id: string;
  warehouse_id: string | null;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string;
  old_value: any;
  new_value: any;
  notes: string | null;
  created_at: string;
  warehouses?: { name: string } | null;
  actor?: { full_name: string | null; email: string | null } | null;
};

function entityRef(id: unknown, len = 8): string {
  if (typeof id !== 'string' || !id) return '';
  return id.slice(0, len);
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  assigned: { label: 'Assigned', color: 'text-amber-700', bg: 'bg-amber-100' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
  processing: { label: 'Processing', color: 'text-blue-700', bg: 'bg-blue-100' },
  packed: { label: 'Packed', color: 'text-teal-700', bg: 'bg-teal-100' },
  ready_for_dispatch: { label: 'Ready for Dispatch', color: 'text-purple-700', bg: 'bg-purple-100' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100' },
};

const APPROVAL_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
  override: { label: 'Overridden', color: 'text-blue-700', bg: 'bg-blue-100' },
};

function Badge({ value, meta }: { value: string; meta: Record<string, { label: string; color: string; bg: string }> }) {
  const m = meta[value] || { label: value, color: 'text-slate-600', bg: 'bg-slate-100' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', m.bg, m.color)}>
      {m.label}
    </span>
  );
}

export default function WarehouseActivityPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filtered, setFiltered] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('completed');
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('assigned_warehouse_id, role')
        .eq('id', user.id)
        .single();
      setWarehouseId(profile?.assigned_warehouse_id || null);
      const isAdminUser = isInternalAdminRole(profile?.role);

      if (isAdminUser) {
        const [assigns, acts] = await Promise.all([
          getAllAssignments(),
          getWarehouseActivity({ limit: 100 }),
        ]);
        setAssignments(assigns as unknown as Assignment[]);
        setActivities(acts as unknown as ActivityLog[]);
      } else if (profile?.assigned_warehouse_id) {
        const [assigns, acts] = await Promise.all([
          getWarehouseAssignments(profile.assigned_warehouse_id, 'order').catch(() => []),
          getWarehouseActivity({ warehouseId: profile.assigned_warehouse_id, limit: 100 }),
        ]);
        setAssignments(assigns as unknown as Assignment[]);
        setActivities(acts as unknown as ActivityLog[]);
      }
    } catch (err: any) {
      console.error('Failed to load:', err);
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/admin/warehouse/activity');
    }
    fetchData();
  }, [user, authLoading, router, fetchData, refreshKey]);

  useWarehouseRealtime(supabase, warehouseId || '', () => setRefreshKey(k => k + 1));

  useEffect(() => {
    let list = [...assignments];
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (entityFilter !== 'all') list = list.filter((a) => a.entity_type === entityFilter);
    if (approvalFilter !== 'all') list = list.filter((a) => a.admin_approval === approvalFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.entity_id !== null && a.entity_id !== undefined && String(a.entity_id).toLowerCase().includes(q) ||
          (a.assigned_by_name || '').toLowerCase().includes(q) ||
          (a.warehouses?.name || '').toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [assignments, search, statusFilter, entityFilter, approvalFilter]);

  const handleReview = async (assignment: Assignment, action: 'approve' | 'reject' | 'override') => {
    setActionLoading(assignment.id + '_' + action);
    try {
      await adminReviewAssignment(assignment.id, action, reviewNote || null, action === 'override' ? overrideStatus as any : null);
      toast.success(`Assignment ${action}d successfully`);
      setSelected(null);
      setReviewNote('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditStatus = async (assignment: Assignment, status: string) => {
    setActionLoading(assignment.id + '_edit');
    try {
      await adminEditAssignmentStatus(assignment.id, status as any, reviewNote || null);
      toast.success('Status updated');
      setSelected(null);
      setReviewNote('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (assignment: Assignment) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    setActionLoading(assignment.id + '_cancel');
    try {
      await cancelAssignment(assignment.id, reason);
      toast.success('Assignment cancelled');
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const needsApproval = assignments.filter((a) =>
    a.admin_approval === 'pending' && ['packed', 'ready_for_dispatch', 'completed'].includes(a.status)
  ).length;

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4731]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[#1a4731] flex items-center justify-center shrink-0">
              <ActivityIcon className="h-5 w-5 text-white" />
            </span>
            Warehouse Oversight
          </h1>
          <p className="text-slate-500 mt-1 ml-12">Review, approve, and track every warehouse assignment.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
            <ShieldAlert className="h-3.5 w-3.5" />
            {needsApproval} Awaiting Approval
          </span>
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Assignments', value: assignments.length, icon: Box, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Orders', value: assignments.filter(a => a.entity_type === 'order').length, icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Wait Approval', value: needsApproval, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Completed', value: assignments.filter(a => a.status === 'completed').length, icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-100' },
        ].map((s: any) => (
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
              <s.icon className={cn('h-5 w-5', s.color)} />
            </div>
            <div>
              <p className="text-xl font-display font-extrabold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search by ID, warehouse, or admin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 text-sm outline-none cursor-pointer font-medium">
                <option value="all">All Types</option>
                <option value="order">Orders</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 text-sm outline-none cursor-pointer font-medium">
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)}
                className="h-10 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 text-sm outline-none cursor-pointer font-medium">
                <option value="all">All Approvals</option>
                {Object.entries(APPROVAL_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Entity ID</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Approval</th>
                <th className="px-6 py-4">Assigned By</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#2D6A4F] mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-20 text-center">
                  <ActivityIcon className="h-7 w-7 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">No assignments found</p>
                </td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => { setSelected(a); setReviewNote(a.admin_approval_notes || ''); }}>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                        <ShoppingBag className="h-3 w-3" />
                        Order
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{entityRef(a.entity_id)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <WarehouseIcon className="h-3.5 w-3.5 text-slate-400" />
                        {a.warehouses?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                        a.priority === 'urgent' ? 'bg-red-100 text-red-600' : a.priority === 'high' ? 'bg-orange-100 text-orange-700' : a.priority === 'low' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700')}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4"><Badge value={a.status} meta={STATUS_META} /></td>
                    <td className="px-6 py-4"><Badge value={a.admin_approval} meta={APPROVAL_META} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{a.assigned_by_name || 'Admin'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(a.assigned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(a); setReviewNote(a.admin_approval_notes || ''); }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">
                        Review <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-[#1a4731]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-300 text-xs font-mono">{selected.entity_type}</span>
                  <Badge value={selected.status} meta={STATUS_META} />
                  <Badge value={selected.admin_approval} meta={APPROVAL_META} />
                </div>
                <h2 className="text-lg font-bold text-white">Entity #{entityRef(selected.entity_id, 12)}</h2>
                <p className="text-xs text-emerald-200 mt-1">
                  Assigned to {selected.warehouses?.name || 'Unknown'} by {selected.assigned_by_name || 'Admin'} on {new Date(selected.assigned_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Status Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Processing', value: selected.processing_status },
                  { label: 'Packing', value: selected.packing_status },
                  { label: 'Shipping Ready', value: selected.shipping_ready ? 'Yes' : 'No' },
                  { label: 'Priority', value: selected.priority },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-sm font-bold text-slate-700 capitalize mt-1">{s.value.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>

              {selected.assigned_notes && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Assignment Notes</p>
                  <p className="text-sm text-slate-700">{selected.assigned_notes}</p>
                </div>
              )}

              {selected.notes && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Warehouse Notes</p>
                  <p className="text-sm text-slate-700">{selected.notes}</p>
                </div>
              )}

              {selected.cancel_reason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Cancel Reason</p>
                  <p className="text-sm text-slate-700">{selected.cancel_reason}</p>
                </div>
              )}

              {/* Review Note */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Review Note</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="Add note for approve/reject/override..."
                  className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2D6A4F]"
                />
              </div>

              {/* Override Status */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Override Status</label>
                <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}
                  className="mt-1 w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm outline-none cursor-pointer">
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Approval actions (admin) */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button disabled={!!actionLoading} onClick={() => handleReview(selected, 'approve')}
                    className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
                    {actionLoading === selected.id + '_approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Approve
                  </button>
                  <button disabled={!!actionLoading} onClick={() => handleReview(selected, 'reject')}
                    className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold">
                    {actionLoading === selected.id + '_reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject
                  </button>
                  <button disabled={!!actionLoading} onClick={() => handleReview(selected, 'override')}
                    className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                    {actionLoading === selected.id + '_override' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    Override
                  </button>
                </div>
              )}

              {/* Status edit + cancel (admin) */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <button disabled={!!actionLoading} onClick={() => handleEditStatus(selected, overrideStatus)}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">
                    {actionLoading === selected.id + '_edit' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                    Set Status
                  </button>
                  <button disabled={!!actionLoading} onClick={() => handleCancel(selected)}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold">
                    {actionLoading === selected.id + '_cancel' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Cancel Assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Stream */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ActivityIcon className="h-5 w-5 text-[#1a4731]" />
          Recent Activity
        </h2>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
          ) : (
            activities.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                  log.actor_role === 'admin' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}>
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{log.actor_name || 'System'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{log.actor_role}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{log.warehouses?.name || ''}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-mono font-bold text-slate-600">{log.action.replace(/_/g, ' ')}</span>
                    {' · '}{log.entity_type} #{entityRef(log.entity_id)}
                    {log.notes && <span className="text-slate-400"> · {log.notes}</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}