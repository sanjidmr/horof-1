'use client';

import React from 'react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from '../../components/product/ProductCard';
import { ShoppingBag, ArrowRight, HeartOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  if (wishlist.length === 0) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8">
        <div className="w-32 h-32 bg-bg-secondary rounded-full flex items-center justify-center border border-border-forest">
          <HeartOff className="h-16 w-16 text-text-muted" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-display font-bold text-accent-primary">Your Wishlist is Empty</h1>
          <p className="text-text-secondary max-w-md">Save your favorite handcrafted items here and come back to them anytime.</p>
        </div>
        <Link href="/products">
          <Button variant="primary" size="lg">Discover Collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-accent-hover text-[10px] font-bold uppercase tracking-[0.4em]">Personal Curation</span>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-accent-primary leading-tight">
              Your <span className="text-accent-hover italic">Wishlist</span>
            </h1>
          </div>
          <p className="text-sm md:text-base text-text-secondary max-w-xl">
            Explore the pieces you've curated from our handcrafted heritage collections.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-bg-secondary px-4 py-2 rounded-full border border-border-forest self-start md:self-auto">
          <span className="h-2 w-2 rounded-full bg-accent-hover animate-pulse" />
          <p className="text-[10px] font-bold text-accent-primary uppercase tracking-widest">{wishlist.length} Items saved</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
        <AnimatePresence>
          {wishlist.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
