'use client';

import React from 'react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, subtotal, clearCart } = useCart();
  const router = useRouter();

  if (cart.length === 0) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
        <div className="w-32 h-32 bg-bg-card rounded-full flex items-center justify-center border border-border-forest">
          <ShoppingBag className="h-16 w-16 text-text-muted" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-display font-bold">Your cart is empty</h1>
          <p className="text-text-secondary max-w-md">Looks like you haven't added any of our handcrafted goods to your collection yet.</p>
        </div>
        <Link href="/products">
          <Button variant="gold" size="lg">Explore Collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Cart Items List */}
        <div className="flex-1 space-y-12">
          <div className="flex items-center justify-between border-b border-white/5 pb-8">
            <h1 className="text-4xl font-display font-bold">Shopping Cart</h1>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-text-muted uppercase tracking-widest hover:text-error transition-colors"
            >
              Clear Cart
            </button>
          </div>

          <div className="space-y-10">
            {cart.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center gap-8 group"
              >
                <div className="h-40 w-full sm:w-40 rounded-3xl overflow-hidden border border-border-forest bg-bg-card flex-shrink-0">
                  <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <span className="text-gold text-[10px] font-bold uppercase tracking-widest">{item.category}</span>
                    <h3 className="text-2xl font-display font-bold text-text-primary mt-1">{item.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">Price</p>
                      <p className="text-lg font-bold text-text-primary">{formatPrice(item.discountPrice || item.price)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">Quantity</p>
                      <div className="flex items-center justify-center sm:justify-start gap-1 bg-bg-card p-1 rounded-xl border border-border-forest">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:text-gold"><Minus className="h-4 w-4" /></button>
                        <span className="w-10 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:text-gold"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">Total</p>
                      <p className="text-lg font-bold text-gold">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-3 bg-error/10 text-error rounded-2xl hover:bg-error hover:text-text-primary transition-all duration-300 sm:self-center"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <aside className="w-full lg:w-[400px]">
          <div className="bg-bg-card border border-border-forest rounded-[40px] p-10 sticky top-32 space-y-8 glass-card">
            <h3 className="text-3xl font-display font-bold">Summary</h3>

            <div className="space-y-4">
              <div className="flex justify-between text-text-secondary">
                <span>Items Count</span>
                <span className="text-text-primary font-bold">{cart.length} Products</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span className="text-success font-bold uppercase text-xs">Calculated at next step</span>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-between items-baseline">
                <span className="text-xl font-display font-bold">Subtotal</span>
                <span className="text-3xl font-bold text-gold">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <Button variant="gold" className="w-full h-14" onClick={() => router.push('/checkout')}>
                Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" className="w-full h-12" onClick={() => router.push('/products')}>
                Continue Shopping
              </Button>
            </div>

            <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">We Accept</span>
              <div className="flex gap-4 opacity-50">
                <span className="text-sm font-bold">bKash</span>
                <span className="text-sm font-bold">Nagad</span>
                <span className="text-sm font-bold">COD</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
