'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { products } from '../../../lib/mockData';
import { formatPrice } from '../../../lib/utils';
import { useCart } from '../../../context/CartContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Star, ShoppingCart, Heart, ShieldCheck, Truck, RefreshCcw, ChevronRight, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ProductCard } from '../../../components/product/ProductCard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const product = products.find(p => p.id === id);
  const { addToCart, clearCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const relatedProducts = products
    .filter(p => p.category === product?.category && p.id !== product?.id)
    .slice(0, 4);

  const handleBuyNow = () => {
    if (!product) return;
    clearCart();
    addToCart(product, quantity);
    router.push('/checkout');
  };

  if (!product) {
    return (
      <div className="pt-32 pb-24 text-center space-y-6">
        <h2 className="text-4xl font-display font-bold">Product not found</h2>
        <Link href="/products">
          <Button variant="gold">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16 md:pb-24 px-4 md:px-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Breadcrumbs - Hidden on very small screens for cleaner look */}
      <nav className="hidden sm:flex items-center gap-2 text-[10px] md:text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-8 md:mb-12">
        <Link href="/" className="hover:text-accent-hover transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="hover:text-accent-hover transition-colors">Shop</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
        {/* Image Gallery - Improved Sticky for PC */}
        <div className="lg:sticky lg:top-32 h-fit">
          <div className="space-y-6 md:space-y-8">
            <motion.div
              className="aspect-square rounded-[2rem] md:rounded-[40px] overflow-hidden bg-bg-card border border-border-forest group relative shadow-sm"
              key={activeImage}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
            </motion.div>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-20 w-20 md:h-24 md:w-24 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all snap-start ${activeImage === idx ? 'border-accent-hover shadow-lg shadow-accent-hover/20' : 'border-border-forest opacity-50 hover:opacity-100 hover:border-gold/50'}`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-8 md:space-y-10">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Badge variant="primary" className="px-3 md:px-4 py-1 text-[10px] md:text-xs">Premium Item</Badge>
              {product.isNew && <Badge variant="secondary" className="px-3 md:px-4 py-1 text-[10px] md:text-xs">New Arrival</Badge>}
              <Badge variant="outline" className="px-3 md:px-4 py-1 text-[10px] md:text-xs border-gold text-gold font-bold">In Stock: {product.stock}</Badge>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-text-primary leading-tight">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 md:h-4 md:w-4 ${i < Math.floor(product.rating) ? 'text-accent-hover fill-accent-hover' : 'text-text-muted'}`} />
                ))}
                <span className="ml-2 text-xs md:text-sm text-text-secondary font-bold">{product.rating}</span>
              </div>
              <span className="text-text-muted hidden sm:inline">|</span>
              <span className="text-[10px] md:text-sm text-text-muted uppercase tracking-widest">{product.reviewCount} Reviews</span>
            </div>
            <div className="flex items-baseline gap-3 md:gap-4">
              <span className="text-3xl md:text-4xl font-bold text-accent-primary">
                {formatPrice(product.discountPrice || product.price)}
              </span>
              {product.discountPrice && (
                <span className="text-lg md:text-xl text-text-muted line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>

          <p className="text-text-secondary leading-relaxed text-base md:text-lg">
            {product.description}
          </p>

          {/* Action Buttons - Stacked for better focus */}
          <div className="flex flex-col gap-5 pt-6 border-t border-white/5">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Quantity */}
              <div className="flex items-center gap-2 bg-bg-secondary p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-border-forest h-12 md:h-14 w-36 sm:w-40 shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center text-text-secondary hover:text-accent-hover transition-colors"
                >
                  <Minus className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <span className="flex-1 text-center font-bold text-base md:text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center text-text-secondary hover:text-accent-hover transition-colors"
                >
                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>

              {/* Wishlist */}
              <button className="h-12 md:h-14 w-12 md:w-14 bg-bg-secondary border border-border-forest rounded-xl md:rounded-2xl flex items-center justify-center text-text-secondary hover:text-error hover:border-error transition-all group shrink-0">
                <Heart className="h-5 w-5 md:h-6 md:w-6 group-hover:fill-error" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                className="w-full h-12 md:h-14 text-sm md:text-base rounded-xl md:rounded-2xl shadow-xl shadow-accent-primary/10"
                onClick={() => addToCart(product, quantity)}
              >
                Add to Cart <ShoppingCart className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 md:h-14 text-sm md:text-base rounded-xl md:rounded-2xl border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white"
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Features - Fixed to one row on mobile */}
          <div className="grid grid-cols-3 gap-2 md:gap-6 pt-8 md:pt-10 border-t border-white/5">
            <div className="flex flex-col items-center sm:flex-row gap-2 sm:gap-3 text-center sm:text-left">
              <div className="h-8 w-8 md:h-10 md:w-10 bg-bg-secondary rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 md:h-5 md:w-5 text-accent-light" />
              </div>
              <div className="text-[7px] md:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">Free Global<br className="hidden sm:block" />Shipping</div>
            </div>
            <div className="flex flex-col items-center sm:flex-row gap-2 sm:gap-3 text-center sm:text-left">
              <div className="h-8 w-8 md:h-10 md:w-10 bg-bg-secondary rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-accent-light" />
              </div>
              <div className="text-[7px] md:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">Lifetime<br className="hidden sm:block" />Warranty</div>
            </div>
            <div className="flex flex-col items-center sm:flex-row gap-2 sm:gap-3 text-center sm:text-left">
              <div className="h-8 w-8 md:h-10 md:w-10 bg-bg-secondary rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                <RefreshCcw className="h-4 w-4 md:h-5 md:w-5 text-accent-light" />
              </div>
              <div className="text-[7px] md:text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">30-Day<br className="hidden sm:block" />Returns</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pt-6 md:pt-10 space-y-6 md:space-y-8">
            <div className="flex border-b border-white/5 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile">
              {['description', 'specifications', 'reviews'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 md:px-8 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all relative flex-shrink-0 ${activeTab === tab ? 'text-accent-hover' : 'text-text-muted hover:text-text-primary'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-hover" />
                  )}
                </button>
              ))}
            </div>
            <div className="text-text-secondary text-xs sm:text-sm md:text-base leading-relaxed min-h-[100px] bg-bg-card/40 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-sm">
              {activeTab === 'description' && (
                <p>Every piece is carefully selected from sustainable forests. Our artisans spend over 40 hours on a single item to ensure the output meets the highest luxury standards. The natural wood grain is preserved through organic oils, making each product unique.</p>
              )}
              {activeTab === 'specifications' && (
                <ul className="space-y-3">
                  <li><span className="text-text-primary font-bold">Material:</span> Solid American Walnut</li>
                  <li><span className="text-text-primary font-bold">Finish:</span> Natural Organic Oil</li>
                  <li><span className="text-text-primary font-bold">Weight:</span> 4.5kg</li>
                  <li><span className="text-text-primary font-bold">Origin:</span> Handmade in South Asia</li>
                </ul>
              )}
              {activeTab === 'reviews' && (
                <p>No reviews yet. Be the first to review this handcrafted masterpiece!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section - Single row small cart design */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 sm:mt-24 md:mt-32 pt-12 md:pt-16 border-t border-white/5">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div className="space-y-2 sm:space-y-3">
              <Badge variant="gold" className="text-[8px] sm:text-[10px] px-3 sm:px-4 py-0.5 sm:py-1 uppercase tracking-widest font-bold">Collection</Badge>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-accent-primary italic">You Might Also <span className="text-gold font-sans not-italic">Love</span></h2>
            </div>
            <Link href="/products" className="hidden sm:block">
              <Button variant="outline" className="rounded-full px-6 h-10 text-[10px] uppercase font-bold tracking-widest">See All</Button>
            </Link>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 sm:pb-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 no-scrollbar-on-mobile items-start">
            {relatedProducts.map((p) => (
              <div key={p.id} className="w-[200px] sm:w-auto flex-shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>

          <Link href="/products" className="sm:hidden mt-6 block">
            <Button variant="outline" className="w-full rounded-full h-12 text-[10px] uppercase font-bold tracking-widest">See Full Collection</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
