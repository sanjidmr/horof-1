'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/ui/Button';
import { formatPrice, cn } from '@/lib/utils';
import { 
  Package, 
  Truck, 
  CreditCard, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronLeft,
  Printer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface OrderDetailViewProps {
  order: any;
  items: any[];
  timeline: any[];
}

const STATUS_OPTIONS = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned'
];

const PAYMENT_STATUS_OPTIONS = [
  'pending',
  'paid',
  'failed',
  'refunded'
];

export function OrderDetailView({ order, items, timeline }: OrderDetailViewProps) {
  if (order) {
    order.amount = order.total_price ?? order.amount ?? 0;
  }
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status || (order.status === 'paid' ? 'paid' : order.status === 'failed' ? 'failed' : 'pending'));
  const [isUpdating, setIsUpdating] = useState(false);
  
  const supabase = createSupabaseBrowserClient();

  const handleUpdateStatus = async (newStatus: string) => {
    const prevStatus = status;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);
      
      if (error) throw error;

      // Add to timeline
      await supabase.from('order_timeline').insert({
        order_id: order.id,
        status: newStatus,
        note: `Status updated to ${newStatus}`
      });

      // Handle stock replenishment when order is returned
      if (newStatus === 'returned' && prevStatus !== 'returned') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', order.id);

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
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
          toast.success('Stock replenished for all returned items!');
        } else {
          // Fallback to product_details JSONB for requests-based orders
          const pdItems = Array.isArray(order.product_details) ? order.product_details : [];
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
        // Re-deduct stock if reverting from returned
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', order.id);

        if (orderItems) {
          for (const item of orderItems) {
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

      setStatus(newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', order.id);
      
      if (error) throw error;

      setPaymentStatus(newStatus);
      toast.success(`Payment status updated to ${newStatus}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{order.order_number || `#${order.id.slice(0, 8)}`}</h1>
              <Badge variant="secondary" className="capitalize">{status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Printer size={16} />
            Invoice
          </Button>
          <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50" onClick={() => handleUpdateStatus('cancelled')}>
            Cancel Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Order Items */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Package size={16} />
                Order Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/30 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    <th className="px-6 py-3 text-left">Product</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    // Find matching product details in order.product_details
                    const matchingDetail = Array.isArray(order.product_details)
                      ? order.product_details.find((d: any) => String(d.product_id) === String(item.product_id))
                      : null;
                      
                    const specs = matchingDetail?.selectedSpecs || item.selectedSpecs;
                    const notes = matchingDetail?.customerNotes || item.customerNotes;
                    const designCharge = matchingDetail?.designCharge || item.designCharge;

                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                              <img src={item.product?.image_url || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.product?.name || 'Unknown Product'}</div>
                              <div className="text-xs text-slate-500">
                                {item.variant?.size && `Size: ${item.variant.size}`} {item.variant?.color && `Color: ${item.variant.color}`}
                              </div>
                              {/* Render custom specifications */}
                              {specs && Object.keys(specs).length > 0 && (
                                <div className="mt-1.5 p-2 bg-emerald-50/30 border border-emerald-100/50 rounded-lg space-y-0.5 max-w-md">
                                  <div className="text-[10px] font-black text-[#1B4332] uppercase tracking-wider">Specifications:</div>
                                  {Object.entries(specs).map(([key, val]) => (
                                    <div key={key} className="text-xs text-slate-700">
                                      <span className="font-bold">{key}:</span> {val as string}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Render custom item notes */}
                              {notes && (
                                <div className="mt-1 text-xs text-amber-700 font-medium">
                                  <span className="font-bold text-amber-800">Note:</span> {notes}
                                </div>
                              )}
                              {/* Render design charge */}
                              {designCharge && designCharge > 0 ? (
                                <div className="mt-0.5 text-xs text-[#2D6A4F] font-bold">
                                  + Design Charge: {formatPrice(designCharge)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 text-right">{formatPrice(item.price)}</td>
                        <td className="px-6 py-4 text-right font-bold text-accent-primary">{formatPrice(item.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-6 bg-slate-50/30 border-t flex flex-col items-end gap-2">
                <div className="flex justify-between w-full max-w-[200px] text-xs text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatPrice(Number(order.amount))}</span>
                </div>
                <div className="flex justify-between w-full max-w-[200px] text-xs text-slate-500">
                  <span>Delivery Charge:</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between w-full max-w-[200px] text-lg font-bold text-slate-900 mt-2">
                  <span>Total:</span>
                  <span className="text-accent-primary">{formatPrice(Number(order.amount))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {timeline.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {timeline.map((t, idx) => (
                    <div key={t.id} className="relative pl-8">
                      <div className={cn(
                        "absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-2",
                        idx === timeline.length - 1 ? "bg-accent-primary ring-accent-primary/20" : "bg-slate-200 ring-slate-100"
                      )} />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-slate-900 capitalize">{t.status}</div>
                          {t.note && <div className="text-xs text-slate-500 mt-1">{t.note}</div>}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No timeline events yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Status Update */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Update Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Status</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
                  value={status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  disabled={isUpdating}
                >
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Status</label>
                <select 
                  className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
                  value={paymentStatus}
                  onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                  disabled={isUpdating}
                >
                  {PAYMENT_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Shipping */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{order.customer_name || order.full_name || 'Guest User'}</div>
                  <div className="text-xs text-slate-500">{order.customer_email || order.email || '—'}</div>
                  <div className="text-xs text-slate-500">{order.customer_phone || order.phone || '—'}</div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shipping Address</div>
                    <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {order.customer_address || order.shipping_address || 'No address provided'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard size={18} className="text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Info</div>
                    <div className="text-xs text-slate-700 mt-1 capitalize">
                      {order.payment_method || 'SSLCommerz'}
                      {order.transaction_id && <div className="font-mono text-accent-primary mt-1">Trx: {order.transaction_id}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {order.note && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">Customer Note</div>
                  <div className="text-xs text-amber-900">{order.note}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
