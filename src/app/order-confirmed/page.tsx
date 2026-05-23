'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, ShoppingBag, ArrowRight, MapPin, 
  Phone, User, Calendar, CreditCard, Loader2, Home 
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
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderErr || !orderData) {
        console.error('Order fetch error:', orderErr);
        setLoading(false);
        return;
      }

      setOrder(orderData);

      // 2. Fetch order items
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
      } else if (orderData.product_details) {
        // Fallback to product_details json column for online orders
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
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Success Card Banner */}
        <div className="bg-white rounded-3xl border border-[#1b4332]/10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B4332] to-[#40916C]" />
          
          <div className="p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-[#E6F0EB] text-[#1B4332] rounded-full flex items-center justify-center mx-auto border border-[#1b4332]/10 animate-bounce">
              <CheckCircle2 className="w-9 h-9 fill-[#1B4332] text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900">Order Confirmed!</h1>
              <p className="text-sm text-slate-500 mt-1">Thank you for your purchase. Your order is now being processed.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 border border-slate-200/50 rounded-full text-xs font-mono font-bold text-slate-600">
              ID: #{String(order.id).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Order Summary Receipt */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#1B4332]" />
              Order Items
            </h3>
            
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-2 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.products?.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Quantity: {item.quantity} @ ৳{Number(item.unit_price).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 shrink-0 ml-3">
                    ৳{(Number(item.unit_price) * item.quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 text-sm font-semibold">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery Charge</span>
                <span>৳{deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-100 text-base">
                <span>Total Amount</span>
                <span className="text-[#1B4332]">৳{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Shipping Info */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Delivery details
              </h3>
              
              <div className="space-y-4 text-sm font-medium text-slate-700">
                <div className="flex gap-3">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Recipient Name</p>
                    <p className="text-slate-800 font-bold mt-0.5">{order.customer_name || 'Customer'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Contact Number</p>
                    <p className="text-slate-800 font-bold mt-0.5">{order.customer_phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Shipping Address</p>
                    <p className="text-slate-800 leading-relaxed font-semibold mt-0.5">{order.customer_address || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Payment Method</p>
                    <p className="text-[#1B4332] font-bold uppercase mt-0.5">{order.payment_method || 'Cash on Delivery'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100/50 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md">
                Continue Shopping
              </Link>
              <Link href="/customer/dashboard" className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#1b4332] font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300">
                Track Order <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
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
