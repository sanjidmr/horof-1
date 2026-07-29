'use client';

import React, { useEffect, useState } from 'react';
import { 
  Package, Clock, Truck, CheckCircle2, XCircle, Search, 
  ChevronDown, ChevronUp, Calendar, AlertCircle, ShoppingBag, Eye,
  RotateCcw
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { reorderOrder } from '@/lib/actions/reorder-order';
import toast from 'react-hot-toast';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`customer-orders-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch from orders table
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id);

    // 2. Fetch from order_requests table
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
        is_request: false
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
          products: {
            name: item.name,
            slug: ''
          }
        })) || [{
          id: 0,
          quantity: r.quantity,
          price: r.final_total_price / r.quantity,
          unit_price: r.final_total_price / r.quantity,
          products: {
            name: r.product_name,
            slug: ''
          }
        }]
      }))];
    }

    // Sort by created_at descending
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setOrders(combined);
    setLoading(false);
  };

  const fetchOrderItems = async (orderId: any) => {
    const stringId = String(orderId);
    if (orderItems[stringId]) return; // Already fetched

    // Check if this is a request in our local state
    const requestOrder = orders.find(o => String(o.id) === stringId);
    if (requestOrder && requestOrder.is_request) {
      setOrderItems(prev => ({ ...prev, [stringId]: requestOrder.items }));
      return;
    }

    const { data } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          id,
          name,
          slug,
          price,
          offer_price
        )
      `)
      .eq('order_id', orderId);

    if (data) {
      setOrderItems(prev => ({ ...prev, [stringId]: data }));
    }
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

  const isReorderEligible = (status: string) => {
    return ['delivered', 'completed', 'cancelled', 'refunded', 'returned'].includes(status.toLowerCase());
  };

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200/50',
      pending_approval: 'bg-amber-50 text-amber-700 border-amber-200/50',
      processing: 'bg-blue-50 text-blue-700 border-blue-200/50',
      shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200/50',
      returned: 'bg-slate-100 text-slate-700 border-slate-300/50'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${styles[status] || 'bg-slate-50 text-slate-700'}`}>
        {status === 'pending_approval' ? 'PENDING APPROVAL' : status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">Track and manage your premium purchases.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Clock className="w-8 h-8 animate-spin text-[#1B4332]" />
            <p className="text-sm font-semibold">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center max-w-md mx-auto">
            <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-inner">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-950 mb-2">No orders yet</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">It looks like you haven't made your first purchase. Explore our collection of premium products today!</p>
            <Link href="/" className="px-6 py-3 bg-[#1B4332] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-all uppercase tracking-wider text-xs shadow-lg shadow-[#1b4332]/20">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const stringId = String(order.id);
              const isExpanded = expandedOrderId === stringId;

              return (
                <div key={stringId} className="flex flex-col">
                  {/* Order Summary Row */}
                  <div 
                    onClick={() => toggleOrderDetails(order.id)}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="flex items-center justify-end shrink-0 text-slate-400">
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-[#1B4332]" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-6 space-y-6">
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Items in your order</h3>
                        
                        {!orderItems[stringId] ? (
                          <div className="py-4 text-center">
                            <Clock className="w-5 h-5 animate-spin text-[#1B4332] mx-auto" />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {orderItems[stringId].map(item => (
                              <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow transition-shadow">
                                <div className="h-12 w-12 rounded-xl bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center shrink-0 border border-[#1b4332]/5">
                                  <Package className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link href={`/products/${item.products?.slug}`} className="text-sm font-bold text-slate-800 hover:text-[#1B4332] transition-colors truncate block">
                                    {item.products?.name || 'Premium Item'}
                                  </Link>
                                  <p className="text-xs text-slate-400 mt-0.5">Quantity: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-slate-900">৳{Number(item.price ?? item.unit_price ?? 0).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Shipping Address */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Delivery Information</h4>
                          <div className="text-xs font-medium text-slate-700 space-y-1">
                            {order.customer_name && <p className="font-bold text-slate-900">{order.customer_name}</p>}
                            {order.customer_address ? (
                              <p className="leading-relaxed">{order.customer_address}</p>
                            ) : order.shipping_address ? (
                              typeof order.shipping_address === 'string' ? (
                                <p className="leading-relaxed">{order.shipping_address}</p>
                              ) : (
                                <p className="leading-relaxed">
                                  {order.shipping_address.street || order.shipping_address.address_line || ''}<br/>
                                  {order.shipping_address.city || ''}
                                </p>
                              )
                            ) : (
                              <p className="text-slate-400 italic">No delivery address saved.</p>
                            )}
                            {order.customer_phone && <p className="text-slate-500 font-bold mt-2">Phone: {order.customer_phone}</p>}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Order Summary</h4>
                          <div className="space-y-2 text-xs font-semibold">
                            <div className="flex justify-between text-slate-500">
                              <span>Subtotal</span>
                              <span>৳{Number(order.amount - (order.delivery_charge ?? 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Delivery Charge</span>
                              <span>৳{Number(order.delivery_charge ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Payment Status</span>
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

                      {!order.is_request && isReorderEligible(order.status) && (
                        <button
                          onClick={() => handleReorder(order.id)}
                          disabled={reorderLoading === String(order.id)}
                          className="w-full h-11 rounded-2xl bg-[#1a4731] text-white text-xs font-bold hover:bg-[#2d6a4f] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {reorderLoading === String(order.id) ? (
                            <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Reordering...</>
                          ) : (
                            <><RotateCcw className="h-4 w-4" /> Reorder This Order</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
