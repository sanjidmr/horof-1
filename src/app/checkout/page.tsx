'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Loader2, ShoppingCart, Home, 
  MapPin, Phone, User, Map, FileText,
  CreditCard, Banknote, CheckCircle2, Navigation
} from 'lucide-react';
import Link from 'next/link';
import { getCheckoutItems, CheckoutItem, clearCheckoutItems } from '@/lib/checkoutStorage';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { placeOrder } from '@/lib/actions/place-order';
import { toast } from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Customer Information State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: '',
    thana: '',
    area: '',
    address: '',
    note: '',
  });

  // Delivery & Payment State
  const [deliveryType, setDeliveryType] = useState<'inside_mymensingh' | 'outside_mymensingh' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online' | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?next=%2Fcheckout');
      return;
    }
    const loadedItems = getCheckoutItems();
    if (loadedItems && loadedItems.length > 0) {
      setItems(loadedItems);
    }
    setIsLoaded(true);
  }, [user, authLoading, router]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = deliveryType === 'inside_mymensingh' ? 60 : deliveryType === 'outside_mymensingh' ? 120 : 0;
  const total = subtotal + deliveryCharge;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryType) {
      toast.error("Please select a delivery option");
      return;
    }
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Strict Phone Number Validation
    if (!/^01\d{9}$/.test(formData.phone)) {
      toast.error("Please enter a valid 11-digit Bangladeshi phone number starting with 01");
      return;
    }

    setLoading(true);

    const fullAddress = `${formData.address}, ${formData.area}, ${formData.thana}, ${formData.district}. Note: ${formData.note}`;

    if (paymentMethod === 'online') {
      try {
        const response = await fetch('/api/payment/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items,
            customer: {
              ...formData,
              full_address: fullAddress,
              email: user?.email || '',
            },
            delivery_charge: deliveryCharge,
            delivery_type: deliveryType,
            subtotal: subtotal,
            total_amount: total
          }),
        });

        const data = await response.json();

        if (response.ok && data.url) {
          window.location.href = data.url;
        } else {
          toast.error(data.error || 'Something went wrong. Please try again.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Payment Error:', error);
        toast.error('An error occurred during payment initiation.');
        setLoading(false);
      }
    } else {
      // Cash on Delivery flow
      try {
        const res = await placeOrder({
          customer_name: formData.name,
          customer_email: user?.email || '',
          customer_phone: formData.phone,
          customer_address: fullAddress,
          delivery_charge: deliveryCharge,
          delivery_type: deliveryType || 'inside_mymensingh',
          total: total,
          items: items.map(i => ({
            product_id: i.id,
            quantity: i.quantity,
            unit_price: i.price,
            name: i.name
          }))
        });

        if (res.ok) {
          clearCart();
          clearCheckoutItems();
          toast.success("Order placed successfully!");
          router.push(`/order-confirmed?id=${res.orderId}`);
        } else {
          toast.error(res.message || "Failed to place order");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        toast.error("An unexpected error occurred");
        setLoading(false);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#1a4731]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center pt-28 pb-16 md:pt-36 md:pb-24 p-4">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-slate-100">
          <ShoppingCart className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 text-center max-w-sm">It looks like you haven't added any premium items to your cart yet.</p>
        <Link href="/" className="inline-flex items-center px-8 py-4 bg-[#1a4731] text-white font-bold rounded-xl hover:bg-[#14402a] hover:-translate-y-1 transition-all shadow-lg shadow-[#1a4731]/20 uppercase tracking-widest text-xs">
          <Home className="w-4 h-4 mr-2" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-16 md:pt-36 md:pb-24 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1a4731] mb-2">Secure Checkout</h1>
          <p className="text-slate-500">Complete your order details below</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 flex-col-reverse lg:flex-row">
          
          {/* Left Side: Forms */}
          <div className="w-full lg:w-7/12 space-y-8">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
              
              {/* Customer Info Form */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">1</span>
                  Customer Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="name" required value={formData.name} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel" name="phone" required pattern="01\d{9}" title="11 digits starting with 01" value={formData.phone} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Map className="w-3.5 h-3.5 text-slate-400" /> District <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="district" required value={formData.district} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="e.g. Dhaka"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Thana/Upazila <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="thana" required value={formData.thana} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="e.g. Dhanmondi"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5 text-slate-400" /> Area <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" name="area" required value={formData.area} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none"
                      placeholder="e.g. Zigatola"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-slate-400" /> Full Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address" required rows={2} value={formData.address} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none resize-none"
                      placeholder="House/Apartment no, Street details"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Extra Location Note <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <textarea
                      name="note" rows={2} value={formData.note} onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1a4731] focus:border-transparent transition-all outline-none resize-none"
                      placeholder="Any landmark or specific instructions for delivery man"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Option */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">2</span>
                  Delivery System
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setDeliveryType('inside_mymensingh')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${deliveryType === 'inside_mymensingh' ? 'border-[#1a4731] bg-[#f0fdf4]/30' : 'border-slate-100 hover:border-[#1a4731]/30 bg-white'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${deliveryType === 'inside_mymensingh' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                        {deliveryType === 'inside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                      <div>
                        <h4 className={`font-bold transition-colors ${deliveryType === 'inside_mymensingh' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Inside Mymensingh</h4>
                        <p className="text-sm text-slate-500 mt-1">Delivery Charge: <span className="font-bold text-slate-700">৳60</span></p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setDeliveryType('outside_mymensingh')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${deliveryType === 'outside_mymensingh' ? 'border-[#1a4731] bg-[#f0fdf4]/30' : 'border-slate-100 hover:border-[#1a4731]/30 bg-white'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${deliveryType === 'outside_mymensingh' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                        {deliveryType === 'outside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                      <div>
                        <h4 className={`font-bold transition-colors ${deliveryType === 'outside_mymensingh' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Outside Mymensingh</h4>
                        <p className="text-sm text-slate-500 mt-1">Delivery Charge: <span className="font-bold text-slate-700">৳120</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1a4731]" />
                <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800">
                  <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#1a4731] flex items-center justify-center mr-3 text-sm font-bold">3</span>
                  Payment Method
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div 
                    onClick={() => setPaymentMethod('cod')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${paymentMethod === 'cod' ? 'border-[#1a4731] bg-[#f0fdf4]/30' : 'border-slate-100 hover:border-[#1a4731]/30 bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paymentMethod === 'cod' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                        {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-[#1a4731]' : 'text-slate-400'}`} />
                        <h4 className={`font-bold transition-colors ${paymentMethod === 'cod' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Cash on Delivery</h4>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPaymentMethod('online')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${paymentMethod === 'online' ? 'border-[#1a4731] bg-[#f0fdf4]/30' : 'border-slate-100 hover:border-[#1a4731]/30 bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${paymentMethod === 'online' ? 'border-[#1a4731]' : 'border-slate-300'}`}>
                        {paymentMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-5 h-5 ${paymentMethod === 'online' ? 'text-[#1a4731]' : 'text-slate-400'}`} />
                        <h4 className={`font-bold transition-colors ${paymentMethod === 'online' ? 'text-[#1a4731]' : 'text-slate-700'}`}>Online Payment</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Online Payment Dynamic Info */}
                {paymentMethod === 'online' && (
                  <div className="mt-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Payment via SSLCommerz
                    </h4>
                    <div className="flex flex-wrap gap-4 mb-4">
                      {['bKash', 'Nagad', 'Rocket', 'Visa', 'MasterCard'].map(provider => (
                        <span key={provider} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                          {provider}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You will be securely redirected to the SSLCommerz payment gateway. You can choose to pay via Mobile Banking (bKash, Nagad, Rocket) or Credit/Debit Cards.
                    </p>
                  </div>
                )}
                {paymentMethod === 'cod' && (
                  <div className="mt-6 p-6 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pay upon delivery
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You will pay the delivery executive in cash upon receiving the package. Please ensure you have the exact amount ready.
                    </p>
                  </div>
                )}
              </div>

            </form>
          </div>

          {/* Right Side: Order Summary */}
          <div className="w-full lg:w-5/12">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#1a4731]/5 border border-slate-100 p-6 md:p-8 lg:sticky lg:top-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0fdf4] rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
              
              <h2 className="text-xl font-display font-bold mb-6 flex items-center text-slate-800 relative z-10">
                <ShoppingCart className="w-5 h-5 mr-2 text-[#1a4731]" />
                Order Summary
              </h2>
              
              <div className="space-y-4 mb-6 custom-scrollbar max-h-[40vh] overflow-y-auto pr-2 relative z-10">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 border-b border-slate-50 last:border-0 group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 relative shrink-0 border border-slate-100">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{item.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Qty: {item.quantity}</p>
                        <div className="text-sm font-bold text-[#1a4731]">
                          ৳ {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4 relative z-10">
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">৳ {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-slate-800">{deliveryType ? `৳ ${deliveryCharge}` : '—'}</span>
                </div>
                <div className="flex justify-between text-xl font-display font-black text-[#1a4731] pt-4 border-t border-slate-100 mt-2">
                  <span>Total</span>
                  <span>৳ {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || !deliveryType || !paymentMethod}
                  className="w-full bg-[#1a4731] hover:bg-[#14402a] text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#1a4731]/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Order...
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'cod' ? 'Place Order (COD)' : 'Proceed to Payment'}
                    </>
                  )}
                </button>
                
                <div className="mt-5 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-slate-400 gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure Checkout Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
