'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Package, CheckCircle2, XCircle, Clock,
  Eye, MessageSquare, RotateCcw
} from 'lucide-react';
import { getReturnRequests, handleReturnAction } from '@/lib/actions/orders';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

type ReturnRequest = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  return_status: string;
  return_reason: string;
  refund_status: string;
  refund_reason: string;
  items: { name: string; quantity: number; price: number; image: string | null }[];
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReturnRequests(statusFilter === 'all' ? undefined : statusFilter);
      setReturns(data as ReturnRequest[]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const handleApprove = async (orderId: string) => {
    setActionLoading(true);
    try {
      await handleReturnAction(String(orderId), true, approveNote || 'Return approved', 'Admin');
      toast.success('Return approved — stock restored');
      setDetailId(null);
      setApproveNote('');
      fetchReturns();
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (orderId: string) => {
    setActionLoading(true);
    try {
      await handleReturnAction(String(orderId), false, approveNote || 'Return rejected', 'Admin');
      toast.success('Return rejected');
      setDetailId(null);
      setApproveNote('');
      fetchReturns();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = returns.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.customer_email || '').toLowerCase().includes(q) ||
      (r.order_number || '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  const detail = detailId ? returns.find(r => r.id === detailId) : null;

  const stats = {
    total: returns.length,
    requested: returns.filter(r => r.return_status === 'Requested').length,
    approved: returns.filter(r => r.return_status === 'Approved').length,
    rejected: returns.filter(r => r.return_status === 'Rejected').length,
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-[#1a4731]" /> Return Management
          </h1>
          <p className="text-sm text-slate-500">Review and process customer return requests</p>
        </div>
        <button onClick={fetchReturns} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#1a4731] border border-[#1a4731]/20 rounded-xl hover:bg-[#f0fdf4] transition-all">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Returns', value: stats.total, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Pending Review', value: stats.requested, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, email, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        >
          <option value="all">All Status</option>
          <option value="requested">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Return Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-400">Loading return requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No return requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Return requests from customers will appear here</p>
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-bold text-xs text-slate-900">#{(r.order_number || r.id).toString().slice(0, 8).toUpperCase()}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{r.id.toString().slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-700">{r.customer_name || 'Unknown'}</p>
                    <p className="text-[11px] text-slate-400">{r.customer_email || ''}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs text-slate-600 truncate italic">"{r.return_reason || 'No reason'}"</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.return_status === 'Requested' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      r.return_status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      r.return_status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {r.return_status === 'Requested' && <Clock className="w-3 h-3" />}
                      {r.return_status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                      {r.return_status === 'Rejected' && <XCircle className="w-3 h-3" />}
                      {r.return_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-bold text-slate-700">{formatPrice(r.total)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-600">{formatDate(r.updated_at)}</p>
                    <p className="text-[11px] text-slate-400">{formatTime(r.updated_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setDetailId(r.id); setApproveNote(''); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#1a4731] bg-[#f0fdf4] border border-[#1a4731]/10 rounded-lg hover:bg-[#dcfce7] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailId(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Return Request Details</h2>
                  <p className="text-xs text-slate-500">Order #{(detail.order_number || detail.id).toString().slice(0, 8).toUpperCase()}</p>
                </div>
                <button onClick={() => setDetailId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Customer</p>
                  <p className="text-sm font-bold text-slate-900">{detail.customer_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{detail.customer_email}</p>
                  {detail.customer_phone && <p className="text-xs text-slate-500">{detail.customer_phone}</p>}
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Order Info</p>
                  <p className="text-sm font-bold text-slate-900">{formatPrice(detail.total)}</p>
                  <p className="text-xs text-slate-500">{detail.items.length} item(s)</p>
                  <p className="text-xs text-slate-500">Placed: {formatDate(detail.created_at)}</p>
                </div>
              </div>

              {/* Return Reason */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <p className="text-xs font-bold uppercase text-amber-800 tracking-wider">Return Reason</p>
                </div>
                <p className="text-sm text-amber-900 italic">"{detail.return_reason || 'No reason specified'}"</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">Returned Items</p>
                <div className="space-y-2">
                  {detail.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-700">{item.name}</p>
                        <p className="text-[11px] text-slate-400">Qty: {item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-700">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              {detail.status === 'returned' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-bold text-emerald-800">Return Approved — Stock Restored</p>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">Items have been returned to inventory stock.</p>
                </div>
              )}

              {/* Action Panel — only for pending returns */}
              {detail.return_status === 'Requested' && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-bold uppercase text-red-800 tracking-wider">Admin Action Required</p>
                  <textarea
                    placeholder="Add a note for the customer (optional)..."
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none h-20"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(detail.id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject Return
                    </button>
                    <button
                      onClick={() => handleApprove(detail.id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Restore Stock
                    </button>
                  </div>
                </div>
              )}

              {/* Already processed */}
              {detail.return_status !== 'Requested' && detail.return_status !== 'None' && (
                <div className={`rounded-xl p-4 ${
                  detail.return_status === 'Approved' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                }`}>
                  <div className="flex items-center gap-2">
                    {detail.return_status === 'Approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={`text-sm font-bold ${
                      detail.return_status === 'Approved' ? 'text-emerald-800' : 'text-red-800'
                    }`}>
                      Return {detail.return_status}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
