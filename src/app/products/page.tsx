'use client';

import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { ProductCard } from '../../components/product/ProductCard';
import { Search, SlidersHorizontal, ChevronDown, Filter } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Product } from '../../lib/types';
import { getProductReviewSummaries } from '../../lib/store/review-summaries';

const PAGE_SIZE = 12;

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
          <div
            style={{ width: `${(priceRange / 200000) * 100}%` }}
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const cat = searchParams.get('category');
    return cat || 'All';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => searchParams.get('subcategory') || '');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());
  const [sortBy, setSortBy] = useState('Newest');
  const [priceRange, setPriceRange] = useState(200000);
  const [debouncedPriceRange, setDebouncedPriceRange] = useState(200000);
  const [page, setPage] = useState(() => {
    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPriceRange(priceRange);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [priceRange]);

  const subcategoriesByCategory: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const sub of dbSubcategories) {
      if (!map[sub.category_id]) map[sub.category_id] = [];
      map[sub.category_id].push(sub);
    }
    return map;
  }, [dbSubcategories]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function fetchFilters() {
      const [catRes, subRes] = await Promise.all([
        supabase.from('categories').select('id,name,slug,image_url').eq('is_active', true).order('name').abortSignal(controller.signal),
        supabase.from('subcategories').select('id,name,slug,category_id,sort_order').eq('is_active', true).order('sort_order').abortSignal(controller.signal),
      ]);

      if (!active || controller.signal.aborted) return;
      if (catRes.error || subRes.error) {
        const error = catRes.error ?? subRes.error;
        console.error('Unable to load product filters:', error);
        setLoadError('Product filters could not be loaded. Please try again.');
        return;
      }
      setDbCategories(catRes.data ?? []);
      setDbSubcategories(subRes.data ?? []);
    }

    void fetchFilters().catch((error: unknown) => {
      if (!active || controller.signal.aborted) return;
      console.error('Unable to load product filters:', error);
      setLoadError('Product filters could not be loaded. Please try again.');
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [supabase]);

  useEffect(() => {
    const nextSearch = searchParams.get('search') || '';
    const nextCategory = searchParams.get('category') || 'All';
    setSearchQuery(nextSearch);
    setDebouncedSearch(nextSearch.trim());
    setSelectedCategory(nextCategory);
    setSelectedSubcategory(searchParams.get('subcategory') || '');
    const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    setPage(Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;

    async function fetchProducts() {
      setLoading(true);
      setLoadError(null);

      try {
        const productRelations = [
          selectedCategory !== 'All' ? 'categories!inner(name)' : 'categories(name)',
          selectedSubcategory ? 'subcategories!inner(name)' : 'subcategories(name)',
        ].join(',');
        let query = supabase
          .from('products')
          .select(`id,name,slug,description,price,offer_price,stock,created_at,section,product_images(url,sort_order),${productRelations}`, { count: 'exact' })
          .eq('is_active', true);

        if (selectedCategory !== 'All') query = query.eq('categories.name', selectedCategory);
        if (selectedSubcategory) query = query.eq('subcategories.name', selectedSubcategory);

        const safeSearch = debouncedSearch.replace(/[\\%_(),".']/g, ' ').replace(/\s+/g, ' ').trim();
        const orFilters: string[] = [];
        if (safeSearch) {
          orFilters.push(`or(name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%)`);
        }
        if (debouncedPriceRange < 200000) {
          orFilters.push(
            `or(and(offer_price.gt.0,offer_price.lte.${debouncedPriceRange}),and(or(offer_price.is.null,offer_price.eq.0),price.lte.${debouncedPriceRange}))`
          );
        }
        if (orFilters.length === 1) {
          query = query.or(orFilters[0].slice(3, -1));
        } else if (orFilters.length > 1) {
          query = query.or(`and(${orFilters.join(',')})`);
        }

        if (sortBy === 'Price: Low to High') query = query.order('price', { ascending: true });
        else if (sortBy === 'Price: High to Low') query = query.order('price', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        const from = (page - 1) * PAGE_SIZE;
        const { data, count, error } = await query
          .range(from, from + PAGE_SIZE - 1)
          .abortSignal(controller.signal);

        if (controller.signal.aborted || currentRequest !== requestId.current) return;
        if (error) throw error;

        const reviewSummaries = await getProductReviewSummaries(
          supabase,
          (data ?? []).map((product) => product.id),
        );
        const products = (data ?? []).map((p) => {
          const reviewSummary = reviewSummaries.get(p.id);
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            discountPrice: p.offer_price ? Number(p.offer_price) : undefined,
            images: (p.product_images || [])
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((image) => image.url)
              .filter(Boolean),
            category: Array.isArray(p.categories) ? p.categories[0]?.name || 'Uncategorized' : p.categories?.name || 'Uncategorized',
            rating: reviewSummary?.rating ?? 0,
            reviewCount: reviewSummary?.reviewCount ?? 0,
            stock: p.stock || 0,
            tags: [],
            isNew: p.section === 'new_arrival',
            isFeatured: p.section === 'best_selling',
            createdAt: p.created_at,
          };
        }) as Product[];

        if (sortBy === 'Top Rated') products.sort((a, b) => b.rating - a.rating);
        setDbProducts(products);
        setTotalProducts(count ?? 0);
      } catch (error: unknown) {
        if (controller.signal.aborted || currentRequest !== requestId.current) return;
        console.error('Unable to load products:', error);
        setLoadError('Products could not be loaded. Please try again.');
      } finally {
        if (!controller.signal.aborted && currentRequest === requestId.current) setLoading(false);
      }
    }

    void fetchProducts();
    return () => controller.abort();
  }, [supabase, selectedCategory, selectedSubcategory, debouncedSearch, debouncedPriceRange, sortBy, page]);

  const sortOptions = ['Newest', 'Price: Low to High', 'Price: High to Low', 'Top Rated'];

  const updateCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    setPage(1);
  };

  const updateSubcategory = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setPage(1);
  };

  const updatePriceRange = (price: number) => {
    setPriceRange(price);
    setPage(1);
  };

  const filteredProducts = useMemo(() => dbProducts, [dbProducts]);

  const filterProps = {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory: updateCategory,
    selectedSubcategory,
    setSelectedSubcategory: updateSubcategory,
    categories: dbCategories,
    subcategories: subcategoriesByCategory,
    setIsMobileFilterOpen,
    priceRange,
    setPriceRange: updatePriceRange
  };

  if (loading && dbProducts.length === 0) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto text-center space-y-6">
        <p className="text-xl font-display text-accent-primary" role="status">Opening the Gallery...</p>
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
        {isMobileFilterOpen && (
          <>
              <div
                onClick={() => setIsMobileFilterOpen(false)}
                className="fixed inset-0 bg-accent-primary/40 backdrop-blur-sm z-[60] lg:hidden"
              />
              <aside
                className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[70] p-8 lg:hidden shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-display font-bold">Category</h2>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-bg-secondary rounded-full">
                    <Filter className="h-5 w-5 text-accent-primary" />
                  </button>
                </div>
                <FilterSidebar {...filterProps} />
              </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 space-y-8 lg:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border-forest pb-8 lg:pb-10">
            <div className="space-y-4">
              <span className="text-accent-hover text-[10px] font-bold uppercase tracking-[0.4em]">{totalProducts} Results Found</span>
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

                {isSortOpen && (
                  <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-2 w-56 bg-white border border-border-forest rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setSortBy(option);
                              setPage(1);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === option ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {loadError && (
            <p className="text-center text-sm text-red-700" role="alert">{loadError}</p>
          )}
          {loading && dbProducts.length > 0 && (
            <p className="text-sm text-text-muted" role="status">Updating products...</p>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-10">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

            {filteredProducts.length === 0 && (
              <div
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
              </div>
            )}

            {totalProducts > PAGE_SIZE && (
              <nav className="mt-12 flex items-center justify-center gap-5" aria-label="Product pages">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || loading}
                  className="rounded-xl border border-border-forest px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-text-secondary">
                  Page {page} of {Math.ceil(totalProducts / PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(Math.ceil(totalProducts / PAGE_SIZE), current + 1))}
                  disabled={page >= Math.ceil(totalProducts / PAGE_SIZE) || loading}
                  className="rounded-xl border border-border-forest px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
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