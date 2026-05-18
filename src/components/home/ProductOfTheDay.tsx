import React from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from '../product/ProductCard';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ProductOfTheDay: React.FC<{ products: Product[] }> = ({ products }) => {
  const dailyProducts = products.slice(0, 4);

  return (
    <section className="pt-16 pb-2 md:pt-24 md:pb-4">
      <div className="flex flex-col items-center text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-gold/10 rounded-full border border-gold/20">
          <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span className="text-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.4em]">Limited Selection</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-display font-bold text-accent-primary leading-tight">
          Product Of The <span className="text-accent-light italic">Day</span>
        </h2>



      </div>

      <div className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto",
        dailyProducts.length === 1 && "grid-cols-1 flex justify-center"
      )}>
        {dailyProducts.map((product) => (
          <div
            key={product.id}
            className={cn(
              "relative group w-full max-w-[260px] mx-auto", // কার্ডের সাইজ ছোট রাখার জন্য max-w-[260px] দেওয়া হয়েছে
              dailyProducts.length === 1 && "max-w-[280px]" // ১টা প্রোডাক্ট থাকলে সামান্য বড় দেখাবে
            )}
          >
            {/* Spotlight Glow Effect - কার্ড ছোট হওয়ায় গ্লো ইফেক্টও একটু কমিয়ে আনা হয়েছে */}
            <div className="absolute -inset-1.5 bg-gradient-to-b from-gold/20 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-lg"></div>

            <div className="relative">
              <ProductCard product={product} />
            </div>
          </div>
        ))}
      </div>

      {/* Visual Separator */}
      <div className="mt-6 md:mt-10 w-full h-[1px] bg-gradient-to-r from-transparent via-border-forest to-transparent opacity-50"></div>
    </section>
  );
};
