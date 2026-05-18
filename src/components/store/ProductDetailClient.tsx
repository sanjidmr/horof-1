'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Minus, Plus, ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Share2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRequireAuth } from '@/context/AuthModalContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '../product/ProductCard';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';

interface Variant {
  size?: string | null;
  color?: string | null;
  price_modifier: number;
}

interface ProductDetailClientProps {
  product: Product;
  images: string[];
  variants: Variant[];
  relatedProducts: Product[];
}

export function ProductDetailClient({ product, images, variants, relatedProducts }: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const { requireAuth } = useRequireAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(variants.find(v => v.size)?.size || null);
  const [selectedColor, setSelectedColor] = useState<string | null>(variants.find(v => v.color)?.color || null);

  const gallery = images.length ? images : product.images;
  const currentVariant = variants.find(v => 
    (!selectedSize || v.size === selectedSize) && 
    (!selectedColor || v.color === selectedColor)
  );

  const basePrice = product.discountPrice || product.price;
  const finalPrice = basePrice + (currentVariant?.price_modifier || 0);
  const discountPercent = product.discountPrice ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  const handleAddToCart = () => {
    addToCart({
      ...product,
      price: finalPrice,
    }, qty);
  };

  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean)));
  const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean)));

  const mockReviews = [
    { id: 1, user: "Arif Ahmed", rating: 5, date: "2 weeks ago", comment: "The craftsmanship is unparalleled. I bought the Teak coffee table and it's the centerpiece of my living room now. Truly a masterpiece!", avatar: "AA" },
    { id: 2, user: "Saira Banu", rating: 5, date: "1 month ago", comment: "Exceeded my expectations. The finish is so smooth and the wood grain is stunning. Fast shipping too!", avatar: "SB" },
    { id: 3, user: "Tanvir Hasan", rating: 4, date: "2 months ago", comment: "Beautiful product. Only reason for 4 stars is that the color was slightly darker than in photos, but I actually prefer it this way.", avatar: "TH" }
  ];

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 mb-20 lg:mb-32">
          {/* Gallery Section */}
          <div className="space-y-6">
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-50 border shadow-sm group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  src={gallery[activeImg]}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              </AnimatePresence>
              
              {discountPercent > 0 && (
                <div className="absolute top-8 left-8 bg-accent-primary text-white px-5 py-2 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] shadow-xl">
                  {discountPercent}% Off Limited Offer
                </div>
              )}
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className={cn(
                    "relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-500",
                    activeImg === idx ? "ring-2 ring-accent-primary ring-offset-4 scale-90" : "opacity-40 hover:opacity-100 hover:scale-95"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex text-gold">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">(4.9/5.0 From 124 Reviews)</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-display font-medium text-slate-900 leading-tight mb-6 tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-6 mb-10">
              <span className="text-4xl font-bold text-accent-primary">{formatPrice(finalPrice)}</span>
              {product.discountPrice && (
                <span className="text-2xl text-slate-300 line-through font-light">{formatPrice(product.price)}</span>
              )}
              
              <div className={cn(
                "ml-auto px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                product.stock > 0 ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
              )}>
                {product.stock > 0 ? (product.stock < 10 ? `Extremely Low Stock (${product.stock})` : 'Available to Order') : 'Currently Unavailable'}
              </div>
            </div>

            <div className="space-y-10 mb-12">
              {/* Size Selector */}
              {sizes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900">Dimensions</span>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-accent-primary hover:underline">View Size Chart</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "min-w-[4rem] h-14 px-6 rounded-2xl border-2 text-[11px] font-bold transition-all duration-300",
                          selectedSize === size 
                            ? "border-accent-primary bg-accent-primary text-white shadow-xl shadow-accent-primary/20" 
                            : "border-slate-100 bg-white text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {colors.length > 0 && (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900">Finish / Texture</span>
                  <div className="flex flex-wrap gap-5">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "group relative w-12 h-12 rounded-full border-2 transition-all p-1",
                          selectedColor === color ? "border-accent-primary scale-110" : "border-transparent"
                        )}
                        title={color || ''}
                      >
                        <div 
                          className="w-full h-full rounded-full border border-black/5 shadow-inner" 
                          style={{ backgroundColor: color?.toLowerCase().replace(' ', '') }} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Actions */}
              <div className="pt-6 space-y-8">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex items-center h-16 rounded-2xl bg-slate-50 border border-slate-100 px-3">
                    <button 
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <input 
                      type="number" 
                      value={qty}
                      readOnly
                      className="w-14 bg-transparent text-center font-bold text-slate-900 outline-none text-lg"
                    />
                    <button 
                      onClick={() => setQty(qty + 1)}
                      className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <Button 
                    onClick={handleAddToCart}
                    className="flex-1 h-16 bg-accent-primary text-white hover:bg-accent-hover rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl shadow-accent-primary/30 transition-all active:scale-95"
                  >
                    <ShoppingCart className="mr-3 w-5 h-5" />
                    Place in Collection
                  </Button>

                  <button className="w-16 h-16 flex items-center justify-center rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-slate-400 hover:text-red-500 hover:border-red-100 group">
                    <Heart size={24} className="group-hover:fill-current" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: ShieldCheck, text: "Heritage Certificate" },
                    { icon: Truck, text: "Insured Global Shipping" },
                    { icon: RotateCcw, text: "Concierge Returns" },
                    { icon: Share2, text: "Curate with Others" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50">
                        <item.icon size={16} className="text-accent-primary" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-14 p-0 mb-10 gap-10">
                <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary bg-transparent text-[10px] font-bold uppercase tracking-[0.3em] h-full px-0">Description</TabsTrigger>
                <TabsTrigger value="specification" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary bg-transparent text-[10px] font-bold uppercase tracking-[0.3em] h-full px-0">Meticulous Detail</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent-primary bg-transparent text-[10px] font-bold uppercase tracking-[0.3em] h-full px-0">Curator Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-0">
                <div className="prose prose-slate max-w-none text-slate-500 font-light leading-relaxed text-base italic">
                  {product.description}
                  
                  {product.tags && product.tags.length > 0 && (
                    <div className="mt-12">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 mb-4">Artisanal Alignment:</span>
                      <div className="flex flex-wrap gap-3">
                        {product.tags.map(tag => (
                          <span key={tag} className="px-5 py-2 bg-slate-50 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="specification" className="mt-0">
                <div className="grid grid-cols-1 gap-1">
                  {product.specification ? (
                    Object.entries(product.specification).map(([key, val]) => (
                      <div key={key} className="grid grid-cols-2 py-4 border-b border-slate-50 last:border-0 group">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 group-hover:text-accent-primary transition-colors">{key}</span>
                        <span className="text-sm text-slate-800 font-medium">{String(val)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">No technical specifications revealed for this artisan piece.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0">
                <div className="space-y-10">
                  {mockReviews.map(review => (
                    <div key={review.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-sm">
                            {review.avatar}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{review.user}</h4>
                            <div className="flex text-gold mt-1">
                              {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{review.date}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-light leading-relaxed pl-16">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] mt-10"
                    onClick={() => requireAuth(() => {
                      alert("Review submission feature coming soon!");
                    }, "Please login first to write a review.")}
                  >
                    Write a Review
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="space-y-12 pt-20 border-t border-slate-50">
            <div className="flex flex-col items-center text-center space-y-4">
              <span className="text-gold text-[10px] font-bold uppercase tracking-[0.5em]">Artisan Suggestions</span>
              <h2 className="text-3xl md:text-5xl font-display font-medium text-slate-900">Complete the Collection</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


