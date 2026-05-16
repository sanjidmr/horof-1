import React from 'react';
import { Product } from '../../lib/types';
import { ProductCard } from '../product/ProductCard';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  products: Product[];
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({ 
  title = "Featured Collection", 
  subtitle = "Masterpieces", 
  limit = 8,
  products
}) => {
  const featured = products.slice(0, limit);

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center text-center space-y-4">
        <span className="text-accent-hover text-xs font-bold uppercase tracking-[0.3em]">{subtitle}</span>
        <h2 className="text-4xl md:text-5xl font-display font-bold text-accent-primary">{title}</h2>
        <div className="h-1 w-20 bg-accent-primary rounded-full"></div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        {featured.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
