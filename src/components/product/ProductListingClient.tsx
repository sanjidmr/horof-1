'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronLeft, ChevronRight, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Button } from '../ui/Button';
import { Checkbox } from '../shadcn/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select';
import { Separator } from '../shadcn/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../shadcn/sheet';
import type { Product, Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductListingClientProps {
  initialProducts: Product[];
  total: number;
  categories: Category[];
  brands: any[];
  currentPage: number;
}

export const ProductListingClient: React.FC<ProductListingClientProps> = ({
  initialProducts,
  total,
  categories,
  brands,
  currentPage,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1'); // Reset to page 1 on filter change
    router.push(`/products?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/products?${params.toString()}`);
  };

  const currentCategory = searchParams.get('category');
  const currentBrand = searchParams.get('brand');
  const currentSort = searchParams.get('sort') || 'newest';

  const FilterContent = () => (
    <div className="space-y-8">
      {/* Categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Categories</h3>
        <div className="space-y-2">
          <button
            onClick={() => updateParams({ category: undefined })}
            className={cn(
              "block text-sm transition-colors hover:text-accent-primary",
              !currentCategory ? "font-bold text-accent-primary" : "text-slate-600"
            )}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParams({ category: cat.slug })}
              className={cn(
                "block text-sm transition-colors hover:text-accent-primary text-left w-full",
                currentCategory === cat.slug ? "font-bold text-accent-primary" : "text-slate-600"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Brands */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Brands</h3>
        <div className="space-y-2">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center space-x-2">
              <Checkbox
                id={brand.id}
                checked={currentBrand === brand.id}
                onCheckedChange={(checked) => {
                  updateParams({ brand: checked ? brand.id : undefined });
                }}
              />
              <label
                htmlFor={brand.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
              >
                {brand.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Price Range</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full h-10 px-3 border rounded-md text-sm"
            onBlur={(e) => updateParams({ minPrice: e.target.value })}
            defaultValue={searchParams.get('minPrice') || ''}
          />
          <input
            type="number"
            placeholder="Max"
            className="w-full h-10 px-3 border rounded-md text-sm"
            onBlur={(e) => updateParams({ maxPrice: e.target.value })}
            defaultValue={searchParams.get('maxPrice') || ''}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-900">Products ({total})</h1>
            <div className="hidden md:flex items-center gap-2 border-l pl-4">
              <button
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-md", viewMode === 'grid' ? "bg-slate-100 text-slate-900" : "text-slate-400")}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-md", viewMode === 'list' ? "bg-slate-100 text-slate-900" : "text-slate-400")}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sort by:</span>
              <Select value={currentSort} onValueChange={(v) => updateParams({ sort: v })}>
                <SelectTrigger className="w-[180px] h-9 border-none bg-slate-50">
                  <SelectValue placeholder="Newest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="best_selling">Best Selling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden gap-2">
                  <SlidersHorizontal size={16} />
                  Cetagory
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Cetagory</SheetTitle>
                </SheetHeader>
                <div className="py-6 h-full overflow-y-auto">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-12">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32">
              <FilterContent />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {initialProducts.length > 0 ? (
              <div className={cn(
                "grid gap-6 sm:gap-8",
                viewMode === 'grid' ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" : "grid-cols-1"
              )}>
                {initialProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <X className="text-slate-400 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500 max-w-sm">
                  We couldn't find any products matching your filters. Try adjusting your search or filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-8 rounded-full px-8"
                  onClick={() => router.push('/products')}
                >
                  Clear All Filters
                </Button>
              </div>
            )}

            {/* Pagination */}
            {total > 12 && (
              <div className="mt-20 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="rounded-full"
                >
                  <ChevronLeft size={20} />
                </Button>
                <span className="text-sm font-bold text-slate-900">
                  Page {currentPage} of {Math.ceil(total / 12)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= Math.ceil(total / 12)}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="rounded-full"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
