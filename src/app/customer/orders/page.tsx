'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Package, Clock, Truck, CheckCircle2, XCircle, Search,
  ChevronDown, ChevronUp, Calendar, AlertCircle, ShoppingBag, Eye,
  RotateCcw, ArrowLeft, ArrowRight, Download, FileText, X,
  Filter, SortAsc, SortDesc, Loader2, MapPin, CreditCard,
  AlertTriangle, Star, MessageSquare, Printer, RefreshCw,
  ChevronLeft, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { reorderOrder } from '@/lib/actions/reorder-order';
import { requestOrderReturnAction, getOrderTrackingData } from '@/lib/actions/orders';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';

// ─── Types ───────────────────────────────────────────────────────────────────
type SortField = 'created_at' | 'amount' | 'status';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

interface TimelineEvent {
  id: string;
  order_id: string;
  status: string;
  note: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? 'just now' : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200/50',
  pending_approval: 'bg-amber-50 text-amber-800 border-amber-200/50',
  processing: 'bg-blue-50 text-blue-800 border-blue-200/50',
  packed: 'bg-indigo-50 text-indigo-800 border-indigo-200/50',
  ready_for_pickup: 'bg-purple-50 text-purple-800 border-purple-200/50',
  shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200/50',
  in_transit: 'bg-sky-50 text-sky-800 border-sky-200/50',
  out_for_delivery: 'bg-cyan-50 text-cyan-800 border-cyan-200/50',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200/50',
  cancelled: 'bg-rose-50 text-rose-800 border-rose-200/50',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200/50',
  returned: 'bg-slate-100 text-slate-800 border-slate-300/50',
  refunded: 'bg-purple-50 text-purple-800 border-purple-200/50',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  pending_approval: <Clock className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  packed: <Package className="w-4 h-4" />,
  ready_for_pickup: <Package className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  in_transit: <Truck className="w-4 h-4" />,
  out_for_delivery: <Truck className="w-4 h-4" />,
  delivered: <CheckCircle2 className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  returned: <RotateCcw className="w-4 h-4" />,
  refunded: <CreditCard className="w-4 h-4" />,
};

const timelineStatusOrder = [
  'pending', 'pending_approval', 'processing', 'packed',
  'ready_for_pickup', 'shipped', 'in_transit', 'out_for_delivery', 'delivered',
];

function getStatusDisplay(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Track Order Timeline Modal ──────────────────────────────────────────────
function TrackOrderModal({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [order.id]);

  const loadTimeline = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });
    if (data) setTimeline(data);
    setLoading(false);
  };

  const currentStatusIndex = timelineStatusOrder.indexOf(order.status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = ['cancelled', 'rejected', 'returned'].includes(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Track Order</h2>
              <p className="text-xs text-slate-400 font-medium">
                #{String(order.id).slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" />
            </div>
          ) : isCancelled ? (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Order {getStatusDisplay(order.status)}</h3>
              <p className="text-sm text-slate-500">This order was {order.status} and will not be delivered.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {timelineStatusOrder.map((status, idx) => {
                const isPast = currentStatusIndex >= idx;
                const isCurrent = currentStatusIndex === idx;
                const timelineEvent = timeline.find(t => t.status === status);

                return (
                  <div key={status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={classNames(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all',
                        isPast
                          ? isCurrent
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200'
                            : 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-300'
                      )}>
                        {isPast ? (
                          isCurrent ? <Truck className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      {idx < timelineStatusOrder.length - 1 && (
                        <div className={classNames(
                          'w-0.5 h-8',
                          isPast && !isCurrent ? 'bg-emerald-500' : 'bg-slate-200'
                        )} />
                      )}
                    </div>
                    <div className={classNames('pb-8 flex-1', !isPast && 'opacity-40')}>
                      <div className="flex items-center gap-2">
                        <h4 className={classNames(
                          'text-sm font-bold',
                          isCurrent ? 'text-emerald-700' : isPast ? 'text-slate-800' : 'text-slate-400'
                        )}>
                          {getStatusDisplay(status)}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full border border-emerald-200 animate-pulse">
                            Current
                          </span>
                        )}
                      </div>
                      {timelineEvent && (
                        <div className="mt-1">
                          <p className="text-xs text-slate-500 font-medium">{timelineEvent.note}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatFullDate(timelineEvent.created_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isDelivered && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500 text-white border-2 border-emerald-500">
                      <Star className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="pb-2">
                    <h4 className="text-sm font-bold text-emerald-700">Delivered Successfully</h4>
                    <p className="text-xs text-slate-500 mt-1">Your order has been delivered. Thank you for shopping with us!</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Return Request Modal ────────────────────────────────────────────────────
function ReturnRequestModal({
  order,
  onClose,
  onSuccess,
}: {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please select a reason for the return');
      return;
    }
    setSubmitting(true);
    try {
      await requestOrderReturnAction(String(order.id), reason.trim(), details.trim());
      toast.success('Return request submitted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
              <RotateCcw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Request Return</h2>
              <p className="text-xs text-slate-400 font-medium">
                Order #{String(order.id).slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Return Policy</p>
              <p className="text-xs text-amber-600 mt-1">
                Returns are accepted within 7 days of delivery. Items must be in original condition.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reason for Return
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all bg-white"
            >
              <option value="">Select a reason...</option>
              <option value="defective">Defective / Damaged Product</option>
              <option value="wrong_item">Wrong Item Received</option>
              <option value="not_as_described">Not as Described</option>
              <option value="size_issue">Size / Fit Issue</option>
              <option value="changed_mind">Changed Mind</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Additional Details (optional)
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe the issue in more detail..."
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
              ) : (
                <><RotateCcw className="w-3.5 h-3.5" /> Submit Return</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Invoice Modal ───────────────────────────────────────────────────────────
function InvoiceModal({
  order,
  orderItems,
  onClose,
}: {
  order: any;
  orderItems: any[];
  onClose: () => void;
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `invoice-${String(order.id).slice(0, 8).toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const subtotal = orderItems.reduce((sum: number, item: any) =>
    sum + (Number(item.price ?? item.unit_price ?? 0) * (item.quantity || 1)), 0);
  const deliveryCharge = Number(order.delivery_charge ?? 0);
  const total = order.amount || subtotal + deliveryCharge;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Invoice</h2>
              <p className="text-xs text-slate-400 font-medium">
                #{String(order.id).slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {downloading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-3.5 h-3.5" /> Download</>
              )}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div ref={invoiceRef} className="bg-white p-8 rounded-2xl border border-slate-200">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-lg">H</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">Horof</span>
                </div>
                <p className="text-xs text-slate-500">Premium E-Commerce</p>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-bold text-slate-900">INVOICE</h3>
                <p className="text-xs text-slate-500 mt-1">
                  #{String(order.id).slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200 mb-6" />

            {/* Customer & Order Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bill To</h4>
                <p className="text-sm font-bold text-slate-800">{order.customer_name || 'Customer'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{order.customer_email || ''}</p>
                <p className="text-xs text-slate-500">{order.customer_phone || ''}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {order.customer_address || (typeof order.shipping_address === 'string' ? order.shipping_address : '')}
                </p>
              </div>
              <div className="text-right">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Order Details</h4>
                <p className="text-xs text-slate-600">
                  <span className="font-bold">Date:</span> {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-bold">Status:</span>{' '}
                  <span className="capitalize">{order.status.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  <span className="font-bold">Payment:</span>{' '}
                  <span className="capitalize">{order.payment_status || 'Pending'}</span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item</th>
                  <th className="text-center py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item: any, idx: number) => {
                  const itemTotal = Number(item.price ?? item.unit_price ?? 0) * (item.quantity || 1);
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3">
                        <p className="text-sm font-bold text-slate-800">{item.products?.name || 'Product'}</p>
                      </td>
                      <td className="py-3 text-center text-sm text-slate-600">{item.quantity || 1}</td>
                      <td className="py-3 text-right text-sm text-slate-600">
                        ৳{Number(item.price ?? item.unit_price ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-sm font-bold text-slate-800">
                        ৳{itemTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-800">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery Charge</span>
                <span className="font-bold text-slate-800">৳{deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-bold text-lg text-[#1B4332]">৳{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400">Thank you for your purchase!</p>
              <p className="text-[10px] text-slate-300 mt-1">Horof - Premium E-Commerce</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Orders Page ────────────────────────────────────────────────────────
export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Modals
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const supabase = createSupabaseBrowserClient();

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id);

    const { data: requestsData } = await supabase
      .from('order_requests')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'rejected']);

    let combined: any[] = [];

    if (ordersData) {
      combined = [...combined, ...ordersData.map(o => ({
        ...o,
        amount: Number(o.total ?? o.total_price ?? 0),
        is_request: false,
      }))];
    }

    if (requestsData) {
      combined = [...combined, ...requestsData.map(r => ({
        ...r,
        amount: Number(r.final_total_price),
        status: r.status === 'pending' ? 'pending_approval' : r.status,
        is_request: true,
        items: r.customer_info?.items?.map((item: any, idx: number) => ({
          id: idx,
          quantity: item.quantity,
          price: item.price || item.unit_price,
          unit_price: item.price || item.unit_price,
          products: { name: item.name, slug: '' },
        })) || [{
          id: 0, quantity: r.quantity,
          price: r.final_total_price / r.quantity,
          unit_price: r.final_total_price / r.quantity,
          products: { name: r.product_name, slug: '' },
        }],
      }))];
    }

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(combined);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel(`customer-orders-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => fetchOrders())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchOrders, supabase]);

  const fetchOrderItems = async (orderId: any) => {
    const stringId = String(orderId);
    if (orderItems[stringId]) return;

    const requestOrder = orders.find(o => String(o.id) === stringId);
    if (requestOrder?.is_request) {
      setOrderItems(prev => ({ ...prev, [stringId]: requestOrder.items }));
      return;
    }

    const { data } = await supabase
      .from('order_items')
      .select('*, products(id, name, slug, price)')
      .eq('order_id', orderId);

    if (data) setOrderItems(prev => ({ ...prev, [stringId]: data }));
  };

  const toggleOrderDetails = (orderId: any) => {
    const stringId = String(orderId);
    if (expandedOrderId === stringId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(stringId);
      fetchOrderItems(orderId);
    }
  };

  const isReorderEligible = (status: string) =>
    ['delivered', 'completed', 'cancelled', 'refunded', 'returned'].includes(status.toLowerCase());

  const handleReorder = async (orderId: string) => {
    setReorderLoading(orderId);
    try {
      const res = await reorderOrder(orderId);
      if (res.ok && res.orderId) {
        toast.success('Reorder placed successfully!');
        window.location.href = `/order-confirmed?id=${res.orderId}&reorder=true`;
      } else {
        toast.error(res.message || 'Failed to reorder');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder');
    } finally {
      setReorderLoading(null);
    }
  };

  const handleMarkReceived = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Order marked as received!');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    }
  };

  const handleOpenInvoice = async (order: any) => {
    const stringId = String(order.id);
    if (!orderItems[stringId] && !order.is_request) {
      await fetchOrderItems(order.id);
    }
    const items = orderItems[stringId] || order.items || [];
    setInvoiceItems(items);
    setInvoiceOrder(order);
  };

  // ─── Filtering & Sorting ─────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        if (!['pending', 'pending_approval'].includes(o.status)) return false;
      } else if (statusFilter === 'processing') {
        if (!['processing', 'packed', 'ready_for_pickup'].includes(o.status)) return false;
      } else if (statusFilter === 'shipped') {
        if (!['shipped', 'in_transit', 'out_for_delivery'].includes(o.status)) return false;
      } else if (o.status !== statusFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const idMatch = String(o.id).toLowerCase().includes(q);
      const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
      const statusMatch = o.status.toLowerCase().includes(q);
      if (!idMatch && !nameMatch && !statusMatch) return false;
    }
    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === 'amount') {
      cmp = a.amount - b.amount;
    } else if (sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedOrders.length / perPage);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * perPage, currentPage * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const statusCounts: Record<string, number> = {
    all: orders.length,
    pending: orders.filter(o => ['pending', 'pending_approval'].includes(o.status)).length,
    processing: orders.filter(o => ['processing', 'packed', 'ready_for_pickup'].includes(o.status)).length,
    shipped: orders.filter(o => ['shipped', 'in_transit', 'out_for_delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length,
    returned: orders.filter(o => o.status === 'returned').length,
  };

  const getStatusBadge = (status: string) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${statusColors[status] || 'bg-slate-50 text-slate-700'}`}>
      {statusIcons[status] || null}
      {status === 'pending_approval' ? 'PENDING APPROVAL' : status.toUpperCase()}
    </span>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Track, manage, and reorder your purchases.</p>
        </div>
        <Link
          href="/products"
          className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm w-fit"
        >
          <ShoppingBag className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'All', count: statusCounts.all, color: 'bg-slate-50 text-slate-700 border-slate-200' },
          { label: 'Pending', count: statusCounts.pending, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Processing', count: statusCounts.processing, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Shipped', count: statusCounts.shipped, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Delivered', count: statusCounts.delivered, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-rose-50 text-rose-700 border-rose-200' },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => {
              setStatusFilter(stat.label.toLowerCase() as FilterStatus);
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border text-center transition-all ${
              statusFilter === stat.label.toLowerCase()
                ? stat.color + ' ring-2 ring-offset-1 ring-slate-200'
                : 'bg-white border-slate-100 hover:border-slate-200'
            }`}
          >
            <p className="text-lg font-bold text-slate-800">{stat.count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by order ID, name, or status..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('created_at')}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              sortField === 'created_at' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Date {sortField === 'created_at' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
          </button>
          <button
            onClick={() => toggleSort('amount')}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              sortField === 'amount' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Amount {sortField === 'amount' && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B4332] mx-auto" />
            <p className="text-sm font-semibold text-slate-500 mt-3">Loading orders...</p>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="p-16 text-center max-w-md mx-auto">
            <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No matching orders' : 'No orders yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Explore our collection and place your first order!'}
            </p>
            <Link href="/products" className="px-6 py-3 bg-[#1B4332] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-all uppercase tracking-wider text-xs shadow-lg shadow-[#1b4332]/20">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedOrders.map((order, idx) => {
              const stringId = String(order.id);
              const isExpanded = expandedOrderId === stringId;
              const items = orderItems[stringId] || order.items || [];
              const isDelivered = order.status === 'delivered';
              const isCancelled = ['cancelled', 'rejected', 'returned'].includes(order.status);

              return (
                <motion.div
                  key={stringId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex flex-col"
                >
                  {/* Order Summary Row */}
                  <div
                    onClick={() => toggleOrderDetails(order.id)}
                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Order Placed</p>
                        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Total</p>
                        <p className="text-sm font-bold text-[#1B4332]">৳{order.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</p>
                        <div className="mt-0.5">{getStatusBadge(order.status)}</div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Order #</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">
                          {stringId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isDelivered && (
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkReceived(order.id); }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Received
                        </button>
                      )}
                      <div className={`p-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#1B4332]' : ''}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-5 md:p-6 space-y-5">
                      {/* Items */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Items</h3>
                        <div className="space-y-3">
                          {items.length === 0 ? (
                            <div className="py-4 text-center text-sm text-slate-400">Loading items...</div>
                          ) : (
                            items.map((item: any, idx: number) => (
                              <div key={item.id || idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="h-12 w-12 rounded-xl bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center shrink-0 border border-[#1b4332]/5">
                                  <Package className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">
                                    {item.products?.name || 'Product'}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity || 1}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-slate-900">
                                    ৳{Number(item.price ?? item.unit_price ?? 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={e => { e.stopPropagation(); setTrackingOrder(order); }}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" /> Track Order
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenInvoice(order); }}
                          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" /> Invoice
                        </button>
                        {isDelivered && (
                          <button
                            onClick={e => { e.stopPropagation(); setReturnOrder(order); }}
                            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Return
                          </button>
                        )}
                        {!order.is_request && isReorderEligible(order.status) && (
                          <button
                            onClick={e => { e.stopPropagation(); handleReorder(order.id); }}
                            disabled={reorderLoading === stringId}
                            className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                          >
                            {reorderLoading === stringId ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reordering...</>
                            ) : (
                              <><RotateCcw className="w-3.5 h-3.5" /> Reorder</>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Order Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Info
                          </h4>
                          <div className="text-xs font-medium text-slate-700 space-y-1">
                            {order.customer_name && <p className="font-bold text-slate-900">{order.customer_name}</p>}
                            {order.customer_address ? (
                              <p className="leading-relaxed">{order.customer_address}</p>
                            ) : order.shipping_address ? (
                              typeof order.shipping_address === 'string' ? (
                                <p className="leading-relaxed">{order.shipping_address}</p>
                              ) : (
                                <p className="leading-relaxed">
                                  {order.shipping_address.street || order.shipping_address.address_line || ''}<br />
                                  {order.shipping_address.city || ''}
                                </p>
                              )
                            ) : (
                              <p className="text-slate-400 italic">No delivery address saved.</p>
                            )}
                            {order.customer_phone && <p className="text-slate-500 font-bold mt-2">Phone: {order.customer_phone}</p>}
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Order Summary</h4>
                          <div className="space-y-2 text-xs font-semibold">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal</span>
                              <span>৳{Number(order.amount - (order.delivery_charge ?? 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Delivery</span>
                              <span>৳{Number(order.delivery_charge ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Payment</span>
                              <span className="uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                {order.payment_status || 'PENDING'}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-100 mt-2 text-sm">
                              <span>Total</span>
                              <span className="text-[#1B4332]">৳{order.amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-5 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              Showing {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, sortedOrders.length)} of {sortedOrders.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#1B4332] text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {trackingOrder && (
          <TrackOrderModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
        )}
        {returnOrder && (
          <ReturnRequestModal
            order={returnOrder}
            onClose={() => setReturnOrder(null)}
            onSuccess={fetchOrders}
          />
        )}
        {invoiceOrder && (
          <InvoiceModal
            order={invoiceOrder}
            orderItems={invoiceItems}
            onClose={() => setInvoiceOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
