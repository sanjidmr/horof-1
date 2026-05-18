import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { Button } from '../ui/Button';
import { formatPrice } from '../../lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveCheckoutItems } from '../../lib/checkoutStorage';
import { useRequireAuth } from '../../context/AuthModalContext';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, subtotal, itemCount } = useCart();
  const router = useRouter();
  const { requireAuth } = useRequireAuth();

  const handleCheckout = () => {
    requireAuth(() => {
      if (cart.length > 0) {
        saveCheckoutItems(cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.discountPrice || item.price,
          image: item.images[0] || '',
          quantity: item.quantity
        })));
      }
      onClose();
      router.push('/checkout');
    }, "Please login first to proceed to secure checkout.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-bg-secondary border-l border-border-forest shadow-2xl z-[111] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-border-forest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-accent-primary" />
                </div>
                <h2 className="text-xl font-display font-bold text-text-primary">
                  Your Cart <span className="text-sm font-body font-normal text-text-secondary ml-1">({itemCount})</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-gold transition-all hover:rotate-90"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-bg-card rounded-full flex items-center justify-center border border-border-forest shadow-inner">
                    <ShoppingCart className="h-12 w-12 text-text-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-bold text-text-primary uppercase tracking-tight">Your cart is empty</h3>
                    <p className="text-sm text-text-secondary">Discover art woodcrafts to fill it with beauty.</p>
                  </div>
                  <Button variant="gold" onClick={onClose} className="mt-4 rounded-full px-8">
                    Discover Art
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-bg-secondary/50 border-none group transition-all hover:bg-white hover:shadow-lg hover:shadow-black/5">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-border-forest/30 transition-transform group-hover:scale-95 duration-500">
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between gap-2 items-start">
                            <h4 className="text-sm font-bold text-accent-primary line-clamp-1 group-hover:text-gold transition-colors">{item.name}</h4>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-text-muted hover:text-error transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-gold font-bold text-sm mt-1">
                            {formatPrice(item.discountPrice || item.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 bg-bg-secondary rounded-full border border-border-forest px-1 py-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-gold transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-accent-primary">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-gold transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                            Total: <span className="text-accent-primary">{formatPrice((item.discountPrice || item.price) * item.quantity)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 sm:p-8 bg-white border-t border-border-forest space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Estimated Total</span>
                    <p className="text-2xl font-display font-bold text-accent-primary">{formatPrice(subtotal)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Free Shipping</span>
                    <span className="text-[9px] text-text-muted italic">on your first order</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button variant="gold" className="w-full h-14 rounded-full text-xs uppercase tracking-widest font-bold" onClick={handleCheckout}>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    onClick={onClose}
                    className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-gold transition-colors"
                  >
                    Continue Browsing
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
