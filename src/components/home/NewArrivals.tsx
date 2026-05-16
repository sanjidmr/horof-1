import React from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from '../product/ProductCard';

export const NewArrivals: React.FC<{ products: Product[] }> = ({ products }) => {
  const newItems = products.slice(0, 4);

  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
        <div className="space-y-3 sm:space-y-4 flex flex-col items-center md:items-start">
          <span className="text-accent-hover text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">Freshly Cut</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-accent-primary">New Arrivals</h2>
          <div className="h-1 w-16 sm:w-20 bg-accent-primary/30 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-accent-primary" />
          </div>
        </div>
        <p className="text-text-secondary max-w-sm text-xs sm:text-sm leading-relaxed font-light">
          Stay ahead of the curve with our latest creations. Fresh from the workshop and limited in quantity.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {newItems.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
