import React from 'react';
import { products } from '../../lib/mockData';
import { ProductCard } from '../product/ProductCard';
import { Sparkles } from 'lucide-react';

export const ProductOfTheDay: React.FC = () => {
  // Selecting specific products for this specialized section
  const selectedProductIds = ['p21', 'p22', 'p23', 'p24'];
  const dailyProducts = products.filter(p => selectedProductIds.includes(p.id));

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 max-w-7xl mx-auto">
        {dailyProducts.map((product) => (
          <div key={product.id} className="relative group">
            {/* Spotlight Glow Effect on Hover */}
            <div className="absolute -inset-2 bg-gradient-to-b from-gold/20 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl"></div>
            <div className="relative">
              <ProductCard product={product} />
              
              {/* Optional: Add a "Daily Selection" badge if needed, 
                  but ProductCard might already have badges. 
                  Let's keep it clean since it's already in the section. */}
            </div>
          </div>
        ))}
      </div>
      
      {/* Visual Separator */}
      <div className="mt-6 md:mt-10 w-full h-[1px] bg-gradient-to-r from-transparent via-border-forest to-transparent opacity-50"></div>
    </section>
  );
};
