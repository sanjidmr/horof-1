'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  ShoppingBag,
  Download,
  XCircle,
  HelpCircle,
  Undo2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { cancelOrderAction, requestOrderReturnAction, getOrderTrackingData } from '@/lib/actions/orders';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import Link from 'next/link';
import toast from 'react-hot-toast';

// 10-step timeline
const TIMELINE_STEPS = [
  { id: 'placed', label: 'Order Placed', desc: 'Your order has been recorded in our system.' },
  { id: 'paid', label: 'Payment Confirmed', desc: 'We have verified your payment transaction.' },
  { id: 'confirmed', label: 'Order Confirmed', desc: 'Admin has verified and approved your order.' },
  { id: 'processing', label: 'Processing', desc: 'Craftsmen are working on your custom piece.' },
  { id: 'packed', label: 'Packed', desc: 'Items are securely wrapped and placed in protective cases.' },
  { id: 'ready_for_pickup', label: 'Ready for Pickup', desc: 'Courier agent has been dispatched to pick up the parcel.' },
  { id: 'shipped', label: 'Shipped', desc: 'Parcel has departed our fulfillment warehouse.' },
  { id: 'in_transit', label: 'In Transit', desc: 'Parcel is travelling to your local delivery hub.' },
  { id: 'out_for_delivery', label: 'Out for Delivery', desc: 'Local delivery agent is delivering your parcel today.' },
  { id: 'delivered', label: 'Delivered', desc: 'Parcel has been successfully handed over to you.' }
];

export default function TrackOrderPage() {
  const supabase = createSupabaseBrowserClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cancellation & Return Dialog States
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // Auto-fill query parameter if loaded from orders list
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get('order');
      if (orderId) {
        setOrderNumber(orderId);
        // Automatically perform search if user is logged in
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.email) {
            setEmail(user.email);
            fetchOrderDetails(orderId, user.email);
          }
        });
      }
    }
  }, []);

  const fetchOrderDetails = async (idOrTrx: string, userEmail: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const result = await getOrderTrackingData(idOrTrx, userEmail);
      if (result.order) {
        setOrder(result.order);
        setTimelineEvents(result.timeline);
      } else {
        setError("We couldn't find an order with those details. Please check the Order Number and Email.");
      }
    } catch (err: any) {
      setError(err.message || "We couldn't find an order with those details. Please check the Order Number and Email.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      toast.error('Please fill in both fields.');
      return;
    }
    fetchOrderDetails(orderNumber, email);
  };

  // Determine if a timeline step is active, completed, or pending
  const getStepStatus = (stepId: string) => {
    if (!order) return 'pending';
    
    const statusMap: Record<string, number> = {
      pending: 0,
      placed: 0,
      confirmed: 2,
      processing: 3,
      packed: 4,
      ready_for_pickup: 5,
      shipped: 6,
      in_transit: 7,
      out_for_delivery: 8,
      delivered: 9,
      cancelled: -1,
      returned: -2,
      refunded: -3
    };

    const currentStatusVal = statusMap[order.status?.toLowerCase()] ?? 0;
    
    // Exception states
    if (currentStatusVal < 0) {
      return 'pending'; // Remain grayed out if exception
    }

    if (stepId === 'paid') {
      return order.payment_status?.toLowerCase() === 'paid' ? 'completed' : 
             (currentStatusVal >= 2 ? 'active' : 'pending');
    }

    const stepVal = statusMap[stepId] ?? 0;
    if (currentStatusVal > stepVal) return 'completed';
    if (currentStatusVal === stepVal) return 'active';
    return 'pending';
  };

  // Cancel order handler
  const handleCancelClick = async () => {
    setCancelLoading(true);
    try {
      const res = await cancelOrderAction(order.id, cancelReason, 'customer');
      if (res.success) {
        toast.success('Order cancelled successfully.');
        setOrder((prev: any) => ({ ...prev, status: 'cancelled' }));
        setCancelOpen(false);
        setCancelReason('');
        // Refresh timeline
        const { data } = await supabase
          .from('order_timeline')
          .select('*')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        setTimelineEvents(data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Request Return handler
  const handleReturnClick = async () => {
    if (!returnReason.trim()) {
      toast.error('Please enter a return reason.');
      return;
    }
    setReturnLoading(true);
    try {
      const res = await requestOrderReturnAction(order.id, returnReason);
      if (res.success) {
        toast.success('Return requested.');
        // Update local state
        setOrder((prev: any) => {
          const { items, metadata } = parseProductDetails(prev.product_details);
          metadata.return_status = 'Requested';
          metadata.return_reason = returnReason;
          return { ...prev, product_details: [...items, { ...metadata, is_metadata: true }] };
        });
        setReturnOpen(false);
        setReturnReason('');
        // Refresh timeline
        const { data } = await supabase
          .from('order_timeline')
          .select('*')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        setTimelineEvents(data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to request return.');
    } finally {
      setReturnLoading(false);
    }
  };

  const getFulfillmentEligibility = () => {
    if (!order) return false;
    if (order.status !== 'delivered') return false;
    const deliveryDate = new Date(order.updated_at || order.created_at);
    const differenceInDays = (Date.now() - deliveryDate.getTime()) / (1000 * 3600 * 24);
    
    const { metadata } = parseProductDetails(order.product_details);
    const returnStatus = metadata.return_status || 'None';
    
    return differenceInDays <= 7 && returnStatus === 'None';
  };

  const { items: metaItems, metadata } = order ? parseProductDetails(order.product_details) : { items: [], metadata: {} };
  const itemsList = order ? (order.order_items && order.order_items.length > 0 ? order.order_items : metaItems) : [];

  return (
    <div className="min-h-screen bg-slate-50/50 pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Page title */}
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-medium text-[#1a4731] leading-tight">
            Order <span className="italic text-slate-500 font-light">Journey</span>
          </h1>
          <p className="text-slate-500 font-light text-base max-w-md mx-auto">
            Input your details to monitor the fabrication and shipping timeline of your bespoke signs.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!order ? (
            /* Search Form Card */
            <motion.div 
              key="search-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm"
            >
              <form onSubmit={handleTrackSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Number</Label>
                  <Input 
                    id="orderNumber"
                    placeholder="e.g. ORD-M4K2PXN"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-[#1a4731] transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-[#1a4731] transition-all"
                    required
                  />
                </div>
                
                {error && (
                  <div className="flex gap-2 text-xs text-red-500 font-medium bg-red-50 p-4 rounded-2xl border border-red-100">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-[#1a4731] text-white hover:bg-[#2d6a4f] shadow-lg shadow-forest-900/10 cursor-pointer text-xs font-bold uppercase tracking-widest"
                >
                  {loading ? 'Locating Journey...' : 'Track Journey'}
                  {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>
              </form>
            </motion.div>
          ) : (
            /* Journey Tracking Panel */
            <motion.div 
              key="journey-panel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
            >
              {/* Back Link */}
              <button 
                onClick={() => { setOrder(null); setError(null); }}
                className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Track another order
              </button>

              {/* Status Header Banner */}
              <div className={cn(
                "rounded-[2.5rem] p-10 md:p-12 text-white relative overflow-hidden shadow-sm",
                order.status === 'cancelled' ? 'bg-red-950/90 border border-red-900' :
                order.status === 'returned' || order.status === 'refunded' ? 'bg-slate-900 border border-slate-800' :
                'bg-[#1a4731]'
              )}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 block mb-1">Fulfillment Status</span>
                      <h2 className="text-3xl md:text-5xl font-display font-medium capitalize italic">{order.status}</h2>
                    </div>
                    
                    <div className="flex flex-wrap gap-8 pt-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block mb-0.5">Order ID</span>
                        <span className="text-sm font-mono font-bold">#{order.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block mb-0.5">Items</span>
                        <span className="text-sm font-bold">{itemsList.length} Custom Pieces</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 items-center">
                    <div className="h-16 w-px bg-white/20 hidden md:block" />
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block">Shipping Location</span>
                      <p className="text-xs font-medium leading-relaxed max-w-[240px] whitespace-pre-line text-white/90">{order.customer_address}</p>
                    </div>
                  </div>
                </div>

                {/* Exception banners */}
                {order.status === 'cancelled' && (
                  <div className="mt-8 pt-6 border-t border-red-900 flex items-center gap-3 text-red-200 text-xs">
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                    <p>This order was cancelled. Any processed payment will be refunded within 3-5 business days.</p>
                  </div>
                )}
                {metadata.return_status && metadata.return_status !== 'None' && (
                  <div className="mt-8 pt-6 border-t border-emerald-950/30 flex items-center gap-3 text-white/80 text-xs">
                    <Undo2 className="h-5 w-5 flex-shrink-0" />
                    <p>Return Status: <span className="font-bold text-white uppercase">{metadata.return_status}</span> {metadata.return_reason && ` - Reason: ${metadata.return_reason}`}</p>
                  </div>
                )}
              </div>

              {/* Courier info card */}
              {(metadata.courier_name || metadata.estimated_delivery) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {metadata.courier_name && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                      <div className="h-12 w-12 bg-slate-50 text-[#1a4731] rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Truck size={24} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Courier Logistics</span>
                        <h4 className="text-sm font-bold text-slate-800">{metadata.courier_name}</h4>
                        {metadata.tracking_number && (
                          <p className="text-xs font-mono text-slate-500 mt-0.5">Track ID: {metadata.tracking_number}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {metadata.estimated_delivery && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
                      <div className="h-12 w-12 bg-slate-50 text-[#1a4731] rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Estimated Delivery</span>
                        <h4 className="text-sm font-bold text-slate-800">
                          {new Date(metadata.estimated_delivery).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">Date subject to courier timelines.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Timeline & Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Timeline */}
                <div className="lg:col-span-2 space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 border-slate-50">
                    <Clock size={18} className="text-[#1a4731]" /> Real-Time Journey
                  </h3>
                  
                  <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {TIMELINE_STEPS.map((step) => {
                      const status = getStepStatus(step.id);
                      
                      return (
                        <div key={step.id} className="flex gap-6 relative items-start">
                          {/* Dot / Checkmark */}
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-sm ring-2 z-10 transition-colors flex-shrink-0",
                            status === 'completed' ? 'bg-emerald-600 ring-emerald-100 text-white' :
                            status === 'active' ? 'bg-[#1a4731] ring-[#1a4731]/10 text-white' :
                            'bg-slate-100 ring-slate-50 text-slate-400'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                status === 'active' ? 'bg-white animate-pulse' : 'bg-slate-300'
                              )} />
                            )}
                          </div>
                          
                          {/* Label/Desc */}
                          <div className="pt-0.5">
                            <h4 className={cn(
                              "text-sm font-bold capitalize",
                              status === 'active' ? 'text-[#1a4731]' :
                              status === 'completed' ? 'text-slate-800' : 'text-slate-400'
                            )}>
                              {step.label}
                            </h4>
                            <p className="text-xs text-slate-500 font-light mt-0.5">{step.desc}</p>
                            
                            {/* Fetch exact log entry matching this status, if any */}
                            {timelineEvents
                              .filter(e => e.status?.toLowerCase() === step.id)
                              .map(event => (
                                <div key={event.id} className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 max-w-sm">
                                  <p className="text-[10px] text-slate-500 leading-relaxed font-light">{event.note || 'Status updated.'}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-1">{new Date(event.created_at).toLocaleString()}</p>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collection Summaries */}
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4 border-slate-50">
                      <ShoppingBag size={18} className="text-[#1a4731]" /> Items Ordered
                    </h3>
                    
                    <div className="space-y-4">
                      {itemsList.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border flex-shrink-0 flex items-center justify-center">
                            {item.products?.images?.[0] || item.product?.images?.[0] ? (
                              <img src={item.products?.images?.[0] || item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="text-slate-300 h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{item.products?.name || item.name}</h4>
                            <p className="text-[10px] text-slate-400 font-light mt-0.5">Qty: {item.quantity} x {formatPrice(Number(item.price || item.unit_price))}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatPrice(Number(order.total_price || order.amount))}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Shipping</span>
                        <span>{order.delivery_charge > 0 ? formatPrice(order.delivery_charge) : 'Free'}</span>
                      </div>
                      {metadata.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Discount</span>
                          <span>-{formatPrice(Number(metadata.discount))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t">
                        <span>Total Collection</span>
                        <span className="text-[#1a4731]">{formatPrice(Number(order.total_price || order.amount))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions card */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                    <Link 
                      href={`/orders/invoice/${order.id}`}
                      target="_blank"
                      className="w-full h-12 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Download size={14} /> Download invoice
                    </Link>
                    
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => setCancelOpen(true)}
                        className="w-full h-12 bg-red-50 text-red-600 hover:bg-red-100/70 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-red-100"
                      >
                        Cancel order
                      </button>
                    )}

                    {getFulfillmentEligibility() && (
                      <button 
                        onClick={() => setReturnOpen(true)}
                        className="w-full h-12 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
                      >
                        Request return
                      </button>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-[2rem] p-6 flex gap-4 items-center">
                    <ShieldCheck size={28} className="text-green-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-green-950 uppercase tracking-wider">Quality Assured</h4>
                      <p className="text-[10px] text-green-700 font-light mt-0.5 leading-relaxed">
                        Every Horof sign undergoes strict structural checks for materials and neon illumination.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Confirmation Modal */}
        {cancelOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-xl font-bold">Cancel Order</h3>
              </div>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Confirm order cancellation? The payment status will be updated, and inventory slots will be replenished.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Cancellation Reason</label>
                <textarea 
                  placeholder="Tell us why you are cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#1a4731] transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => { setCancelOpen(false); setCancelReason(''); }}
                  className="h-12 px-6 rounded-2xl border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={handleCancelClick}
                  disabled={cancelLoading}
                  className="h-12 px-6 bg-red-600 text-white rounded-2xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {cancelLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Request Modal */}
        {returnOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-slate-800">
                <Undo2 className="h-6 w-6 text-[#1a4731]" />
                <h3 className="text-xl font-bold">Request Return</h3>
              </div>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Provide a reason to return your delivered goods. The request will be reviewed by admin.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Return Reason</label>
                <textarea 
                  placeholder="Detail the issues with the product..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-28 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 outline-none focus:bg-white focus:border-[#1a4731] transition-all resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => { setReturnOpen(false); setReturnReason(''); }}
                  className="h-12 px-6 rounded-2xl border text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={handleReturnClick}
                  disabled={returnLoading}
                  className="h-12 px-8 bg-[#1a4731] text-white rounded-2xl text-xs font-bold hover:bg-[#2d6a4f] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {returnLoading ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
