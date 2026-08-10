'use client';

import React, { useState, useEffect } from 'react';
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
  Printer,
  FileText,
  Save,
  Mail,
  MessageSquare,
  AlertCircle,
  Warehouse,
  RotateCcw,
  ImageIcon,
  Tag,
  FileEdit,
  Globe,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  updateOrderStatusAction,
  assignCourierAction,
  updateOrderNotesAction,
  handleReturnAction,
  handleRefundAction,
  cancelOrderAction,
} from '@/lib/actions/orders';
import { assignWarehouseToOrder } from '@/lib/actions/admin/order-workflow';
import { parseProductDetails } from '@/lib/utils/order-helpers';

interface OrderDetailViewProps {
  order: any;
  items: any[];
  timeline: any[];
}

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'ready_for_pickup',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

const COURIERS = [
  'None',
  'Steadfast',
  'Pathao Courier',
  'RedX',
  'Paperfly',
  'Sundarban',
  'Manual',
];

export function OrderDetailView({ order: initialOrder, items, timeline: initialTimeline }: OrderDetailViewProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [order, setOrder] = useState(initialOrder);
  const [timeline, setTimeline] = useState(initialTimeline);

  // Admin Context
  const [adminName, setAdminName] = useState('Admin');

  // Input states
  const [status, setStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState('');

  const { items: metaItems, metadata } = parseProductDetails(order.product_details);

  // Fallback: if order_items table is empty (e.g. orders created through flows
  // that only persist product_details JSONB), use the parsed product_details
  // so the order summary still shows products, quantity, and specifications.
  const displayItems = items.length > 0 ? items : metaItems;

  // Courier States
  const [courierName, setCourierName] = useState(metadata.courier_name || 'None');
  const [trackingNumber, setTrackingNumber] = useState(metadata.tracking_number || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    metadata.estimated_delivery ? new Date(metadata.estimated_delivery).toISOString().substring(0, 10) : ''
  );

  // Notes States
  const [internalNotes, setInternalNotes] = useState(metadata.internal_notes || '');
  const [customerNotes, setCustomerNotes] = useState(metadata.customer_notes || '');

  // Returns / Refund states
  const [returnRejectNote, setReturnRejectNote] = useState('');
  const [refundRejectNote, setRefundRejectNote] = useState('');

  // Notification simulation
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  // Warehouse Assignment states
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(order.warehouse_id || '');
  const [warehouseNotes, setWarehouseNotes] = useState(order.warehouse_notes || '');

  // Fetch warehouses list
  useEffect(() => {
    supabase.from('warehouses').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setWarehouses(data);
    });
  }, []);

  // Warehouse Assignment handler
  const handleAssignWarehouse = async () => {
    if (!selectedWarehouseId) {
      toast.error('Please select a warehouse.');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await assignWarehouseToOrder(order.id, selectedWarehouseId, warehouseNotes, adminName);
      if (res.success) {
        toast.success('Warehouse assigned successfully.');
        setOrder((prev) => ({
          ...prev,
          warehouse_id: selectedWarehouseId,
          warehouse_notes: warehouseNotes,
        }));
        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign warehouse.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch current admin profile on load
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) {
              setAdminName(data.full_name);
            } else if (user.email) {
              setAdminName(user.email.split('@')[0]);
            }
          });
      }
    });
  }, []);

  const refreshTimeline = async () => {
    const { data } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true });
    if (data) setTimeline(data);
  };

  // 1. Update Status Action
  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await updateOrderStatusAction(order.id, newStatus, statusNote, adminName, sendEmail);
      if (res.success) {
        setStatus(newStatus.toLowerCase());
        setOrder((prev) => ({ ...prev, status: newStatus.toLowerCase() }));
        setStatusNote('');
        toast.success(`Order status set to: ${newStatus}`);

        if (sendEmail) toast(`Email notification sent to customer.`, { icon: '📧' });
        if (sendSms) toast(`SMS alert dispatched.`, { icon: '📱' });

        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Courier Assignment Action
  const handleSaveCourier = async () => {
    setIsUpdating(true);
    try {
      const res = await assignCourierAction(
        order.id,
        courierName,
        trackingNumber,
        estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
        adminName
      );
      if (res.success) {
        toast.success('Courier details updated.');
        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update courier.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Generate Tracking Number helper
  const handleGenerateTracking = () => {
    if (courierName === 'None') {
      toast.error('Please select a courier before generating a tracking number.');
      return;
    }
    const rand = Math.floor(100000 + Math.random() * 900000);
    let tracking = '';
    switch (courierName) {
      case 'Steadfast':
        tracking = `STDF-${rand}`;
        break;
      case 'Pathao Courier':
        tracking = `PATHAO-${rand}`;
        break;
      case 'RedX':
        tracking = `REDX-${rand}`;
        break;
      case 'Paperfly':
        tracking = `PFLY-${rand}`;
        break;
      case 'Sundarban':
        tracking = `SNDB-${rand}`;
        break;
      default:
        tracking = `TRK-${rand}`;
    }
    setTrackingNumber(tracking);
    toast.success(`Generated ${courierName} Tracking ID!`);
  };

  // 4. Notes Update Action
  const handleSaveNotes = async (type: 'internal' | 'customer') => {
    setIsUpdating(true);
    try {
      const text = type === 'internal' ? internalNotes : customerNotes;
      const res = await updateOrderNotesAction(order.id, type, text, adminName);
      if (res.success) {
        toast.success(`${type === 'internal' ? 'Internal' : 'Customer'} notes saved.`);
        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. Return Approvals
  const handleReturnDecision = async (approve: boolean) => {
    setIsUpdating(true);
    try {
      const res = await handleReturnAction(order.id, approve, returnRejectNote, adminName);
      if (res.success) {
        toast.success(`Return request ${approve ? 'Approved' : 'Rejected'}.`);
        setOrder((prev) => {
          const { items: itms, metadata: meta } = parseProductDetails(prev.product_details);
          meta.return_status = approve ? 'Approved' : 'Rejected';
          return {
            ...prev,
            status: approve ? 'returned' : prev.status,
            product_details: [...itms, { ...meta, is_metadata: true }],
          };
        });
        setStatus(approve ? 'returned' : status);
        setReturnRejectNote('');
        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process return decision.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 6. Refund Approvals
  const handleRefundDecision = async (approve: boolean) => {
    setIsUpdating(true);
    try {
      const res = await handleRefundAction(order.id, approve, refundRejectNote, adminName);
      if (res.success) {
        toast.success(`Refund request ${approve ? 'Approved' : 'Rejected'}.`);
        setOrder((prev) => {
          const { items: itms, metadata: meta } = parseProductDetails(prev.product_details);
          meta.refund_status = approve ? 'Approved' : 'Rejected';
          return {
            ...prev,
            payment_status: approve ? 'refunded' : prev.payment_status,
            status: approve ? 'refunded' : prev.status,
            product_details: [...itms, { ...meta, is_metadata: true }],
          };
        });
        setRefundRejectNote('');
        await refreshTimeline();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund decision.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 7. General Quick Status Shortcuts
  const triggerShortcutStatus = async (target: string) => {
    await handleUpdateStatus(target);
  };

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed':
        return 'bg-emerald-100 text-[#1B4332] border-[#B7E4C7]';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'packed':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'ready_for_pickup':
        return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-150 text-green-900 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'returned':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Detail Header & Action bars */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => router.push('/admin/orders')}>
            <ChevronLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Order #{order.id}</h1>
              <Badge className={cn('capitalize border font-bold text-xs', getStatusColor(status))} variant="outline">
                {status}
              </Badge>
              {order.original_order_id && (
                <Link
                  href={`/admin/orders/${order.original_order_id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold hover:bg-purple-100 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reorder
                </Link>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Logged by: <span className="font-semibold text-slate-700">{adminName}</span> | Created at:{' '}
              {new Date(order.created_at).toLocaleString()}
            </p>

            {/* Full Order Summary */}
            <div className="mt-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                  <Package size={12} /> Full Order Summary
                </h3>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                  {displayItems.length} {displayItems.length === 1 ? 'Product' : 'Products'} • {displayItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0)} Units
                </span>
              </div>

              {/* Product lines */}
              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  const matchingDetail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                  const productName = item.products?.name || matchingDetail?.product_name || 'Artisan Piece';
                  const qty = Number(item.quantity || 1);
                  const unitPrice = Number(item.unit_price || 0);
                  const design = Number(matchingDetail?.design_charge || matchingDetail?.designCharge || item.designCharge || 0);
                  const lineTotal = (qty * unitPrice) + design;
                  const variant = item.product_variants?.size || item.product_variants?.color 
                    ? [item.product_variants?.size, item.product_variants?.color].filter(Boolean).join(' / ')
                    : '';

                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 bg-white/70 border border-emerald-100/60 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{productName}</p>
                          <p className="text-[9px] text-slate-500">
                            {qty} × {formatPrice(unitPrice)}
                            {variant && <span className="ml-1 text-emerald-600">• {variant}</span>}
                            {design > 0 && <span className="ml-1 text-amber-600">• Design +{formatPrice(design)}</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-emerald-800 flex-shrink-0">{formatPrice(lineTotal)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Order source & meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-100/70">
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Order Source</p>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                    <Globe size={10} className="text-emerald-600" />
                    {order.user_id ? 'Website (Logged In)' : 'Website (Guest Checkout)'}
                  </p>
                </div>
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Payment</p>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5 capitalize">{order.payment_method || 'Cash on Delivery'}</p>
                </div>
                <div className="bg-white/60 rounded-lg px-2.5 py-1.5">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Delivery</p>
                  <p className="text-[10px] font-bold text-slate-700 mt-0.5 capitalize">{order.delivery_type || 'Standard'}</p>
                </div>
              </div>

              {/* Grand total */}
              <div className="flex items-center justify-between bg-emerald-800 text-white rounded-xl px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest">Grand Total</span>
                <span className="text-sm font-black">{formatPrice(Number(order.total_price || order.amount || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Printable views links */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/packing-slip/${order.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 h-11 px-5 border rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <Printer size={15} /> Packing Slip
          </Link>
          <Link
            href={`/admin/orders/${order.id}/print-invoice`}
            target="_blank"
            className="inline-flex items-center gap-2 h-11 px-5 bg-[#1a4731] text-white rounded-xl text-xs font-bold hover:bg-[#2d6a4f] transition-colors"
          >
            <Printer size={15} /> Print Invoice (A5)
          </Link>
          {status !== 'cancelled' && status !== 'returned' && (
            <Button
              variant="outline"
              onClick={() => triggerShortcutStatus('cancelled')}
              disabled={isUpdating}
              className="h-11 px-5 border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Double Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order items lists - Complete Order Summary */}
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-700">
                <Package size={16} className="text-[#1a4731]" /> Product Collections ({items.length})
              </CardTitle>
              <span className="text-[10px] text-slate-400 font-semibold">Order #{String(order.id).slice(0, 8)}</span>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {items.map((item) => {
                const matchingDetail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                const specs = matchingDetail?.specifications || matchingDetail?.selectedSpecs || item.selectedSpecs || {};
                const design = Number(matchingDetail?.design_charge || matchingDetail?.designCharge || item.designCharge || 0);
                const customerNote = matchingDetail?.customer_notes || matchingDetail?.customerNotes || '';
                const itemSubtotal = Number(item.unit_price || 0) * Number(item.quantity || 1);
                const itemTotal = itemSubtotal + design;
                const productImage = item.images?.[0] || null;

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Product Header Row */}
                    <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 bg-white border-b border-slate-50">
                      {/* Product Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={item.products?.name || 'Product'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={24} />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {item.products?.name || matchingDetail?.product_name || 'Artisan Piece'}
                            </h4>
                            {item.products?.sku && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                                <Tag size={10} /> SKU: {item.products.sku}
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-black text-[#1a4731]">{formatPrice(itemTotal)}</p>
                            <p className="text-[9px] text-slate-400 font-semibold">
                              {item.quantity} x {formatPrice(Number(item.unit_price))}
                            </p>
                          </div>
                        </div>

                        {/* All Specifications & Selected Options */}
                        <div className="flex flex-wrap gap-1.5">
                          {/* Variant Info */}
                          {item.product_variants?.size && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-[9px] font-bold text-blue-700">
                              Size: {item.product_variants.size}
                            </span>
                          )}
                          {item.product_variants?.color && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md text-[9px] font-bold text-purple-700">
                              Color: {item.product_variants.color}
                            </span>
                          )}
                          
                          {/* Additional Specifications from product_details */}
                          {specs && typeof specs === 'object' && Object.entries(specs).map(([key, value]) => (
                            <span 
                              key={key}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md text-[9px] font-bold text-emerald-700"
                            >
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>

                        {/* Customer Note */}
                        {customerNote && (
                          <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 mt-2">
                            <p className="text-[10px] text-amber-900 font-medium italic">"{customerNote}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specifications & Details Section */}
                    <div className="px-4 sm:px-5 py-4 space-y-3 bg-white">
                      {/* Design Charge */}
                      {design > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-[#1B4332] bg-[#E6F0EB] px-3 py-1.5 rounded-lg w-fit">
                          <FileEdit size={12} />
                          <span className="font-bold">Design Charge:</span>
                          <span>{formatPrice(design)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Order Totals Summary */}
              <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5">
                <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Order Summary</h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-800">{formatPrice(Number(order.total_price || order.amount || 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Delivery Charge</span>
                    <span className="font-bold text-slate-800">
                      {Number(order.delivery_charge) > 0 ? formatPrice(Number(order.delivery_charge)) : 'Free'}
                    </span>
                  </div>
                  {metadata.discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span>
                        Discount {metadata.coupon_code ? `(${metadata.coupon_code})` : ''}
                      </span>
                      <span className="font-bold">-{formatPrice(metadata.discount)}</span>
                    </div>
                  )}
                  {metadata.coupon_code && metadata.discount === 0 && (
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Coupon Code</span>
                      <span className="font-mono font-bold text-slate-700">{metadata.coupon_code}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-black text-[#1a4731] border-t border-slate-200 pt-3 mt-3">
                    <span>Grand Total</span>
                    <span>{formatPrice(Number(order.total_price || order.amount || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Complete Order Details Summary */}
              <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-slate-700">
                    <FileText size={16} className="text-[#1a4731]" /> Complete Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Order Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Order Information</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Order ID:</span>
                            <span className="font-mono font-bold text-slate-800">{order.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Order Number:</span>
                            <span className="font-bold text-slate-800">{order.order_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Order Date:</span>
                            <span className="font-bold text-slate-800">{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Order Status:</span>
                            <span className="font-bold capitalize text-slate-800">{order.status.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Status:</span>
                            <span className="font-bold capitalize text-slate-800">{order.payment_status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Method:</span>
                            <span className="font-bold text-slate-800">{order.payment_method || 'Cash on Delivery'}</span>
                          </div>
                          {order.transaction_id && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Transaction ID:</span>
                              <span className="font-mono font-bold text-slate-800">{order.transaction_id}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Customer Information</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Customer Name:</span>
                            <span className="font-bold text-slate-800">{order.customer_name || 'Guest'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Customer Email:</span>
                            <span className="font-bold text-slate-800">{order.customer_email || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Customer Phone:</span>
                            <span className="font-bold text-slate-800">{order.customer_phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Delivery Type:</span>
                            <span className="font-bold text-slate-800">{order.delivery_type || 'Standard'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">District:</span>
                            <span className="font-bold text-slate-800">{order.district || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Thana/Area:</span>
                            <span className="font-bold text-slate-800">{order.thana || order.area || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Details Table */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Product Details</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Product</th>
                              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-600">SKU</th>
                              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Variant</th>
                              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Size</th>
                              <th className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Color</th>
                              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Qty</th>
                              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Unit Price</th>
                              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Discount</th>
                              <th className="text-right py-2 px-3 text-[10px] font-bold uppercase text-slate-600">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => {
                              const matchingDetail = metaItems.find((d: any) => String(d.product_id) === String(item.product_id));
                              const specs = matchingDetail?.specifications || matchingDetail?.selectedSpecs || item.selectedSpecs || {};
                              const design = Number(matchingDetail?.design_charge || matchingDetail?.designCharge || item.designCharge || 0);
                              const itemTotal = (Number(item.unit_price || 0) * Number(item.quantity || 1)) + design;

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-3">
                                    <div>
                                      <div className="font-bold text-slate-900">{item.products?.name || matchingDetail?.product_name || 'Product'}</div>
                                      {Object.keys(specs).length > 0 && (
                                        <div className="text-[9px] text-slate-500 mt-1">
                                          {Object.entries(specs).map(([key, value]) => (
                                            <span key={key} className="inline-block mr-2">
                                              {key}: {String(value)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-mono text-slate-600">{item.products?.sku || 'N/A'}</td>
                                  <td className="py-3 px-3 text-slate-600">{item.variant_name || 'N/A'}</td>
                                  <td className="py-3 px-3 text-slate-600">{item.product_variants?.size || item.size || 'N/A'}</td>
                                  <td className="py-3 px-3 text-slate-600">{item.product_variants?.color || item.color || 'N/A'}</td>
                                  <td className="py-3 px-3 text-right font-bold text-slate-800">{item.quantity}</td>
                                  <td className="py-3 px-3 text-right font-bold text-slate-800">{formatPrice(Number(item.unit_price))}</td>
                                  <td className="py-3 px-3 text-right text-slate-600">{formatPrice(Number(item.discount || 0))}</td>
                                  <td className="py-3 px-3 text-right font-black text-[#1a4731]">{formatPrice(itemTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Shipping & Additional Info */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Shipping & Additional Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Shipping Address:</span>
                            <span className="font-bold text-slate-800 text-right max-w-[60%]">{order.customer_address || 'N/A'}</span>
                          </div>
                          {order.shipping_address && typeof order.shipping_address === 'object' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">City:</span>
                                <span className="font-bold text-slate-800">{order.shipping_address.city || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Postal Code:</span>
                                <span className="font-bold text-slate-800">{order.shipping_address.postal_code || 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          {order.tracking_number && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Tracking Number:</span>
                              <span className="font-mono font-bold text-slate-800">{order.tracking_number}</span>
                            </div>
                          )}
                          {order.courier_name && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Courier:</span>
                              <span className="font-bold text-slate-800">{order.courier_name}</span>
                            </div>
                          )}
                          {order.estimated_delivery && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Est. Delivery:</span>
                              <span className="font-bold text-slate-800">{new Date(order.estimated_delivery).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {(order.customer_notes || order.internal_notes || order.admin_notes) && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">Notes</h4>
                        <div className="space-y-2 text-xs">
                          {order.customer_notes && (
                            <div>
                              <span className="text-slate-500 font-semibold">Customer Notes:</span>
                              <p className="text-slate-800 mt-1 bg-amber-50/60 border border-amber-100 rounded-lg p-2 italic">"{order.customer_notes}"</p>
                            </div>
                          )}
                          {order.internal_notes && (
                            <div>
                              <span className="text-slate-500 font-semibold">Internal Notes:</span>
                              <p className="text-slate-800 mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2">{order.internal_notes}</p>
                            </div>
                          )}
                          {order.admin_notes && (
                            <div>
                              <span className="text-slate-500 font-semibold">Admin Notes:</span>
                              <p className="text-slate-800 mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2">{order.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Return & Refund Request Approval Panel */}
          {((metadata.return_status && metadata.return_status === 'Requested') ||
            (metadata.refund_status && metadata.refund_status === 'Requested')) && (
            <Card className="border-red-100 bg-red-50/10 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-red-50/40 border-b border-red-50">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-950 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-700" /> Actions Required: Return / Refund Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Return Request panel */}
                {metadata.return_status === 'Requested' && (
                  <div className="space-y-4 border-b border-red-100/50 pb-6 last:border-0 last:pb-0">
                    <div>
                      <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">Customer Return Reason</span>
                      <p className="text-xs text-slate-700 mt-1 font-medium bg-white p-3 rounded-xl border border-red-100/30 italic">
                        "{metadata.return_reason || 'No reason specified'}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Note for Customer (Approval/Rejection explanation)
                      </label>
                      <input
                        placeholder="e.g. Approved. We will pick up the parcel tomorrow."
                        value={returnRejectNote}
                        onChange={(e) => setReturnRejectNote(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-700"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReturnDecision(false)}
                        disabled={isUpdating}
                        className="h-10 px-4 rounded-xl border border-red-200 text-red-700 bg-white hover:bg-red-50 text-xs font-bold cursor-pointer"
                      >
                        Reject Return Request
                      </button>
                      <button
                        onClick={() => handleReturnDecision(true)}
                        disabled={isUpdating}
                        className="h-10 px-5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 cursor-pointer"
                      >
                        Approve Return & Restore Stock
                      </button>
                    </div>
                  </div>
                )}

                {/* Refund Request panel */}
                {metadata.refund_status === 'Requested' && (
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">Refund Reason / Context</span>
                      <p className="text-xs text-slate-700 mt-1 font-medium bg-white p-3 rounded-xl border border-red-100/30 italic">
                        "{metadata.refund_reason || 'Return approved - pending refund trigger'}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Refund Resolution Note</label>
                      <input
                        placeholder="e.g. Cash refund confirmed."
                        value={refundRejectNote}
                        onChange={(e) => setRefundRejectNote(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-red-700"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRefundDecision(false)}
                        disabled={isUpdating}
                        className="h-10 px-4 rounded-xl border border-red-200 text-red-700 bg-white hover:bg-red-50 text-xs font-bold cursor-pointer"
                      >
                        Reject Refund
                      </button>
                      <button
                        onClick={() => handleRefundDecision(true)}
                        disabled={isUpdating}
                        className="h-10 px-5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 cursor-pointer"
                      >
                        Approve & Mark Refunded
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline displays */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b pb-3 border-slate-50">
                <Clock size={16} className="text-[#1a4731]" /> Dynamic Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {timeline.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {timeline.map((t, idx) => (
                    <div key={t.id} className="relative pl-8">
                      <div
                        className={cn(
                          'absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-2',
                          idx === timeline.length - 1
                            ? 'bg-[#1a4731] ring-[#1a4731]/15 animate-pulse'
                            : 'bg-slate-200 ring-slate-50'
                        )}
                      />
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-slate-800 capitalize">{t.status.replace('_', ' ')}</div>
                          {t.note && <div className="text-[11px] text-slate-500 font-light leading-relaxed">{t.note}</div>}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString()}{' '}
                          {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No tracking entries recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-8">
          {/* Warehouse Assignment */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Warehouse Assignment</CardTitle>
              <Warehouse size={16} className="text-[#1a4731]" />
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {order.warehouse_id && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
                  Assigned: {warehouses.find((w) => w.id === order.warehouse_id)?.name || 'Unknown'}
                  {order.warehouse_status && (
                    <span className="ml-2 text-emerald-500 font-normal">| Status: {order.warehouse_status}</span>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Warehouse</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border bg-white text-xs outline-none focus:border-[#1a4731] cursor-pointer"
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  disabled={isUpdating}
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Warehouse Notes</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-[#1a4731] min-h-[60px] resize-none"
                  value={warehouseNotes}
                  onChange={(e) => setWarehouseNotes(e.target.value)}
                  placeholder="Special instructions for warehouse staff..."
                  disabled={isUpdating}
                />
              </div>
              <Button
                onClick={handleAssignWarehouse}
                disabled={isUpdating || !selectedWarehouseId}
                className="w-full h-11 bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-forest-900/10"
              >
                <Save size={14} /> {order.warehouse_id ? 'Update Assignment' : 'Assign Warehouse'}
              </Button>
            </CardContent>
          </Card>

          {/* Order Status Update Controls */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Fulfillment Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Order Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Order Status</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border bg-white text-xs outline-none focus:border-[#1a4731] cursor-pointer font-medium"
                  value={status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  disabled={isUpdating}
                >
                  {ORDER_STATUSES.map((opt) => (
                    <option key={opt} value={opt} className="capitalize">
                      {opt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transition note input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-50">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Timeline Update Note (Optional)</label>
                <input
                  placeholder="e.g. Quality inspection passed..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full h-10 px-3 border rounded-xl text-xs outline-none focus:border-[#1a4731]"
                />
              </div>

              {/* Send Notifications checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Customer Alerts</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="accent-[#1a4731]"
                    />
                    <Mail size={14} className="text-slate-400" /> Send Email
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                      className="accent-[#1a4731]"
                    />
                    <MessageSquare size={14} className="text-slate-400" /> Send SMS
                  </label>
                </div>
              </div>

              {/* Action Quick Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Quick fulfillment flows</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => triggerShortcutStatus('confirmed')}
                    className="h-9 rounded-lg border hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 cursor-pointer"
                  >
                    Confirm Order
                  </button>
                  <button
                    onClick={() => triggerShortcutStatus('processing')}
                    className="h-9 rounded-lg border hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 cursor-pointer"
                  >
                    Set Processing
                  </button>
                  <button
                    onClick={() => triggerShortcutStatus('packed')}
                    className="h-9 rounded-lg border hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 cursor-pointer"
                  >
                    Set Packed
                  </button>
                  <button
                    onClick={() => triggerShortcutStatus('ready_for_pickup')}
                    className="h-9 rounded-lg border hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 cursor-pointer"
                  >
                    Ready pickup
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Courier Assignment Controls */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Courier Logistics</CardTitle>
              <Truck size={16} className="text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Select Courier Provider</label>
                <select
                  className="w-full h-10 px-3 rounded-xl border bg-white text-xs outline-none cursor-pointer"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                >
                  {COURIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tracking Number</label>
                  {courierName !== 'None' && (
                    <button
                      onClick={handleGenerateTracking}
                      className="text-[9px] font-bold text-[#1a4731] hover:underline cursor-pointer"
                    >
                      Auto-Generate
                    </button>
                  )}
                </div>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. STDF-1928374"
                  className="w-full h-10 px-3 rounded-xl border text-xs outline-none focus:border-[#1a4731]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Est. Delivery Date</label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border text-xs outline-none focus:border-[#1a4731]"
                />
              </div>

              <Button
                onClick={handleSaveCourier}
                disabled={isUpdating}
                className="w-full h-11 bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-forest-900/10"
              >
                <Save size={14} /> Save Logistics
              </Button>
            </CardContent>
          </Card>

          {/* Internal & Customer Notes Editors */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Internal & Customer Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {/* Internal notes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Internal Notes (Warehouse / Staff)</label>
                  <button
                    onClick={() => handleSaveNotes('internal')}
                    disabled={isUpdating}
                    className="text-[10px] font-bold text-[#1a4731] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Save size={10} /> Save
                  </button>
                </div>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Only visible to admin staff..."
                  className="w-full h-20 p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none resize-none text-[11px] focus:bg-white focus:border-[#1a4731] transition-all"
                />
              </div>

              {/* Customer notes */}
              <div className="space-y-2 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer Notes (Invoice print)</label>
                  <button
                    onClick={() => handleSaveNotes('customer')}
                    disabled={isUpdating}
                    className="text-[10px] font-bold text-[#1a4731] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Save size={10} /> Save
                  </button>
                </div>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Notes shown on invoice / customer view..."
                  className="w-full h-20 p-2.5 bg-slate-50/50 border border-slate-200 rounded-xl outline-none resize-none text-[11px] focus:bg-white focus:border-[#1a4731] transition-all"
                />
              </div>
            </CardContent>
          </Card>

          {/* Customer Profile detail Card */}
          <Card className="border-slate-100 shadow-sm rounded-3xl">
            <CardHeader className="bg-slate-50/30">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-xs p-6">
              {/* Profile head */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{order.customer_name || order.profiles?.full_name || 'Guest Checkout'}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{order.customer_email || order.profiles?.email || 'No email'}</p>
                  <p className="text-[10px] text-slate-500">{order.customer_phone || order.profiles?.phone || 'No phone'}</p>
                </div>
              </div>

              {/* Address details */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Shipping Address</span>
                    <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-line">
                      {order.customer_address || 'No shipping address provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CreditCard size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Payment</span>
                    <p className="text-slate-700 mt-1 capitalize">Cash on Delivery</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}