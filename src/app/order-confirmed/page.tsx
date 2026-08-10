'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, ShoppingBag, ArrowRight, MapPin, 
  Phone, User, Calendar, CreditCard, Loader2, Home,
  Clock, Truck, Heart, Mail, Sparkles, Package, Eye
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const supabase = createSupabaseBrowserClient();
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart on page mount to ensure it is empty
    clearCart();

    if (!orderId) {
      router.push('/');
      return;
    }
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // 1. Fetch order
      let { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderErr || !orderData) {
        // Fallback to order_requests
        const { data: reqData, error: reqErr } = await supabase
          .from('order_requests')
          .select('*')
          .eq('id', orderId)
          .single();

        if (reqData) {
          orderData = {
            id: reqData.id,
            created_at: reqData.created_at,
            customer_name: reqData.customer_info?.name || 'Customer',
            customer_email: reqData.customer_info?.email || '',
            customer_phone: reqData.customer_info?.phone || '',
            customer_address: reqData.customer_info?.address || '',
            delivery_charge: reqData.customer_info?.delivery_charge || 0,
            delivery_type: reqData.customer_info?.delivery_type || 'standard',
            payment_method: 'cod',
            status: 'pending_approval',
            total: reqData.final_total_price,
            product_details: reqData.customer_info?.items || [{
              product_id: reqData.product_id,
              name: reqData.product_name,
              quantity: reqData.quantity,
              unit_price: reqData.final_total_price / reqData.quantity,
              selectedSpecs: reqData.selected_specifications,
              designCharge: reqData.design_charge,
              customerNotes: reqData.customer_notes,
              finalTotal: reqData.final_total_price
            }]
          };
        } else {
          console.error('Order fetch error:', orderErr || reqErr);
          setLoading(false);
          return;
        }
      }

      setOrder(orderData);

      // 2. Fetch order items
      if (orderData.status !== 'pending_approval') {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select(`
            *,
            products (
              name,
              price,
              offer_price
            )
          `)
          .eq('order_id', orderId);

        if (!itemsErr && itemsData && itemsData.length > 0) {
          setItems(itemsData);
          return;
        }
      }

      if (orderData.product_details) {
        // Fallback to product_details json column for online orders/requests
        const jsonItems = Array.isArray(orderData.product_details) 
          ? orderData.product_details 
          : [orderData.product_details];
        setItems(jsonItems.map((item: any, index: number) => ({
          id: index,
          quantity: item.quantity || 1,
          unit_price: item.price || item.unit_price || 0,
          products: {
            name: item.name || 'Premium Item'
          }
        })));
      }
    } catch (error) {
      console.error('Error fetching order confirmed data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#1B4332]" />
          <p className="text-sm font-bold text-slate-600">Retrieving your order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 rotate-180" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
            <p className="text-sm text-slate-500 mt-2">We couldn't retrieve an order with ID #{orderId}. Please contact support if you believe this is an error.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4332] text-white font-bold rounded-xl text-sm transition-all hover:bg-[#2D6A4F]">
            <Home className="w-4 h-4" /> Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0);
  const deliveryCharge = Number(order.delivery_charge || 0);
  const total = Number(order.total ?? order.amount ?? (subtotal + deliveryCharge));

  return (
    <div className="min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8 text-slate-900 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Success Card Banner */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-[#1B4332]/5 overflow-hidden relative p-8 md:p-12">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B4332] to-[#40916C]" />
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-[#E6F0EB]/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-6 relative z-10">
            <div className="h-20 w-20 bg-[#E6F0EB] text-[#1B4332] rounded-full flex items-center justify-center mx-auto border border-[#1b4332]/10 relative shadow-sm">
              <div className="absolute inset-0 rounded-full bg-[#E6F0EB] animate-ping opacity-75" />
              <CheckCircle2 className="w-10 h-10 fill-[#1B4332] text-white relative z-10" />
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E6F0EB]/85 text-[#1b4332] rounded-full text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> Order Placed
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-black text-slate-900 leading-tight">Order Confirmed!</h1>
              <p className="text-sm md:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
                Thank you for your purchase! We are thrilled to prepare your premium handmade items.
              </p>
            </div>
            
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono font-bold text-slate-600 shadow-inner">
              Order Number: {order.order_number || `#${String(order.id).substring(0, 8).toUpperCase()}`}
            </div>
          </div>
        </div>

        {/* Stepper Timeline (Next Steps) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1B4332]" />
            What Happens Next
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-[20px] left-8 right-8 h-0.5 bg-slate-100 z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 flex md:flex-col items-center md:text-center gap-4 md:gap-3 bg-white pr-2">
              <div className="w-10 h-10 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm border-4 border-[#E6F0EB] shadow-md shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-slate-955">Order Confirmed</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Order request received</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex md:flex-col items-center md:text-center gap-4 md:gap-3 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm border-2 border-slate-200 shrink-0">
                2
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Processing</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Woodcrafts preparation</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex md:flex-col items-center md:text-center gap-4 md:gap-3 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm border-2 border-slate-200 shrink-0">
                3
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Quality Check</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ensuring premium finish</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex md:flex-col items-center md:text-center gap-4 md:gap-3 bg-white pl-2">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-sm border-2 border-slate-200 shrink-0">
                4
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Doorstep Delivery</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Inspect & pay cash</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Order Summary Receipt */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6 relative">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#1B4332]" />
              Official Receipt
            </h3>
            
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-2 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2.5 first:pt-0">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.products?.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Qty: {item.quantity} @ ৳{Number(item.unit_price).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 shrink-0">
                    ৳{(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-6 space-y-2.5 text-sm font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-800">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="text-slate-800">৳{deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-slate-955 pt-4 border-t border-slate-100 text-lg">
                <span>Total Paid (COD)</span>
                <span className="text-[#1B4332]">৳{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Shipping Info */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Delivery Details
            </h3>
            
            <div className="space-y-5 text-sm font-medium text-slate-700">
              <div className="flex gap-3">
                <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recipient Name</p>
                  <p className="text-slate-800 font-bold mt-0.5">{order.customer_name || 'Customer'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Number</p>
                  <p className="text-slate-800 font-bold mt-0.5">{order.customer_phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Shipping Address</p>
                  <p className="text-slate-800 leading-relaxed font-semibold mt-0.5">{order.customer_address || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Truck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment Method</p>
                  <p className="text-[#1B4332] font-black uppercase mt-0.5">{order.payment_method || 'Cash on Delivery'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={`/track-order?order=${order.order_number || order.id}`}
            className="inline-flex justify-center items-center gap-2 px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Eye className="w-4 h-4" /> Track Order
          </Link>
          <Link href="/" className="inline-flex justify-center items-center gap-2 px-10 py-4 bg-[#1B4332] hover:bg-[#143224] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-[#1B4332]/20 hover:-translate-y-0.5 active:translate-y-0">
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        {/* Support Section */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2 text-center md:text-left z-10">
            <h4 className="font-display font-bold text-lg flex items-center justify-center md:justify-start gap-1.5">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" /> Need help with your delivery?
            </h4>
            <p className="text-xs text-slate-400 max-w-md">If you have any questions about your package or need to adjust your order details, please get in touch.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 z-10 w-full md:w-auto">
            <a href="tel:+8801700000000" className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition-all w-full sm:w-auto justify-center">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Hotline</span>
            </a>
            <a href="mailto:support@horof.com" className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition-all w-full sm:w-auto justify-center">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Email Support</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4332]" />
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}
