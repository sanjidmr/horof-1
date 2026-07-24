'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Warehouse, Search, Eye, CheckCircle, XCircle, Clock, RefreshCw,
  Package, ChevronDown, Loader2, AlertTriangle, Truck, StickyNote,
  Calendar, Boxes, ClipboardCheck, Ban, Inbox, Settings,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatPrice, cn } from '@/lib/utils';
import {
  warehouseAcceptOrder,
  warehouseRejectOrder,
  warehouseMarkPreparing,
  warehouseMarkReady,
  updateWarehouseNotes,
} from '@/lib/actions/admin/order-workflow';

type WarehouseOrder = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  warehouse_status: string | null;
  warehouse_notes: string | null;
  warehouse_estimated_dispatch: string | null;
  amount: number;
  product_details: any;
  created_at: string;
  updated_at: string;
};

const WAREHOUSE_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  waiting_for_warehouse: { label: 'Awaiting Review', color: 'text-amber-700', bg: 'bg-amber-100' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  preparing: { label: 'Preparing', color: 'text-blue-700', bg: 'bg-blue-100' },
  ready_for_dispatch: { label: 'Ready for Dispatch', color: 'text-purple-700', bg: 'bg-purple-100' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">Unknown</span>;
  const s = WAREHOUSE_STATUS_LABELS[status] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border', s.bg, s.color, `border-${s.bg.replace('bg-', '')}/50`)}>
      {s.label}
    </span>
  );
}

export default function WarehouseOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [filtered, setFiltered] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WarehouseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editNotes, setEditNotes] = useState('');
  const [editEstDispatch, setEditEstDispatch] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/admin/warehouse/orders');
    }
  }, [user, authLoading, router]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // First, look up which warehouse this staff member is assigned to
    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_warehouse_id, role')
      .eq('id', user.id)
      .single();

    const whId = profile?.assigned_warehouse_id;
    const admin = profile?.role === 'admin';
    setWarehouseId(whId);
    setIsAdmin(admin);

    // Admin sees all warehouse-assigned + unassigned orders; staff sees only their warehouse
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (admin) {
      // Admin: show orders assigned to their warehouse OR unassigned orders
      if (whId) {
        query = query.or(`warehouse_id.eq.${whId},warehouse_id.is.null`);
      }
      // If admin has no warehouse, show ALL orders
    } else if (whId) {
      query = query.eq('warehouse_id', whId);
    } else {
      // Non-admin staff with no warehouse
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('warehouse_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchOrders]);

  useEffect(() => {
    let list = [...orders];
    if (statusFilter !== 'all') list = list.filter((o) => o.warehouse_status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.customer_phone || '').toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [orders, search, statusFilter]);

  const handleAccept = async (order: WarehouseOrder) => {
    setActionLoading(order.id + '_accept');
    try {
      await warehouseAcceptOrder(order.id);
      toast.success('Order accepted!');
      setSelected(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (order: WarehouseOrder) => {
    setActionLoading(order.id + '_reject');
    try {
      await warehouseRejectOrder(order.id, rejectReason);
      toast.success('Order rejected.');
      setSelected(null);
      setRejectReason('');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPreparing = async (order: WarehouseOrder) => {
    setActionLoading(order.id + '_preparing');
    try {
      await warehouseMarkPreparing(order.id);
      toast.success('Order is now being prepared.');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (order: WarehouseOrder) => {
    setActionLoading(order.id + '_ready');
    try {
      await warehouseMarkReady(order.id, editEstDispatch || null, editNotes || null);
      toast.success('Order marked as ready for dispatch!');
      setSelected(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async (order: WarehouseOrder) => {
    setActionLoading(order.id + '_notes');
    try {
      await updateWarehouseNotes(order.id, editNotes);
      toast.success('Notes saved.');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    total: orders.length,
    awaiting: orders.filter((o) => o.warehouse_status === 'waiting_for_warehouse').length,
    accepted: orders.filter((o) => o.warehouse_status === 'accepted').length,
    preparing: orders.filter((o) => o.warehouse_status === 'preparing').length,
    ready: orders.filter((o) => o.warehouse_status === 'ready_for_dispatch').length,
  };

  const shortId = (id: any) => String(id || '').split('-')[0].toUpperCase();

  const getItems = (order: WarehouseOrder) => {
    if (!order.product_details) return [];
    if (Array.isArray(order.product_details)) return order.product_details;
    return [order.product_details];
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
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[#1a4731] flex items-center justify-center shrink-0">
              <Warehouse className="h-5 w-5 text-white" />
            </span>
            Warehouse Orders
          </h1>
          <p className="text-slate-500 mt-1 ml-12">Manage assigned orders — accept, prepare, and dispatch.</p>
        </div>
        <Button onClick={fetchOrders} disabled={loading} variant="outline">
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
        <Link href="/admin/inventory/warehouses">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Manage Warehouses
          </Button>
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-100', ring: 'border-slate-200', icon: Boxes },
          { label: 'Awaiting', value: stats.awaiting, color: 'text-amber-600', bg: 'bg-amber-100', ring: 'border-amber-200', icon: Clock },
          { label: 'Accepted', value: stats.accepted, color: 'text-emerald-600', bg: 'bg-emerald-100', ring: 'border-emerald-200', icon: CheckCircle },
          { label: 'Preparing', value: stats.preparing, color: 'text-blue-600', bg: 'bg-blue-100', ring: 'border-blue-200', icon: Package },
          { label: 'Ready', value: stats.ready, color: 'text-purple-600', bg: 'bg-purple-100', ring: 'border-purple-200', icon: Truck },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.ring} bg-white shadow-sm`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.bg} shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-display font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none h-10 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 text-sm outline-none focus:border-[#2D6A4F] cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="waiting_for_warehouse">Awaiting Review</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready_for_dispatch">Ready for Dispatch</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#2D6A4F] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Inbox className="h-7 w-7 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">No orders assigned</p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelected(order);
                      setEditNotes(order.warehouse_notes || '');
                      setEditEstDispatch(order.warehouse_estimated_dispatch ? order.warehouse_estimated_dispatch.split('T')[0] : '');
                      setRejectReason('');
                    }}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        #{order.order_number?.split('-').pop() || shortId(order.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">{order.customer_name || '—'}</p>
                      <p className="text-xs text-slate-400">{order.customer_phone || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {getItems(order).length}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{formatPrice(Number(order.amount || 0))}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.warehouse_status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelected(order);
                          setEditNotes(order.warehouse_notes || '');
                          setEditEstDispatch(order.warehouse_estimated_dispatch ? order.warehouse_estimated_dispatch.split('T')[0] : '');
                          setRejectReason('');
                        }}
                        className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                      >
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

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-gradient-to-br from-[#1a4731] to-[#2D6A4F]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-300 text-xs font-mono font-bold">#{selected.order_number?.split('-').pop() || shortId(selected.id)}</span>
                  <StatusBadge status={selected.warehouse_status} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">{selected.customer_name}</h2>
                <p className="text-emerald-200 text-xs mt-1">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Items */}
              <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" /> Order Items
                </h3>
                <div className="space-y-2">
                  {getItems(selected).map((item: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3">
                      <p className="text-sm font-bold text-slate-900">{item.product_name || item.name || 'Product'}</p>
                      <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatPrice(Number(item.unit_price || item.price || 0))}</p>
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
                {selected.warehouse_status !== 'waiting_for_warehouse' && (
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleSaveNotes(selected)}
                    className="mt-2 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition-all"
                  >
                    {actionLoading === selected.id + '_notes' ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                    Save Notes
                  </button>
                )}
              </section>

              {/* Estimated Dispatch (for accepted/preparing orders) */}
              {(selected.warehouse_status === 'accepted' || selected.warehouse_status === 'preparing') && (
                <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Estimated Dispatch Date
                  </h3>
                  <input
                    type="date"
                    value={editEstDispatch}
                    onChange={(e) => setEditEstDispatch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#2D6A4F]"
                  />
                </section>
              )}

              {/* Rejection Reason (for rejected orders) */}
              {selected.warehouse_status === 'rejected' && selected.warehouse_notes && (
                <section className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Rejection Reason
                  </h3>
                  <p className="text-sm text-slate-700">{selected.warehouse_notes}</p>
                </section>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-slate-100 space-y-3 bg-slate-50/50">
              {selected.warehouse_status === 'waiting_for_warehouse' && (
                <div className="flex gap-3">
                  <button
                    disabled={!!actionLoading}
                    onClick={() => {
                      setRejectReason('');
                      document.getElementById('reject-reason-input')?.focus();
                    }}
                    className="flex-1 h-11 rounded-xl border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Ban className="h-4 w-4" /> Reject
                  </button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleAccept(selected)}
                    className="flex-1 h-11 rounded-xl bg-[#1a4731] hover:bg-[#22573d] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1a4731]/30"
                  >
                    {actionLoading === selected.id + '_accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    Accept Order
                  </button>
                </div>
              )}
              {selected.warehouse_status === 'accepted' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleMarkPreparing(selected)}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_preparing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Start Preparing
                </button>
              )}
              {selected.warehouse_status === 'preparing' && (
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleMarkReady(selected)}
                  className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  {actionLoading === selected.id + '_ready' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Mark Ready for Dispatch
                </button>
              )}
              {!['waiting_for_warehouse', 'accepted', 'preparing'].includes(selected.warehouse_status || '') && (
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

function Button({ children, onClick, disabled, variant, className }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50',
        variant === 'outline' ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-[#1a4731] text-white hover:bg-[#22573d]',
        className
      )}
    >
      {children}
    </button>
  );
}
