'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import Link from 'next/link';
import { 
  Search, 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Download, 
  ArrowRight,
  Filter,
  CornerUpLeft,
  AlertCircle,
  Undo2
} from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { cancelOrderAction, requestOrderReturnAction } from '@/lib/actions/orders';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Interactive Modal states
  const [cancelModalId, setCancelModalId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [returnModalId, setReturnModalId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?next=/orders';
        return;
      }
      setUser(user);

      // Fetch user's orders
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              name,
              images
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error.message);
        toast.error('Failed to load orders.');
      } else {
        setOrders(data || []);
        setFilteredOrders(data || []);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Filter orders whenever searchQuery, statusFilter, or orders change
  useEffect(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        String(o.id).toLowerCase().includes(q) || 
        (o.transaction_id && o.transaction_id.toLowerCase().includes(q))
      );
    }

    setFilteredOrders(result);
  }, [searchQuery, statusFilter, orders]);

  // Cancel order
  const handleCancelOrder = async () => {
    if (!cancelModalId) return;
    setCancelLoading(true);
    try {
      const res = await cancelOrderAction(cancelModalId, cancelReason, 'customer');
      if (res.success) {
        toast.success('Order cancelled successfully.');
        setOrders(prev => 
          prev.map(o => o.id === cancelModalId ? { ...o, status: 'cancelled' } : o)
        );
        setCancelModalId(null);
        setCancelReason('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Request Return
  const handleRequestReturn = async () => {
    if (!returnModalId) return;
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return.');
      return;
    }
    setReturnLoading(true);
    try {
      const res = await requestOrderReturnAction(returnModalId, returnReason);
      if (res.success) {
        toast.success('Return requested successfully.');
        setOrders(prev => 
          prev.map(o => {
            if (o.id === returnModalId) {
              const { items, metadata } = parseProductDetails(o.product_details);
              metadata.return_status = 'Requested';
              metadata.return_reason = returnReason;
              return { ...o, product_details: [ ...items, { ...metadata, is_metadata: true } ] };
            }
            return o;
          })
        );
        setReturnModalId(null);
        setReturnReason('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to request return.');
    } finally {
      setReturnLoading(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/50"><Clock className="h-3.5 w-3.5" /> Pending</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#1B4332] text-xs font-bold border border-[#B7E4C7]"><CheckCircle2 className="h-3.5 w-3.5" /> Confirmed</span>;
      case 'processing': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/50"><Package className="h-3.5 w-3.5" /> Processing</span>;
      case 'packed': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200/50"><Package className="h-3.5 w-3.5" /> Packed</span>;
      case 'ready_for_pickup': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold border border-violet-200/50"><Truck className="h-3.5 w-3.5" /> Ready for Pickup</span>;
      case 'shipped': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200/50"><Truck className="h-3.5 w-3.5" /> Shipped</span>;
      case 'in_transit': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/50"><Truck className="h-3.5 w-3.5" /> In Transit</span>;
      case 'out_for_delivery': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200/50"><Truck className="h-3.5 w-3.5" /> Out for Delivery</span>;
      case 'delivered': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/50"><CheckCircle2 className="h-3.5 w-3.5" /> Delivered</span>;
      case 'cancelled': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200/50"><XCircle className="h-3.5 w-3.5" /> Cancelled</span>;
      case 'returned': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/50"><Undo2 className="h-3.5 w-3.5" /> Returned</span>;
      case 'refunded': 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/50"><Undo2 className="h-3.5 w-3.5" /> Refunded</span>;
      default: 
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/50">{status}</span>;
    }
  };

  const getFulfillmentEligibility = (order: any) => {
    // Returns are allowed within 7 days of delivery
    if (order.status !== 'delivered') return false;
    const deliveryDate = new Date(order.updated_at || order.created_at);
    const differenceInDays = (Date.now() - deliveryDate.getTime()) / (1000 * 3600 * 24);
    
    const { metadata } = parseProductDetails(order.product_details);
    const returnStatus = metadata.return_status || 'None';
    
    return differenceInDays <= 7 && returnStatus === 'None';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b pb-6 border-slate-100">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-medium text-slate-900">Your Orders</h1>
            {user && <p className="text-slate-500 text-sm font-light">Manage and track orders for <span className="font-semibold text-slate-700">{user.email}</span></p>}
          </div>
          <Link href="/products" className="text-xs font-bold uppercase tracking-widest text-[#1a4731] hover:underline">
            Continue shopping →
          </Link>
        </div>

        {/* Searching & Filtering */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1a4731] transition-colors" />
            <input 
              placeholder="Search by Order ID or Transaction ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm text-slate-950 outline-none focus:bg-white focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731] transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 hidden md:block" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm text-slate-800 outline-none focus:bg-white focus:border-[#1a4731] transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>

        {/* Main Orders Display */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 h-48 animate-pulse flex flex-col justify-between">
                <div className="h-6 w-1/3 bg-slate-100 rounded-lg" />
                <div className="h-10 w-full bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center space-y-6 shadow-sm">
            <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Package size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">No orders found</h2>
              <p className="text-slate-400 max-w-sm mx-auto text-sm font-light">
                {searchQuery || statusFilter !== 'all' 
                  ? 'We couldn\'t find any orders matching your filters. Try clearing your search.' 
                  : 'You haven\'t placed any orders yet. Visit our gallery to see our premium handcrafted pieces.'}
              </p>
            </div>
            <Link href="/products" className="inline-flex items-center justify-center h-12 px-8 bg-[#1a4731] text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-[#2d6a4f] shadow-lg shadow-forest-900/10 transition-all">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const { items: metaItems, metadata } = parseProductDetails(order.product_details);
              const itemsList = order.order_items && order.order_items.length > 0 ? order.order_items : metaItems;
              const returnEligible = getFulfillmentEligibility(order);

              return (
                <div key={order.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-6 hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 border-slate-50">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Order ID</span>
                      <p className="font-mono text-sm text-slate-800 font-semibold">#{order.id}</p>
                      <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 items-center">
                      {metadata.return_status && metadata.return_status !== 'None' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Return: {metadata.return_status}
                        </span>
                      )}
                      {renderStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Card Items */}
                  <div className="divide-y divide-slate-50">
                    {itemsList.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 flex items-center justify-center">
                            {item.products?.images?.[0] || item.product?.images?.[0] ? (
                              <img src={item.products?.images?.[0] || item.product?.images?.[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="text-slate-300 h-6 w-6" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{item.products?.name || item.product?.name || item.name}</h4>
                            <p className="text-xs text-slate-400 font-light mt-0.5">Quantity: {item.quantity}</p>
                            {item.selectedSpecs && Object.keys(item.selectedSpecs).length > 0 && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {Object.entries(item.selectedSpecs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{formatPrice(Number(item.price || item.unit_price || 0) * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Courier & Totals Details */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 space-y-1.5">
                      <p><span className="font-semibold text-slate-700">Payment:</span> {order.payment_method?.toUpperCase() || 'COD'} (<span className="capitalize font-medium">{order.payment_status || 'Pending'}</span>)</p>
                      {metadata.courier_name && (
                        <p><span className="font-semibold text-slate-700">Courier:</span> {metadata.courier_name} {metadata.tracking_number && <span className="font-mono text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded">#{metadata.tracking_number}</span>}</p>
                      )}
                      {metadata.estimated_delivery && (
                        <p><span className="font-semibold text-slate-700">Est. Delivery:</span> {new Date(metadata.estimated_delivery).toLocaleDateString()}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Price</span>
                      <p className="text-2xl font-display font-black text-[#1a4731]">{formatPrice(Number(order.total_price || order.amount || 0))}</p>
                    </div>
                  </div>

                  {/* Inline Mini Timeline */}
                  {(() => {
                    const miniSteps = [
                      { id: 'pending', label: 'Placed' },
                      { id: 'confirmed', label: 'Confirmed' },
                      { id: 'processing', label: 'Processing' },
                      { id: 'packed', label: 'Packed' },
                      { id: 'shipped', label: 'Shipped' },
                      { id: 'delivered', label: 'Delivered' },
                    ];
                    const currentIdx = miniSteps.findIndex(s => s.id === order.status);
                    const isTerminal = ['cancelled', 'returned', 'refunded'].includes(order.status);
                    return (
                      <div className="bg-white border border-slate-100 rounded-2xl p-4">
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {miniSteps.map((step, idx) => {
                            const isCompleted = currentIdx >= 0 && idx <= currentIdx;
                            const isCurrent = currentIdx === idx;
                            return (
                              <React.Fragment key={step.id}>
                                <div className={cn(
                                  "flex flex-col items-center gap-1 min-w-[52px] px-1",
                                  isTerminal && "opacity-40"
                                )}>
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all",
                                    isCurrent ? "bg-[#1a4731] border-[#1a4731] text-white animate-pulse" :
                                    isCompleted ? "bg-emerald-100 border-emerald-300 text-emerald-700" :
                                    "bg-slate-50 border-slate-200 text-slate-400"
                                  )}>
                                    {isCompleted && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                                  </div>
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-wider text-center leading-tight",
                                    isCurrent ? "text-[#1a4731]" : isCompleted ? "text-emerald-600" : "text-slate-400"
                                  )}>
                                    {step.label}
                                  </span>
                                </div>
                                {idx < miniSteps.length - 1 && (
                                  <div className={cn(
                                    "flex-1 h-0.5 min-w-[12px] rounded-full mt-[-14px]",
                                    isCompleted && idx < currentIdx ? "bg-emerald-300" : "bg-slate-200"
                                  )} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                        {isTerminal && (
                          <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-red-500">
                            Order {order.status}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Action Bar */}
                  <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => setCancelModalId(order.id)}
                          className="h-11 px-6 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                      {returnEligible && (
                        <button 
                          onClick={() => setReturnModalId(order.id)}
                          className="h-11 px-6 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" /> Request Return
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                      <Link 
                        href={`/orders/invoice/${order.id}`} 
                        target="_blank"
                        className="inline-flex items-center gap-1.5 h-11 px-6 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Invoice
                      </Link>
                      <Link 
                        href={`/track-order?order=${order.id}`}
                        className="inline-flex items-center gap-2 h-11 px-8 bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-2xl text-xs font-bold shadow-lg shadow-forest-900/10 transition-all"
                      >
                        Track Order <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancelModalId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-xl font-bold">Cancel Order #{cancelModalId}</h3>
              </div>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Are you sure you want to cancel this order? This action will replenish stock immediately and cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Reason for cancellation</label>
                <textarea 
                  placeholder="e.g. Changed my mind, Ordered by mistake..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#1a4731] transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => { setCancelModalId(null); setCancelReason(''); }}
                  className="h-12 px-6 rounded-2xl border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="h-12 px-6 bg-red-600 text-white rounded-2xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {returnModalId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-slate-800">
                <CornerUpLeft className="h-6 w-6 text-[#1a4731]" />
                <h3 className="text-xl font-bold">Request Return</h3>
              </div>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                You can request a return for this order. Returns are subject to inspection and approval by Horof Admins.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Reason for Return</label>
                <textarea 
                  placeholder="Please describe why you are returning this item (e.g. damaged, wrong size)..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-28 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#1a4731] transition-all resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => { setReturnModalId(null); setReturnReason(''); }}
                  className="h-12 px-6 rounded-2xl border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestReturn}
                  disabled={returnLoading}
                  className="h-12 px-8 bg-[#1a4731] text-white rounded-2xl text-xs font-bold hover:bg-[#2d6a4f] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {returnLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
