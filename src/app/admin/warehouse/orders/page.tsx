'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Warehouse, Search, Eye, CheckCircle, XCircle, Clock, RefreshCw,
  Package, Loader2, AlertTriangle, Truck, StickyNote,
  Boxes, ClipboardCheck, Ban, Inbox, Settings, FileUp,
  FileText, Trash2, Flag, CheckCheck, Hourglass, PackageCheck,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatPrice, cn } from '@/lib/utils';
import {
  warehouseAcceptAssignment,
  warehouseRejectAssignment,
  warehouseStartProcessing,
  warehouseMarkPacked,
  warehouseMarkReadyForDispatch,
  warehouseMarkCompleted,
  warehouseUpdateNotes,
  uploadPackingFile,
  deletePackingFile,
  getWarehouseAssignments,
  getPackingFiles,
} from '@/lib/actions/warehouse';
import { useWarehouseRealtime, useWarehouseOrdersRealtime } from '@/hooks/useWarehouseRealtime';

type WarehouseOrder = {
  id: string;
  entity_type: string;
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
  warehouses?: { name: string; location: string | null } | null;
  assigned_by_profile?: { full_name: string | null; email: string | null } | null;
  order?: {
    id: string;
    order_number: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    customer_address: string | null;
    status: string;
    warehouse_status: string | null;
    amount: number;
    total: number;
    product_details: any;
    created_at: string;
    updated_at: string;
    packing_status: string | null;
    shipping_ready: boolean;
    assignment_priority: string | null;
  } | null;
};

type PackingFile = {
  id: string;
  assignment_id: string;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  note: string | null;
  uploaded_by_name: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  assigned: { label: 'Assigned', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  processing: { label: 'Processing', color: 'text-blue-700', bg: 'bg-blue-100', icon: Package },
  packed: { label: 'Packed', color: 'text-teal-700', bg: 'bg-teal-100', icon: PackageCheck },
  ready_for_dispatch: { label: 'Ready for Dispatch', color: 'text-purple-700', bg: 'bg-purple-100', icon: Truck },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCheck },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', icon: XCircle },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
  normal: { label: 'Normal', color: 'text-blue-700', bg: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock };
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border', meta.bg, meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || { label: priority, color: 'text-slate-600', bg: 'bg-slate-100' };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider', meta.bg, meta.color)}>
      <Flag className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

export default function WarehouseOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [filtered, setFiltered] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WarehouseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [editNotes, setEditNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [packingFiles, setPackingFiles] = useState<PackingFile[]>([]);
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_warehouse_id, role')
      .eq('id', user.id)
      .single();

    const whId = profile?.assigned_warehouse_id;
    const admin = profile?.role === 'admin';
    setWarehouseId(whId);
    setIsAdmin(admin);

    if (!whId && !admin) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const assignments = await getWarehouseAssignments(whId || '', 'order');
      setOrders(assignments as unknown as WarehouseOrder[]);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      if (admin && !whId) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        setOrders((data || []).map((o: any) => ({
          id: o.id,
          entity_type: 'order',
          entity_id: o.id,
          warehouse_id: o.warehouse_id,
          priority: o.assignment_priority || 'normal',
          status: o.warehouse_status === 'ready_for_dispatch' ? 'ready_for_dispatch' : o.warehouse_status || 'assigned',
          admin_approval: 'pending',
          processing_status: o.packing_status === 'in_progress' ? 'in_progress' : 'not_started',
          packing_status: o.packing_status || 'not_started',
          shipping_ready: o.shipping_ready || false,
          notes: o.warehouse_notes || null,
          assigned_notes: null,
          assigned_at: o.created_at,
          order: o,
        })) as unknown as WarehouseOrder[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/admin/warehouse/orders');
    }
    fetchOrders();
  }, [user, authLoading, router, fetchOrders]);

  useWarehouseRealtime(supabase, warehouseId, fetchOrders);
  useWarehouseOrdersRealtime(supabase, warehouseId, fetchOrders);

  useEffect(() => {
    let list = [...orders];
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((o) => o.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.order?.order_number || '').toLowerCase().includes(q) ||
          (o.order?.customer_name || '').toLowerCase().includes(q) ||
          (o.order?.customer_phone || '').toLowerCase().includes(q) ||
          (o.assigned_by_name || '').toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [orders, search, statusFilter, priorityFilter]);

  const openDetail = async (order: WarehouseOrder) => {
    setSelected(order);
    setEditNotes(order.notes || '');
    setRejectReason('');
    setUploadNote('');
    try {
      const files = await getPackingFiles(order.id);
      setPackingFiles(files as unknown as PackingFile[]);
    } catch (err) {
      console.error('Failed to load packing files:', err);
      setPackingFiles([]);
    }
  };

  const handleAction = async (order: WarehouseOrder, action: string) => {
    setActionLoading(order.id + '_' + action);
    try {
      switch (action) {
        case 'accept':
          await warehouseAcceptAssignment(order.id);
          toast.success('Order accepted!');
          break;
        case 'reject':
          if (!rejectReason.trim()) {
            toast.error('Please provide a rejection reason');
            setActionLoading(null);
            return;
          }
          await warehouseRejectAssignment(order.id, rejectReason);
          toast.success('Order rejected.');
          setRejectReason('');
          break;
        case 'processing':
          await warehouseStartProcessing(order.id);
          toast.success('Processing started.');
          break;
        case 'packed':
          await warehouseMarkPacked(order.id);
          toast.success('Marked as packed.');
          break;
        case 'ready':
          await warehouseMarkReadyForDispatch(order.id, editNotes || null);
          toast.success('Marked ready for dispatch!');
          break;
        case 'completed':
          await warehouseMarkCompleted(order.id, editNotes || null);
          toast.success('Marked as completed!');
          break;
        case 'saveNotes':
          await warehouseUpdateNotes(order.id, editNotes);
          toast.success('Notes saved.');
          break;
      }
      setSelected(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `warehouse-packing/${selected.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadErr } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);
        if (uploadErr) throw new Error(uploadErr.message);

        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        await uploadPackingFile({
          assignmentId: selected.id,
          fileUrl: urlData?.publicUrl || filePath,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          note: uploadNote || null,
        });
      }

      toast.success('Files uploaded successfully!');
      setUploadNote('');
      const packingFilesData = await getPackingFiles(selected.id);
      setPackingFiles(packingFilesData as unknown as PackingFile[]);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await deletePackingFile(fileId);
      toast.success('File deleted.');
      setPackingFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const stats = {
    total: orders.length,
    awaiting: orders.filter((o) => o.status === 'assigned').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    packed: orders.filter((o) => o.status === 'packed').length,
    ready: orders.filter((o) => o.status === 'ready_for_dispatch').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    urgent: orders.filter((o) => o.priority === 'urgent' && !['cancelled', 'completed'].includes(o.status)).length,
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4731]" />
      </div>
    );
  }

  if (!warehouseId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Warehouse className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">No Warehouse Assigned</h2>
          <p className="text-sm text-slate-500 mt-1">Contact an admin to assign you to a warehouse.</p>
        </div>
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
              <Warehouse className="h-5 w-5 text-white" />
            </span>
            Warehouse Orders
          </h1>
          <p className="text-slate-500 mt-1 ml-12">Manage assigned orders — accept, process, pack, and dispatch.</p>
        </div>
        <button onClick={fetchOrders} disabled={loading}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all disabled:opacity-50">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
        <Link href="/admin/inventory/warehouses">
          <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all">
            <Settings className="h-4 w-4" />
            Manage Warehouses
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-100', icon: Boxes },
          { label: 'Awaiting', value: stats.awaiting, color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
          { label: 'Processing', value: stats.processing, color: 'text-blue-600', bg: 'bg-blue-100', icon: Package },
          { label: 'Packed', value: stats.packed, color: 'text-teal-600', bg: 'bg-teal-100', icon: PackageCheck },
          { label: 'Ready', value: stats.ready, color: 'text-purple-600', bg: 'bg-purple-100', icon: Truck },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCheck },
          { label: 'Urgent', value: stats.urgent, color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle },
        ].map((s: any) => (
          <div key={s.label} className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
              <s.icon className={cn('h-4 w-4', s.color)} />
            </div>
            <div>
              <p className="text-lg font-display font-extrabold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 text-sm outline-none focus:border-[#2D6A4F] cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>{(meta as any).label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 text-sm outline-none focus:border-[#2D6A4F] cursor-pointer font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned By</th>
                <th className="px-6 py-4">Assigned Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#2D6A4F] mx-auto" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-20 text-center">
                  <Inbox className="h-7 w-7 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">No orders assigned to your warehouse</p>
                </td></tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => openDetail(order)}>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        #{order.order?.order_number?.split('-').pop() || order.order?.id?.split('-')[0]?.toUpperCase() || order.entity_id.split('-')[0].toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{order.order?.customer_name || '—'}</p>
                      <p className="text-xs text-slate-400">{order.order?.customer_phone || ''}</p>
                    </td>
                    <td className="px-6 py-4"><PriorityBadge priority={order.priority} /></td>
                    <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{order.assigned_by_name || order.assigned_by_profile?.full_name || 'Admin'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(order.assigned_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(order)}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-slate-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-gradient-to-br from-[#1a4731] to-[#2D6A4F]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-emerald-300 text-xs font-mono font-bold">
                    #{selected.order?.order_number?.split('-').pop() || selected.order?.id?.split('-')[0]?.toUpperCase() || selected.entity_id.split('-')[0].toUpperCase()}
                  </span>
                  <StatusBadge status={selected.status} />
                  <PriorityBadge priority={selected.priority} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">{selected.order?.customer_name || 'Customer'}</h2>
                <div className="flex items-center gap-4 mt-2 text-emerald-200 text-xs">
                  <span>Assigned: {new Date(selected.assigned_at).toLocaleString()}</span>
                  {selected.assigned_by_name && <span>By: {selected.assigned_by_name}</span>}
                  {selected.order?.customer_phone && <span>Phone: {selected.order.customer_phone}</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Approval Status */}
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <ClipboardCheck className="h-5 w-5 text-slate-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">
                    Admin Approval: <span className={cn('capitalize', selected.admin_approval === 'approved' ? 'text-emerald-600' : selected.admin_approval === 'rejected' ? 'text-red-600' : 'text-amber-600')}>{selected.admin_approval}</span>
                  </p>
                  {selected.admin_approval_notes && (
                    <p className="text-xs text-slate-500 mt-1">{selected.admin_approval_notes}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" /> Order Items
                </h3>
                <div className="space-y-2">
                  {(Array.isArray(selected.order?.product_details) ? selected.order.product_details : selected.order?.product_details ? [selected.order.product_details] : []).map((item: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">{item.product_name || item.name || 'Product'}</p>
                        <p className="text-xs font-bold text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatPrice(Number(item.unit_price || item.price || 0))} each</p>
                      {item.specifications && Object.keys(item.specifications).length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {Object.entries(item.specifications).map(([k, v]) => (
                            <p key={k} className="text-xs text-slate-500"><span className="font-semibold">{k}:</span> {String(v)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Status Overview */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Processing', value: selected.processing_status, color: 'text-blue-600' },
                  { label: 'Packing', value: selected.packing_status, color: 'text-teal-600' },
                  { label: 'Shipping Ready', value: selected.shipping_ready ? 'Yes' : 'No', color: selected.shipping_ready ? 'text-emerald-600' : 'text-slate-500' },
                  { label: 'Accepted', value: selected.accepted_at ? new Date(selected.accepted_at).toLocaleDateString() : '—', color: 'text-purple-600' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className={cn('text-sm font-bold mt-1 capitalize', s.color)}>{String(s.value || '—').replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </section>

              {/* Assigned Notes */}
              {selected.assigned_notes && (
                <section className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Admin Assignment Notes</h3>
                  <p className="text-sm text-slate-700">{selected.assigned_notes}</p>
                </section>
              )}

              {/* Rejection Reason */}
              {selected.status === 'rejected' && selected.notes && (
                <section className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Rejection Reason
                  </h3>
                  <p className="text-sm text-slate-700">{selected.notes}</p>
                </section>
              )}

              {/* Internal Notes */}
              <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                </h3>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all resize-none"
                />
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction(selected, 'saveNotes')}
                  className="mt-2 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition-all"
                >
                  {actionLoading === selected.id + '_saveNotes' ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                  Save Notes
                </button>
              </section>

              {/* Packing Files */}
              <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileUp className="h-3.5 w-3.5" /> Packing Files
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    placeholder="Note for file..."
                    value={uploadNote}
                    onChange={(e) => setUploadNote(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2D6A4F]"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#1a4731] hover:bg-[#22573d] text-white text-xs font-bold rounded-xl transition-all">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                    Upload
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
                {packingFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No packing files uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {packingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-bold text-[#1a4731] hover:underline truncate block max-w-[250px]">
                              {file.file_name}
                            </a>
                            <p className="text-[10px] text-slate-400">
                              {file.uploaded_by_name || 'Staff'} · {new Date(file.created_at).toLocaleString()}
                              {file.note && <span className="ml-1 text-slate-500 truncate inline-block max-w-[180px]">· {file.note}</span>}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteFile(file.id)}
                          className="h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center shrink-0">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-slate-100 space-y-3 bg-slate-50/50">
              {selected.status === 'assigned' && (
                <div className="flex gap-3">
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleAction(selected, 'reject')}
                    className="flex-1 h-11 rounded-xl border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Ban className="h-4 w-4" /> Reject
                  </button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleAction(selected, 'accept')}
                    className="flex-1 h-11 rounded-xl bg-[#1a4731] hover:bg-[#22573d] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1a4731]/30"
                  >
                    {actionLoading === selected.id + '_accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Accept Task
                  </button>
                </div>
              )}
              {selected.status === 'rejected' && (
                <button onClick={() => setSelected(null)} className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm">
                  Close
                </button>
              )}
              {selected.status === 'accepted' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction(selected, 'processing')}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hourglass className="h-4 w-4" />}
                  Start Processing
                </button>
              )}
              {selected.status === 'processing' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction(selected, 'packed')}
                  className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_packed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  Mark as Packed
                </button>
              )}
              {selected.status === 'packed' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction(selected, 'ready')}
                  className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_ready' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Mark Ready for Dispatch
                </button>
              )}
              {selected.status === 'ready_for_dispatch' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleAction(selected, 'completed')}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_completed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  Mark as Completed
                </button>
              )}
              {['completed', 'cancelled'].includes(selected.status) && (
                <button onClick={() => setSelected(null)} className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}