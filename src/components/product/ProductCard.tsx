'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, Eye, ArrowRight } from 'lucide-react';
import { Product } from '../../lib/types';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const PLACEHOLDER_IMG = '/images/about.jpg';

interface ProductCardProps {
  product: Product;
}

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = rating >= star;
        const isHalf = rating >= star - 0.5 && !isFull;
        
        return (
          <div key={star} className="relative">
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-200 fill-slate-200" />
            {(isFull || isHalf) && (
              <div className={cn("absolute inset-0 overflow-hidden", isHalf ? "w-[50%]" : "w-full")}>
                <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gold fill-gold" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const [imgError, setImgError] = useState(false);
  const imgSrc = (!imgError && product.images[0]) ? product.images[0] : PLACEHOLDER_IMG;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(45,106,79,0.08)] transition-all duration-500 hover:-translate-y-2 flex flex-col h-full"
    >
      {/* Image Area */}
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-secondary rounded-2xl m-3 border border-border-forest/20 transition-all duration-500 group-hover:border-[#2D6A4F]/30">
        <Link href={`/products/${product.id}`}>
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-1 sm:gap-2 pointer-events-none z-10">
          {product.isNew && <Badge variant="primary" className="rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-xs">New</Badge>}
          {product.isFeatured && (
            <Badge className="bg-gold text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-xs">
              Best Seller
            </Badge>
          )}
        </div>

        {/* Hover Actions - Hidden on mobile for better 2-column experience */}
        <div className="absolute inset-0 bg-[#1B4332]/5 backdrop-blur-[2px] opacity-0 md:group-hover:opacity-100 transition-all duration-500 hidden md:flex items-center justify-center gap-3">
          <button
            onClick={() => toggleWishlist(product)}
            className={cn(
              "p-4 rounded-full transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 shadow-xl",
              isWishlisted ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332] hover:bg-[#2D6A4F] hover:text-white"
            )}
            title="Wishlist"
          >
            <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
          </button>
          <Link href={`/products/${product.id}`}>
            <span
              className="p-4 bg-white text-[#1B4332] rounded-full hover:bg-[#2D6A4F] hover:text-white transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 delay-75 shadow-xl flex items-center justify-center cursor-pointer"
              title="Quick View"
            >
              <Eye className="h-5 w-5" />
            </span>
          </Link>
          <button
            onClick={() => addToCart(product)}
            className="p-4 bg-white text-[#1B4332] rounded-full hover:bg-[#2D6A4F] hover:text-white transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 delay-150 shadow-xl"
            title="Add to Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{product.category}</span>
            {product.rating > 0 && product.reviewCount > 0 ? (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-100">
                <StarRating rating={product.rating} />
                <span className="text-[9px] sm:text-[10px] text-slate-700 font-bold ml-0.5">
                  {product.rating.toFixed(1)} <span className="text-slate-400 font-normal">({product.reviewCount} Reviews)</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-slate-100">
                <StarRating rating={0} />
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal ml-0.5">
                  No Reviews Yet
                </span>
              </div>
            )}
          </div>

          <Link href={`/products/${product.id}`} className="block">
            <h3 className="text-sm sm:text-lg font-display font-bold text-slate-800 group-hover:text-[#2D6A4F] transition-colors line-clamp-1 leading-tight">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-50">
          <div className="flex flex-col">
            <div className="flex items-baseline text-slate-900">
              <span className="text-base sm:text-lg font-bold leading-none">
                {formatPrice(product.price)}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 ml-1">
                / Piece
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-1">
              Starting From
            </span>
            <Link
              href={`/products/${product.id}`}
              className="text-[11px] font-bold text-[#1B4332] hover:text-[#2D6A4F] mt-1.5 flex items-center gap-1 transition-colors group/btn"
            >
              <span>View Details</span>
              <ArrowRight className="h-3 w-3 transform group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <button
            onClick={() => addToCart(product)}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-[#1B4332] hover:bg-[#1B4332] hover:text-white hover:border-[#1B4332] transition-all duration-300 shadow-sm"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};