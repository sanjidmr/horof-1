import React from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Product } from '../../lib/types';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="group bg-transparent rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-2"
    >
      {/* Image Area */}
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-secondary rounded-2xl border border-border-forest/30 transition-all duration-500 group-hover:border-accent-hover/30">
        <Link href={`/products/${product.id}`}>
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-1 sm:gap-2 pointer-events-none z-10">
          {product.isNew && <Badge variant="primary" className="rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-xs">New</Badge>}
          {product.discountPrice && (
            <Badge className="bg-accent-primary text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-xs">
              -{Math.round((1 - product.discountPrice / product.price) * 100)}%
            </Badge>
          )}
        </div>

        {/* Hover Actions - Hidden on mobile for better 2-column experience */}
        <div className="absolute inset-0 bg-accent-primary/5 backdrop-blur-[2px] opacity-0 md:group-hover:opacity-100 transition-all duration-500 hidden md:flex items-center justify-center gap-3">
          <button
            onClick={() => toggleWishlist(product)}
            className={cn(
              "p-4 rounded-full transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 shadow-xl",
              isWishlisted ? "bg-accent-primary text-white" : "bg-white text-accent-primary hover:bg-accent-hover hover:text-white"
            )}
            title="Wishlist"
          >
            <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
          </button>
          <Link href={`/products/${product.id}`}>
            <span
              className="p-4 bg-white text-accent-primary rounded-full hover:bg-accent-hover hover:text-white transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 delay-75 shadow-xl flex items-center justify-center cursor-pointer"
              title="Quick View"
            >
              <Eye className="h-5 w-5" />
            </span>
          </Link>
          <button
            onClick={() => addToCart(product)}
            className="p-4 bg-white text-accent-primary rounded-full hover:bg-accent-hover hover:text-white transition-all duration-300 transform translate-y-8 group-hover:translate-y-0 delay-150 shadow-xl"
            title="Add to Cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6 space-y-2 sm:space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{product.category}</span>
          <div className="flex items-center gap-1 bg-bg-secondary px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
            <Star className="h-2.5 w-2.5 sm:h-3 w-3 text-gold fill-gold" />
            <span className="text-[8px] sm:text-[10px] text-accent-primary font-bold">{product.rating}</span>
          </div>
        </div>

        <Link href={`/products/${product.id}`} className="block">
          <h3 className="text-sm sm:text-xl font-display font-medium text-accent-primary group-hover:text-accent-hover transition-colors line-clamp-1 leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 sm:pt-2">
          <div className="flex flex-col">
            <span className="text-base sm:text-xl font-bold text-accent-primary">
              {formatPrice(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-[10px] sm:text-xs text-text-muted line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product)}
            className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-bg-secondary border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white hover:border-accent-primary transition-all duration-300"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
