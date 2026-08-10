import React from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from '../product/ProductCard';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ProductOfTheDay: React.FC<{ products: Product[] }> = ({ products }) => {
  const dailyProducts = products.slice(0, 4);

  return (
    <section className="pt-8 pb-2 md:pt-12 md:pb-4">
      <div className="flex flex-col items-center text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-gold/10 rounded-full border border-gold/20">
          <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span className="text-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.4em]">Limited Selection</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-display font-bold text-accent-primary leading-tight">
          Product Of The <span className="text-accent-light italic">Day</span>
        </h2>



      </div>

      <div className="flex flex-wrap justify-center gap-6 sm:gap-8 max-w-7xl mx-auto px-4 md:px-8">
        {dailyProducts.map((product) => (
          <div
            key={product.id}
            className={cn(
              "relative group w-[calc(50%-12px)] sm:w-full sm:max-w-[320px] transition-all duration-500",
              dailyProducts.length === 1 && "w-full max-w-[360px]"
            )}
          >
            {/* Gold Badge for Deal of the Day */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-gold via-amber-500 to-gold text-white font-bold text-[9px] md:text-[10px] tracking-[0.2em] uppercase px-4 py-1.5 rounded-full shadow-lg border border-white/20 group-hover:-translate-y-2.5 transition-all duration-500 whitespace-nowrap">
              Deal of the Day
            </div>

            {/* Spotlight Glow Effect - permanently visible highlighting the card */}
            <div className="absolute -inset-2 bg-gradient-to-r from-gold/30 to-amber-500/20 rounded-[2.2rem] opacity-60 blur-md group-hover:opacity-100 group-hover:blur-lg group-hover:-translate-y-2 transition-all duration-500"></div>

            {/* Glowing border outline */}
            <div className="absolute inset-0 rounded-3xl border-2 border-gold/40 shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:border-gold/80 group-hover:-translate-y-2 transition-all duration-500 pointer-events-none z-10"></div>

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
