'use client';

import React, { useEffect, useState } from 'react';
import { Package, Clock, Truck, CheckCircle, XCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import Link from 'next/link';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data.map(o => ({
        ...o,
        amount: o.total_price ?? 0
      })));
    }
    setLoading(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return; // Already fetched

    const { data } = await supabase
      .from('order_items')
      .select('*, products(name, images)')
      .eq('order_id', orderId);

    if (data) {
      setOrderItems(prev => ({ ...prev, [orderId]: data }));
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      fetchOrderItems(orderId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold"><Clock className="h-3 w-3" /> Pending</span>;
      case 'processing': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold"><Package className="h-3 w-3" /> Processing</span>;
      case 'shipped': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold"><Truck className="h-3 w-3" /> Shipped</span>;
      case 'delivered': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E6F0EB] text-[#1B4332] text-xs font-bold"><CheckCircle className="h-3 w-3" /> Delivered</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">Track, return, or buy items again.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading your orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Package className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No orders yet</h3>
            <p className="text-slate-500 mb-6">Looks like you haven't made your first purchase yet.</p>
            <Link href="/" className="px-6 py-3 bg-[#1B4332] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col">
                {/* Order Summary Row */}
                <div 
                  onClick={() => toggleOrderDetails(order.id)}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Order Placed</p>
                      <p className="text-sm font-medium text-slate-900">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total</p>
                      <p className="text-sm font-medium text-slate-900">{formatPrice(Number(order.amount))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Status</p>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Order #</p>
                      <p className="text-sm font-medium text-slate-900 font-mono">{order.id.split('-')[0].toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end shrink-0 text-slate-400">
                    {expandedOrderId === order.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order.id && (
                  <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Items in your order</h3>
                      
                      {!orderItems[order.id] ? (
                        <p className="text-sm text-slate-500">Loading items...</p>
                      ) : (
                        <div className="space-y-4">
                          {orderItems[order.id].map(item => (
                            <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
                              <div className="h-16 w-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                {item.products?.images?.[0] ? (
                                  <img src={item.products.images[0]} alt={item.products.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-slate-400"><Package className="h-5 w-5" /></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <Link href={`/product/${item.products?.slug}`} className="text-sm font-bold text-slate-900 hover:text-[#1B4332] transition-colors">
                                  {item.products?.name}
                                </Link>
                                <p className="text-sm text-slate-500 mt-1">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900">{formatPrice(Number(item.unit_price))}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Shipping Address</h4>
                        {order.shipping_address ? (
                          <div className="text-sm text-slate-700">
                            <p>{order.shipping_address.street}</p>
                            <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                            <p>{order.shipping_address.country}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No address saved for this order.</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Order Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatPrice(Number(order.amount))}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Shipping</span>
                            <span>Free</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
                            <span>Total</span>
                            <span>{formatPrice(Number(order.amount))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
