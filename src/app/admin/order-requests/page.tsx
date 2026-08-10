'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Phone,
  Mail,
  Package,
  StickyNote,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Check,
  Ban,
  Inbox,
  BadgePercent,
  Layers,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { approveOrderRequest, rejectOrderRequest, requestOrderChanges } from '@/lib/actions/admin/order-workflow';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────
type OrderRequest = {
  id: string;
  product_id: string | null;
  product_name: string;
  user_id: string | null;
  customer_info: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    items?: any[];
    delivery_charge?: number;
    delivery_type?: string;
  };
  selected_specifications: Record<string, string>;
  quantity: number;
  discount_percent: number;
  discount_amount: number;
  design_charge: number;
  customer_notes: string | null;
  final_total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
};

// ────────────────────────────────────────────────────────────────────
// Status badge helper
// ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
          <CheckCircle className="h-3 w-3" /> Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
          <Ban className="h-3 w-3" /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
          {status}
        </span>
      );
  }
}

// ────────────────────────────────────────────────────────────────────
// Stat Card
// ────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  ring,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border ${ring} bg-white shadow-sm`}>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bg} shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-display font-extrabold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────
export default function AdminOrderRequestsPage() {
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [filtered, setFiltered] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectModal, setRejectModal] = useState<OrderRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [changesModal, setChangesModal] = useState<OrderRequest | null>(null);
  const [changesMessage, setChangesMessage] = useState('');

  const supabase = createSupabaseBrowserClient();

  // ── Fetch ──
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('order_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load order requests');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel('admin_order_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchRequests]);

  // ── Client-side filtering ──
  useEffect(() => {
    let list = [...requests];
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          (r.customer_info?.name ?? '').toLowerCase().includes(q) ||
          (r.customer_info?.email ?? '').toLowerCase().includes(q) ||
          (r.customer_info?.phone ?? '').toLowerCase().includes(q),
      );
    }
    setFiltered(list);
  }, [requests, search, statusFilter]);

  // ── Approve → create order via server action ──
  const handleApprove = async (req: OrderRequest) => {
    setActionLoading(req.id + '_approve');
    try {
      const result = await approveOrderRequest(req.id);
      if (result.ok) {
        toast.success('Order approved & created!');
        setSelected(null);
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject with reason ──
  const handleReject = async (req: OrderRequest) => {
    setActionLoading(req.id + '_reject');
    try {
      await rejectOrderRequest(req.id, rejectReason);
      toast.success('Order request rejected.');
      setRejectModal(null);
      setRejectReason('');
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Request Changes ──
  const handleRequestChanges = async (req: OrderRequest) => {
    setActionLoading(req.id + '_changes');
    try {
      await requestOrderChanges(req.id, changesMessage);
      toast.success('Change request sent to customer.');
      setChangesModal(null);
      setChangesMessage('');
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send change request');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Stats ──
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const shortId = (id: string) => id.split('-')[0].toUpperCase();

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[#1a4731] flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-white" />
            </span>
            Order Requests
          </h1>
          <p className="text-slate-500 mt-1 ml-12">
            Review incoming customer order requests. Approve to create an order.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={Inbox}
          color="text-slate-600"
          bg="bg-slate-100"
          ring="border-slate-200"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-100"
          ring="border-amber-200"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-100"
          ring="border-emerald-200"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="text-red-500"
          bg="bg-red-100"
          ring="border-red-200"
        />
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2D6A4F]" />
            <input
              placeholder="Search by product or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none h-10 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 text-sm text-slate-700 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-7 w-7 animate-spin text-[#2D6A4F]" />
                      <p className="text-sm text-slate-500">Loading order requests…</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                        <Inbox className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No order requests found</p>
                      <p className="text-xs text-slate-400">
                        {search || statusFilter !== 'all'
                          ? 'Try adjusting your filters.'
                          : 'Order requests from customers will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelected(req)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                        #{shortId(req.id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 max-w-[180px] truncate">
                        {req.product_name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {req.customer_info?.name || '—'}
                      </p>
                      <p className="text-xs text-slate-400">{req.customer_info?.phone || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {req.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatPrice(Number(req.final_total_price))}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelected(req)}
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button
                              disabled={actionLoading === req.id + '_approve'}
                              onClick={() => handleApprove(req)}
                              className="h-8 w-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === req.id + '_approve' ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                              ) : (
                                <Check className="h-4 w-4 text-emerald-700" />
                              )}
                            </button>
                            <button
                              disabled={actionLoading === req.id + '_reject'}
                              onClick={() => handleReject(req)}
                              className="h-8 w-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              {actionLoading === req.id + '_reject' ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
            Showing {filtered.length} of {requests.length} requests
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-gradient-to-br from-[#1a4731] to-[#2D6A4F]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-emerald-300 text-xs font-mono font-bold">
                    #{shortId(selected.id)}
                  </span>
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="text-xl font-display font-bold text-white">{selected.product_name}</h2>
                <p className="text-emerald-200 text-xs mt-1">
                  {new Date(selected.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <XCircle className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Customer Info */}
              <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Customer Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow icon={User} label="Name" value={selected.customer_info?.name} />
                  <InfoRow icon={Mail} label="Email" value={selected.customer_info?.email} />
                  <InfoRow icon={Phone} label="Phone" value={selected.customer_info?.phone} />
                  {selected.customer_info?.address && (
                    <InfoRow icon={Package} label="Address" value={selected.customer_info.address} />
                  )}
                </div>
              </section>

              {/* Product & Specs */}
              {/* Checkout Cart Items OR Single Product Specs */}
              {Array.isArray(selected.customer_info?.items) && selected.customer_info.items.length > 0 ? (
                <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" /> Ordered Items
                  </h3>
                  <div className="space-y-3">
                    {selected.customer_info.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity}</p>
                            {item.selectedSpecs && Object.keys(item.selectedSpecs).length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {Object.entries(item.selectedSpecs).map(([k, v]) => (
                                  <p key={k} className="text-xs text-slate-500">
                                    <span className="font-semibold capitalize">{k}:</span> {String(v)}
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.customerNotes && (
                              <p className="text-xs text-amber-700 mt-1">
                                <span className="font-semibold">Note:</span> {item.customerNotes}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-900 shrink-0">
                            {formatPrice(Number((item.price || item.unit_price || 0) * item.quantity))}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Delivery info */}
                    {selected.customer_info.delivery_charge !== undefined && (
                      <div className="flex items-center justify-between py-2 border-t border-slate-100">
                        <span className="text-sm text-slate-500 font-medium">Delivery Charge</span>
                        <span className="text-sm font-bold text-slate-900">
                          {selected.customer_info.delivery_charge === 0 ? 'Free' : formatPrice(Number(selected.customer_info.delivery_charge))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-200">
                      <span className="font-bold text-slate-900">Grand Total</span>
                      <span className="text-xl font-display font-extrabold text-[#1B4332]">
                        {formatPrice(Number(selected.final_total_price))}
                      </span>
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" /> Product & Specifications
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500 font-medium">Product</span>
                        <span className="text-sm font-bold text-slate-900">{selected.product_name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500 font-medium">Quantity</span>
                        <span className="text-sm font-bold text-slate-900">{selected.quantity}</span>
                      </div>
                      {Object.entries(selected.selected_specifications || {}).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <span className="text-sm text-slate-500 font-medium capitalize">{key}</span>
                          <span className="text-sm font-semibold text-slate-800">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Pricing */}
                  <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" /> Pricing Breakdown
                    </h3>
                    <div className="space-y-2">
                      {selected.design_charge > 0 && (
                        <PriceRow label="Design Charge" value={selected.design_charge} />
                      )}
                      {selected.discount_percent > 0 && (
                        <PriceRow
                          label={`Discount (${selected.discount_percent}%)`}
                          value={-selected.discount_amount}
                          highlight="green"
                          icon={BadgePercent}
                        />
                      )}
                      {selected.discount_amount > 0 && selected.discount_percent === 0 && (
                        <PriceRow
                          label="Discount Amount"
                          value={-selected.discount_amount}
                          highlight="green"
                          icon={BadgePercent}
                        />
                      )}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200">
                        <span className="font-bold text-slate-900">Final Total</span>
                        <span className="text-xl font-display font-extrabold text-[#1B4332]">
                          {formatPrice(Number(selected.final_total_price))}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Notes */}
              {selected.customer_notes && (
                <section className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <StickyNote className="h-3.5 w-3.5" /> Customer Notes
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{selected.customer_notes}</p>
                </section>
              )}

              {/* Pending warning */}
              {selected.status === 'approved' && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Request Approved</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      This request has been approved and an order has been created in the Orders section.
                    </p>
                  </div>
                </div>
              )}
              {selected.status === 'rejected' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Request Rejected</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      This order request has been rejected and no order was created.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer — Actions */}
            {selected.status === 'pending' && (
              <div className="p-5 border-t border-slate-100 space-y-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <button
                    disabled={!!actionLoading}
                    onClick={() => setChangesModal(selected)}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-amber-200 bg-white text-amber-700 hover:bg-amber-50 font-bold text-sm transition-all disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Request Changes
                  </button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => setRejectModal(selected)}
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-red-200 bg-white text-red-600 hover:bg-red-50 font-bold text-sm transition-all disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Reject
                  </button>
                </div>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleApprove(selected)}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#1a4731] hover:bg-[#22573d] text-white font-bold text-sm transition-all shadow-lg shadow-[#1a4731]/30 disabled:opacity-50"
                >
                  {actionLoading === selected.id + '_approve' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Approve & Create Order
                </button>
              </div>
            )}
            {selected.status !== 'pending' && (
              <div className="p-5 border-t border-slate-100">
                <button
                  onClick={() => setSelected(null)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reject Order Request</h3>
                <p className="text-xs text-slate-500">Provide a reason for rejection (optional but recommended).</p>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Item out of stock, unable to meet specifications..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all">
                Cancel
              </button>
              <button
                disabled={!!actionLoading}
                onClick={() => handleReject(rejectModal)}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === rejectModal.id + '_reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes Modal ── */}
      {changesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setChangesModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Request Changes</h3>
                <p className="text-xs text-slate-500">Ask the customer to update their order details.</p>
              </div>
            </div>
            <textarea
              value={changesMessage}
              onChange={(e) => setChangesMessage(e.target.value)}
              placeholder="e.g. Please specify preferred color, update delivery address..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setChangesModal(null); setChangesMessage(''); }} className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all">
                Cancel
              </button>
              <button
                disabled={!!actionLoading || !changesMessage.trim()}
                onClick={() => handleRequestChanges(changesModal)}
                className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === changesModal.id + '_changes' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: number;
  highlight?: 'green' | 'red';
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100">
      <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-bold',
          highlight === 'green' && 'text-emerald-600',
          highlight === 'red' && 'text-red-600',
          !highlight && 'text-slate-900',
        )}
      >
        {value < 0 ? '-' : ''}
        {formatPrice(Math.abs(value))}
      </span>
    </div>
  );
}
