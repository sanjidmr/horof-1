'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CreditCard, ShoppingCart, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getCheckoutItems, CheckoutItem } from '@/lib/checkoutStorage';
import { useAuth } from '@/context/AuthContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  const [deliveryType, setDeliveryType] = useState<'inside_mymensingh' | 'outside_mymensingh' | null>(null);

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

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryType) return;
    
    // Validate Phone Number
    if (!/^01\d{9}$/.test(formData.phone)) {
      alert("Please enter a valid Bangladeshi phone number starting with 01 and 11 digits long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payment/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          customer: formData,
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
        alert(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment Error:', error);
      alert('An error occurred during payment initiation.');
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">It looks like you haven't added anything to your cart yet.</p>
        <Link href="/" className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors">
          <Home className="w-5 h-5 mr-2" />
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-center md:text-left text-gray-900">Secure Checkout</h1>
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Side: Order Summary */}
          <div className="w-full lg:w-5/12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-emerald-600" />
                Order Summary
              </h2>
              
              <div className="space-y-4 mb-6 custom-scrollbar max-h-[400px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 relative shrink-0">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-800 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap text-gray-900">
                      ৳ {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Subtotal</span>
                  <span>৳ {subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Delivery + Customer Info Form */}
          <div className="w-full lg:w-7/12">
            <form onSubmit={handlePayment} className="space-y-8">
              
              {/* Delivery Options */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">1. Delivery Option</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setDeliveryType('inside_mymensingh')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${deliveryType === 'inside_mymensingh' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${deliveryType === 'inside_mymensingh' ? 'border-emerald-500' : 'border-gray-300'}`}>
                        {deliveryType === 'inside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Inside Mymensingh</h4>
                        <p className="text-sm text-gray-500 mt-1">Delivery Charge: ৳60</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setDeliveryType('outside_mymensingh')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${deliveryType === 'outside_mymensingh' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${deliveryType === 'outside_mymensingh' ? 'border-emerald-500' : 'border-gray-300'}`}>
                        {deliveryType === 'outside_mymensingh' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Outside Mymensingh</h4>
                        <p className="text-sm text-gray-500 mt-1">Delivery Charge: ৳120</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">2. Customer Information</h2>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        pattern="01\d{9}"
                        title="Must be 11 digits starting with 01"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address <span className="text-red-500">*</span></label>
                      <textarea
                        name="address"
                        required
                        rows={3}
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none"
                        placeholder="House/Apartment no, Street, Area"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City / Area <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                        placeholder="e.g. Dhaka"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Total & Submit */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="space-y-3 text-base text-gray-600 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>৳ {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span>{deliveryType ? `৳ ${deliveryCharge}` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-4 border-t border-gray-100 mt-2">
                    <span>Total</span>
                    <span>৳ {total.toLocaleString()}</span>
                  </div>
                </div>

                {!deliveryType && (
                  <p className="text-sm text-amber-600 mb-4 text-center">Please select a delivery option to continue</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !deliveryType}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
                
                <div className="mt-4 flex items-center justify-center text-xs text-gray-500 gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>100% Secure Payment powered by SSLCommerz</span>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
