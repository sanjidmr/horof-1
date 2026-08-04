'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { ProductCard } from '../../components/product/ProductCard';
import { Search, SlidersHorizontal, ChevronDown, Filter } from 'lucide-react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Product } from '../../lib/types';

interface FilterSidebarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (sub: string) => void;
  categories: any[];
  subcategories: Record<string, any[]>;
  setIsMobileFilterOpen: (open: boolean) => void;
  priceRange: number;
  setPriceRange: (price: number) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  categories,
  subcategories,
  setIsMobileFilterOpen,
  priceRange,
  setPriceRange
}) => (
  <div className="space-y-12 h-full flex flex-col">
    <div className="space-y-6">
      <h3 className="text-xs font-bold text-accent-primary uppercase tracking-[0.3em] flex items-center gap-2">
        <Search className="h-4 w-4" /> Quick Find
      </h3>
      <div className="relative group">
        <input
          type="text"
          placeholder="Product name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 bg-bg-secondary border border-border-forest rounded-2xl px-6 text-sm text-accent-primary focus:border-accent-hover outline-none transition-all placeholder:text-text-muted"
        />
      </div>
    </div>

    <div className="space-y-6">
      <h3 className="text-xs font-bold text-accent-primary uppercase tracking-[0.3em] flex items-center gap-2">
        <Filter className="h-4 w-4" /> Collection
      </h3>
      <div className="space-y-2 overflow-y-auto pb-4 custom-scrollbar">
        <button
          onClick={() => { setSelectedCategory('All'); setSelectedSubcategory(''); setIsMobileFilterOpen(false); }}
          className={`w-full text-left px-6 py-3 rounded-xl text-sm transition-all border ${selectedCategory === 'All' ? 'bg-accent-primary text-white border-accent-primary font-bold shadow-lg shadow-accent-primary/20' : 'bg-white text-text-secondary border-transparent hover:border-border-forest'}`}
        >
          All Masterpieces
        </button>
        {categories.map(cat => (
          <React.Fragment key={cat.id}>
            <button
              onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategory(''); setIsMobileFilterOpen(false); }}
              className={`w-full text-left px-6 py-3 rounded-xl text-sm transition-all border ${selectedCategory === cat.name ? 'bg-accent-primary text-white border-accent-primary font-bold shadow-lg shadow-accent-primary/20' : 'bg-white text-text-secondary border-transparent hover:border-border-forest'}`}
            >
              {cat.name}
            </button>
            {selectedCategory === cat.name && subcategories[cat.id]?.length > 0 && (
              <div className="ml-4 space-y-1 border-l-2 border-accent-primary/20 pl-3 mt-1">
                <button
                  onClick={() => { setSelectedSubcategory(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-xs transition-all ${!selectedSubcategory ? 'text-accent-primary font-bold' : 'text-text-secondary hover:text-accent-primary'}`}
                >
                  All {cat.name}
                </button>
                {subcategories[cat.id].map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => { setSelectedSubcategory(sub.name); setIsMobileFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-xs transition-all ${selectedSubcategory === sub.name ? 'text-accent-primary font-bold' : 'text-text-secondary hover:text-accent-primary'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>

    <div className="space-y-8 pt-6 border-t border-border-forest">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-accent-primary uppercase tracking-[0.3em]">Price Range</h3>
        <button
          onClick={() => setPriceRange(200000)}
          className="text-[10px] font-bold text-accent-hover uppercase hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="space-y-4 px-2">
        <div className="relative h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden border border-border-forest/30">
          <motion.div
            initial={false}
            animate={{ width: `${(priceRange / 200000) * 100}%` }}
            className="absolute h-full bg-accent-primary"
          />
        </div>
        <input
          type="range"
          min="0"
          max="200000"
          step="5000"
          value={priceRange}
          onChange={(e) => setPriceRange(parseInt(e.target.value))}
          className="w-full accent-accent-primary bg-transparent -mt-5 h-1.5 rounded-lg cursor-pointer appearance-none relative z-10"
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-muted font-bold">৳০</span>
          <span className="text-xs font-bold text-accent-primary">৳{priceRange.toLocaleString()}</span>
          <span className="text-[10px] text-text-muted font-bold">৳২,০০,০০০</span>
        </div>
      </div>
    </div>
  </div>
);

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const supabase = createSupabaseBrowserClient();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const cat = searchParams.get('category');
    return cat ? decodeURIComponent(cat) : 'All';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('Newest');
  const [priceRange, setPriceRange] = useState(200000);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const subcategoriesByCategory: Record<string, any[]> = {};
  for (const sub of dbSubcategories) {
    if (!subcategoriesByCategory[sub.category_id]) subcategoriesByCategory[sub.category_id] = [];
    subcategoriesByCategory[sub.category_id].push(sub);
  }

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      setLoading(true);

      const [prodRes, catRes, subRes] = await Promise.all([
        supabase.from('products').select('*, product_images(url,sort_order), categories(name), reviews(rating)').eq('is_active', true),
        supabase.from('categories').select('*').eq('is_active', true),
        supabase.from('subcategories').select('*, categories!inner(name)').eq('is_active', true)
      ]);

      if (prodRes.data) {
        setDbProducts(prodRes.data.map(p => {
          const reviews = (p.reviews ?? []).filter((r: any) => r.rating >= 1);
          const reviewCount = reviews.length;
          const rating = reviewCount > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount : 0;
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            discountPrice: p.offer_price ? Number(p.offer_price) : undefined,
            images: (p.product_images || [])
              .slice()
              .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((i: any) => i.url)
              .filter(Boolean),
            category: p.categories?.name || 'Uncategorized',
            rating,
            reviewCount,
            stock: p.stock || 0,
            tags: [],
            isNew: true,
            createdAt: p.created_at
          };
        }));
      }

      if (catRes.data) {
        setDbCategories(catRes.data);
      }

      if (subRes.data) {
        setDbSubcategories(subRes.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    const category = searchParams.get('category');
    if (category) setSelectedCategory(decodeURIComponent(category));
  }, [searchParams]);

  const sortOptions = ['Newest', 'Price: Low to High', 'Price: High to Low', 'Top Rated'];

  const filteredProducts = dbProducts
    .filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const effectivePrice = p.discountPrice || p.price;
      const matchesPrice = effectivePrice <= priceRange;
      return matchesCategory && matchesSearch && matchesPrice;
    })
    .sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;

      switch (sortBy) {
        case 'Price: Low to High': return priceA - priceB;
        case 'Price: High to Low': return priceB - priceA;
        case 'Top Rated': return b.rating - a.rating;
        case 'Newest':
        default:
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return String(b.id).localeCompare(String(a.id));
      }
    });

  const filterProps = {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    categories: dbCategories,
    subcategories: subcategoriesByCategory,
    setIsMobileFilterOpen,
    priceRange,
    setPriceRange
  };

  if (loading) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="h-16 w-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xl font-display text-accent-primary animate-pulse">Opening the Gallery...</p>
      </div>
    );
  }

  return (
    <div className="pt-32 lg:pt-40 pb-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
        {/* Desktop Sidebar Filters */}
        <aside className="w-72 hidden lg:block space-y-12 shrink-0">
          <FilterSidebar {...filterProps} />
        </aside>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {isMobileFilterOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileFilterOpen(false)}
                className="fixed inset-0 bg-accent-primary/40 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[70] p-8 lg:hidden shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-display font-bold">Category</h2>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-bg-secondary rounded-full">
                    <Filter className="h-5 w-5 text-accent-primary" />
                  </button>
                </div>
                <FilterSidebar {...filterProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 space-y-8 lg:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border-forest pb-8 lg:pb-10">
            <div className="space-y-4">
              <span className="text-accent-hover text-[10px] font-bold uppercase tracking-[0.4em]">{filteredProducts.length} Results Found</span>
              <h2 className="text-3xl lg:text-5xl font-display font-medium text-accent-primary leading-tight">
                The <span className="text-accent-hover italic">Horof</span> Gallery
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex-1 flex items-center justify-center gap-3 h-14 bg-bg-secondary border border-border-forest rounded-2xl text-[10px] font-bold uppercase tracking-widest text-accent-primary"
              >
                <SlidersHorizontal className="h-4 w-4" />Category
              </button>
              <div className="relative flex-1 sm:flex-none">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="w-full flex items-center justify-center gap-3 h-14 px-6 lg:px-8 bg-white border border-border-forest rounded-2xl text-[10px] font-bold uppercase tracking-widest text-accent-primary hover:border-accent-hover transition-all"
                >
                  Sort: <span className="text-accent-hover">{sortBy}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white border border-border-forest rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setSortBy(option);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === option ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-10">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredProducts.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-32 text-center space-y-6"
              >
                <div className="h-24 w-24 bg-bg-secondary rounded-full flex items-center justify-center border border-border-forest mx-auto">
                  <Search className="h-10 w-10 text-text-muted" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-accent-primary">No results discovered</h3>
                  <p className="text-text-secondary">Try refining your search or exploring another collection.</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedSubcategory(''); setPriceRange(200000); }}
                  className="text-xs font-bold text-accent-hover uppercase tracking-[0.2em] underline underline-offset-8"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="pt-40 text-center">Loading Gallery...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}