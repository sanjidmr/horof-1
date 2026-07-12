'use client';

import React, { useEffect, useState } from 'react';
import { Search, Eye, Filter, CheckCircle, Clock, Truck, XCircle, PackageOpen } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatPrice, cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    // Find the current order to get previous status
    const currentOrder = orders.find(o => String(o.id) === String(id)) || selectedOrder;
    const prevStatus = currentOrder?.status;

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }

    // Handle stock replenishment when order is returned
    if (newStatus === 'returned' && prevStatus !== 'returned') {
      // Fetch order items and add stock back
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);

      if (items && items.length > 0) {
        for (const item of items) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Number(product.stock || 0) + Number(item.quantity || 0) })
              .eq('id', item.product_id);
          }
        }
        toast.success('Stock replenished for returned items!');
      } else {
        // Try to get items from product_details if no order_items rows
        const order = orders.find(o => String(o.id) === String(id)) || selectedOrder;
        const pdItems = Array.isArray(order?.product_details) ? order.product_details : [];
        for (const item of pdItems) {
          if (!item.product_id) continue;
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Number(product.stock || 0) + Number(item.quantity || 0) })
              .eq('id', item.product_id);
          }
        }
      }
    } else if (prevStatus === 'returned' && newStatus !== 'returned') {
      // Deduct stock again if reverting from returned
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', id);

      if (items) {
        for (const item of items) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          if (product) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0)) })
              .eq('id', item.product_id);
          }
        }
      }
    }

    toast.success('Order status updated');
    fetchOrders();
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setItemsLoading(true);
    const { data, error } = await supabase
      .from('order_items')
      .select('*, products(name, images)')
      .eq('order_id', order.id);
      
    if (!error) {
      setOrderItems(data || []);
    }
    setItemsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold"><Clock className="h-3 w-3" /> Pending</span>;
      case 'processing': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold"><PackageOpen className="h-3 w-3" /> Processing</span>;
      case 'shipped': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold"><Truck className="h-3 w-3" /> Shipped</span>;
      case 'delivered': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E6F0EB] text-[#1B4332] text-xs font-bold"><CheckCircle className="h-3 w-3" /> Delivered</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold"><XCircle className="h-3 w-3" /> Cancelled</span>;
      case 'returned': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-bold"><XCircle className="h-3 w-3" /> Returned</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">Manage order fulfillment and shipping.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2D6A4F]" />
            <input 
              placeholder="Search by order ID or customer..." 
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition-all"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter Status
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-500">
                      {String(order.id).split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{order.customer_name || order.profiles?.full_name || 'Guest User'}</p>
                      <p className="text-xs text-slate-500">{order.customer_email || order.profiles?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatPrice(Number(order.total_price || order.amount || 0))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button onClick={() => openOrderDetails(order)} variant="ghost" size="sm" className="text-[#2D6A4F] hover:bg-[#E6F0EB]">
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Order #{String(selectedOrder.id).split('-')[0].toUpperCase()}</h2>
                <p className="text-sm text-slate-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}>
                <XCircle className="h-6 w-6 text-slate-400" />
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 space-y-6">
              {/* Status Update */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">Current Status</p>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedOrder.status}
                    onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                    className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#2D6A4F]"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returned">Returned (Restores Stock)</option>
                  </select>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-widest">Customer</h3>
                  <p className="text-sm text-slate-700">{selectedOrder.customer_name || selectedOrder.profiles?.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedOrder.customer_email || selectedOrder.profiles?.email}</p>
                  <p className="text-sm text-slate-500">{selectedOrder.customer_phone || selectedOrder.profiles?.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-widest">Shipping Address</h3>
                  <p className="text-sm text-slate-700">{selectedOrder.customer_address || selectedOrder.shipping_address || 'No address provided'}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Order Items</h3>
                <div className="space-y-4">
                  {itemsLoading ? (
                    <p className="text-sm text-slate-500">Loading items...</p>
                  ) : orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
                      <div className="h-12 w-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                        {item.products?.images?.[0] ? (
                          <img src={item.products.images[0]} alt={item.products.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400"><PackageOpen className="h-4 w-4" /></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{item.products?.name}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} x {formatPrice(Number(item.unit_price))}</p>
                      </div>
                      <div className="font-bold text-slate-900">
                        {formatPrice(Number(item.unit_price) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-900">Total Amount</span>
                <span className="text-2xl font-bold text-[#1B4332]">{formatPrice(Number(selectedOrder.total_price || selectedOrder.amount || 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
