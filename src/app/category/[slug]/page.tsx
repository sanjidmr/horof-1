'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { products, categories } from '../../../lib/mockData';
import { ProductCard } from '../../../components/product/ProductCard';
import { ChevronRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CategoryPage({ params }: PageProps) {
  const { slug } = use(params);
  const category = categories.find(c => c.slug === slug);
  const categoryProducts = products.filter(p => p.category === category?.name);

  if (!category) {
    return <div className="pt-32 pb-24 text-center">Category not found</div>;
  }

  return (
    <div className="pt-24 pb-24">
      {/* Category Hero */}
      <div className="relative h-[400px] overflow-hidden">
        <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-bg-primary/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <nav className="flex items-center gap-2 text-[10px] font-bold text-accent-hover uppercase tracking-[0.4em] mb-6">
                <Link href="/">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link href="/products">Shop</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-text-primary">{category.name}</span>
            </nav>
            <h1 className="text-6xl md:text-7xl font-display font-bold text-text-primary mb-4">{category.name}</h1>
            <p className="text-text-secondary max-w-xl text-lg leading-relaxed">
              Explore our curated collection of {category.name.toLowerCase()} handcrafted from nature's finest materials.
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20">
        <div className="flex items-center justify-between mb-12">
           <h2 className="text-3xl font-display font-bold">{categoryProducts.length} Results Found</h2>
           {/* Filters would go here */}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
           {categoryProducts.map(p => (
             <ProductCard key={p.id} product={p} />
           ))}
        </div>
      </div>
    </div>
  );
};
