'use client';

import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input, TextArea } from '../../components/ui/Input';
import { ShieldCheck, Truck, CreditCard, Apple as bKash, Wallet as Nagad, PackageCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { placeOrder } from '../../lib/actions/place-order';

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'cod'>('cod');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const deliveryCharge = 60;
  const total = subtotal + deliveryCharge;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await placeOrder({
        customer_name: formData.name,
        customer_email: formData.email,
        total: total,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.discountPrice || item.price,
          name: item.name
        }))
      });

      if (result.ok) {
        toast.success('Order placed successfully!');
        clearCart();
        router.push('/order-confirmation');
      } else {
        toast.error(result.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="pt-40 pb-24 text-center space-y-6">
        <h2 className="text-3xl font-display font-bold">Your cart is empty</h2>
        <Button variant="gold" onClick={() => router.push('/products')}>Go to Shop</Button>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        {/* Left: Shipping Form */}
        <div className="flex-1 space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
              <Truck className="h-6 w-6 md:h-8 md:w-8 text-gold" />
              Shipping Information
            </h2>
            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Full Name" 
                placeholder="Your Name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="youremail@gmail.com" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input 
                label="Phone Number" 
                placeholder="01XXXXXXXXX" 
                required 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">Division</label>
                <select className="flex h-11 w-full rounded-lg border border-border-forest bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-primary">
                  <option>Dhaka</option>
                  <option>Chittagong</option>
                  <option>Rajshahi</option>
                  <option>Khulna</option>
                  <option>Sylhet</option>
                </select>
              </div>
              <Input label="District" placeholder="Enter District" required />
              <Input label="Upazila/Thana" placeholder="Enter Thana" required />
              <div className="md:col-span-2">
                <TextArea 
                  label="Full Address" 
                  placeholder="House no, Street name, Sector..." 
                  required 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <TextArea label="Delivery Note (Optional)" placeholder="Any special instructions for the rider..." />
              </div>
            </form>
          </div>

          <div className="space-y-6 md:space-y-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2 md:gap-3">
              <CreditCard className="h-6 w-6 md:h-8 md:w-8 text-gold" />
              Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* bKash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bkash')}
                className={`flex flex-col p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left space-y-2 sm:space-y-4 ${paymentMethod === 'bkash' ? 'bg-[#E2136E]/10 border-[#E2136E]' : 'bg-bg-card border-border-forest hover:border-[#E2136E]/50'}`}
              >
                <div className="h-8 sm:h-12 w-auto flex items-center">
                  <span className="text-[#E2136E] font-bold text-lg sm:text-xl italic tracking-tighter">bKash</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-widest">Send to: 01700000000</p>
                  <p className="text-[11px] sm:text-xs text-text-secondary">Enter your transaction ID below after sending money.</p>
                </div>
              </button>

              {/* Nagad */}
              <button
                type="button"
                onClick={() => setPaymentMethod('nagad')}
                className={`flex flex-col p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left space-y-2 sm:space-y-4 ${paymentMethod === 'nagad' ? 'bg-[#F49124]/10 border-[#F49124]' : 'bg-bg-card border-border-forest hover:border-[#F49124]/50'}`}
              >
                <div className="h-8 sm:h-12 w-auto flex items-center">
                  <span className="text-[#F49124] font-bold text-lg sm:text-xl italic tracking-tighter">Nagad</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-widest">Send to: 01800000000</p>
                  <p className="text-[11px] sm:text-xs text-text-secondary">Fast & secure payment via Nagad App or USSD.</p>
                </div>
              </button>

              {/* COD */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`flex flex-col p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all text-left space-y-2 sm:space-y-4 ${paymentMethod === 'cod' ? 'bg-success/10 border-success' : 'bg-bg-card border-border-forest hover:border-success/50'}`}
              >
                <div className="h-8 sm:h-12 w-auto flex items-center">
                  <PackageCheck className="h-6 w-6 sm:h-10 sm:w-10 text-success" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-bold text-text-muted uppercase tracking-widest">Cash on Delivery</p>
                  <p className="text-[11px] sm:text-xs text-text-secondary">Pay when you receive your order at your doorstep.</p>
                </div>
              </button>
            </div>

            {paymentMethod !== 'cod' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-bg-card border border-border-forest rounded-2xl"
              >
                <Input label="Transaction ID" placeholder="TRX-XXXX-XXXX" required />
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <aside className="w-full lg:w-[400px]">
          <div className="bg-bg-card border border-border-forest rounded-2xl md:rounded-3xl p-5 sm:p-8 sticky top-32 space-y-6 sm:space-y-8">
            <h3 className="text-xl sm:text-2xl font-display font-bold">Order Summary</h3>

            <div className="space-y-4 sm:space-y-6 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-text-primary line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-text-muted">Quantity: {item.quantity}</p>
                    <p className="text-sm font-bold text-gold mt-1">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Delivery Charge</span>
                <span>{formatPrice(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-lg font-display font-bold text-text-primary pt-4 border-t border-white/5">
                <span>Total Amount</span>
                <span className="text-gold">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex gap-2">
                <input
                  placeholder="Coupon code"
                  className="flex-1 bg-bg-primary border border-border-forest rounded-lg px-4 py-2 text-sm outline-none focus:border-gold"
                />
                <Button variant="secondary" className="h-10 px-4">Apply</Button>
              </div>
              <Button
                variant="gold"
                className="w-full h-12 sm:h-14 text-xs sm:text-sm"
                isLoading={isLoading}
                onClick={handlePlaceOrder}
              >
                Confirm & Place Order
              </Button>
            </div>

            <div className="flex items-center justify-center gap-3 text-text-muted">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Encrypted & Secure Payment</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
