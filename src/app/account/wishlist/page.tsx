'use client';

import React from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import { Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Wishlist</h1>
        <p className="text-sm text-slate-500">Products you've saved for later.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlist.map((product) => (
          <Card key={product.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
            <div className="relative aspect-square overflow-hidden bg-slate-50">
              <img 
                src={product.images?.[0] || '/placeholder.png'} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <button 
                onClick={() => removeFromWishlist(product.id)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <CardContent className="p-6">
              <Link href={`/products/${product.slug}`}>
                <h3 className="font-bold text-slate-900 line-clamp-1 hover:text-accent-primary transition-colors">{product.name}</h3>
              </Link>
              <div className="text-lg font-bold text-accent-primary mt-2">{formatPrice(product.price)}</div>
              
              <Button 
                onClick={() => {
                  addToCart(product);
                  removeFromWishlist(product.id);
                }}
                className="w-full mt-4 gap-2 rounded-xl"
              >
                <ShoppingCart size={16} />
                Move to Cart
              </Button>
            </CardContent>
          </Card>
        ))}

        {wishlist.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Heart size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Your wishlist is empty</h3>
            <p className="text-slate-500 mb-6">Save items you love to find them easily later.</p>
            <Link href="/products">
              <Button variant="outline" className="gap-2 rounded-full px-8">
                Go Shopping
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
