'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Star, ShieldCheck, Truck } from 'lucide-react';
import { Product } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Button } from '@/components/ui/Button';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (!product) return null;

  const isWishlisted = isInWishlist(product.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-none overflow-y-auto md:overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            {/* Left: Image */}
            <div className="w-full md:w-1/2 bg-slate-50">
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover aspect-square md:aspect-auto"
              />
            </div>

            {/* Right: Info */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-6 md:space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-accent-primary uppercase tracking-[0.3em] bg-accent-primary/5 px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1 text-gold">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold text-slate-900">{product.rating}</span>
                  </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-medium text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-2xl md:text-3xl font-bold text-accent-primary">
                    {formatPrice(product.discountPrice || product.price)}
                  </span>
                  {product.discountPrice && (
                    <span className="text-lg text-slate-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  {product.description || "A masterfully crafted piece from our signature collection. Every detail is hand-finished to ensure eternal quality and timeless elegance."}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex gap-4">
                  <Button 
                    onClick={() => {
                      addToCart(product);
                      onClose();
                    }}
                    className="flex-1 h-14 rounded-2xl gap-2 shadow-xl shadow-accent-primary/20"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </Button>
                  <button 
                    onClick={() => toggleWishlist(product)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-red-500'}`}
                  >
                    <Heart size={24} className={isWishlisted ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <ShieldCheck size={18} className="text-accent-primary" />
                    Heritage Quality
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Truck size={18} className="text-accent-primary" />
                    Secure Delivery
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
