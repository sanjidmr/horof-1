'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, HelpCircle, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  image: string;
  category: string;
  stock: number;
}

interface DynamicCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export const PremiumSearch: React.FC<PremiumSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Reset states on modal close/open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setSuggestions([]);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories dynamically from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, image_url')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) throw error;

        if (data) {
          const mapped: DynamicCategory[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image_url || '/images/c1.jpg',
          }));
          setCategories(mapped);
        }
      } catch (err: any) {
        console.error('Error fetching categories from Supabase:', err.message || err);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, supabase]);

  // Fetch product suggestions dynamically from Supabase
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, price, compare_price, stock, is_active, images, categories(name)')
          .eq('is_active', true)
          .gt('stock', 0)
          .ilike('name', `%${debouncedQuery}%`)
          .limit(6);

        if (error) throw error;

        if (data) {
          const mapped: Suggestion[] = data.map((r: any) => {
            const categoryName = Array.isArray(r.categories)
              ? r.categories[0]?.name
              : r.categories?.name;

            const image = Array.isArray(r.images) && r.images.length > 0 
              ? r.images[0] 
              : '/images/about.jpg';

            const priceVal = typeof r.price === 'string' ? parseFloat(r.price) : Number(r.price);
            const comparePriceVal = r.compare_price != null 
              ? (typeof r.compare_price === 'string' ? parseFloat(r.compare_price) : Number(r.compare_price)) 
              : undefined;

            const hasDiscount = comparePriceVal && comparePriceVal > priceVal;
            const finalPrice = hasDiscount ? comparePriceVal : priceVal;
            const finalDiscount = hasDiscount ? priceVal : undefined;

            return {
              id: r.id,
              name: r.name,
              slug: r.slug,
              price: finalPrice,
              discountPrice: finalDiscount,
              image: image || '/images/about.jpg',
              category: categoryName || 'General',
              stock: r.stock,
            };
          });

          setSuggestions(mapped);
          setActiveIndex(-1);
        }
      } catch (err: any) {
        console.error('Error fetching suggestions:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, supabase]);

  // Close search on Escape key press
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose]);

  // Prevent scroll when search modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      const selected = suggestions[activeIndex];
      router.push(`/products/${selected.id}`);
      onClose();
    } else if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        router.push(`/products/${selected.id}`);
        onClose();
      }
    }
  };

  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-amber-100 text-[#1A3320] font-semibold px-0.5 rounded transition-all">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[240]"
            onClick={onClose}
          />

          {/* Smooth Top Slide-down Search Panel (covers half screen) */}
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 left-0 right-0 z-[250] bg-white border-b border-slate-200/80 shadow-2xl p-6 md:p-10 flex flex-col min-h-[45vh] max-h-[75vh] overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
              
              {/* Input & Form Area */}
              <div className="flex items-center gap-4 relative">
                <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-3 py-3 px-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors focus-within:border-emerald-600/30 focus-within:ring-4 focus-within:ring-emerald-600/5 focus-within:bg-white transition-all duration-300">
                  <Search size={22} className={cn("transition-colors duration-300", isFocused ? "text-emerald-600" : "text-slate-400")} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for premium decor, wall art, heritage, woodcraft..."
                    className="flex-1 text-base bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 py-1.5 w-full font-medium"
                  />
                </form>
                
                {/* Close Button Details */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-1 bg-slate-100 text-slate-450 rounded-md border border-slate-200/50">
                    ESC
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-3 hover:bg-slate-100 text-slate-450 hover:text-slate-700 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center"
                    title="Close Search"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Suggestions / Categories Drawer Area */}
              <div className="w-full">
                {isLoading ? (
                  /* Loading Skeletons */
                  <div className="space-y-2 py-2">
                    <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse mb-3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-white">
                          <div className="h-14 w-14 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-3 w-1/4 bg-slate-100 rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                          </div>
                          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : searchQuery.trim() !== '' ? (
                  suggestions.length > 0 ? (
                    /* Suggestions List */
                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Matching Masterpieces</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suggestions.map((item, index) => (
                          <Link
                            href={`/products/${item.id}`}
                            key={item.id}
                            className={cn(
                              "flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 border bg-slate-50/20 hover:bg-slate-50/70",
                              index === activeIndex
                                ? "bg-[#1A3320]/5 border-[#1A3320]/15 translate-x-1"
                                : "border-slate-100"
                            )}
                            onClick={onClose}
                            onMouseEnter={() => setActiveIndex(index)}
                          >
                            {/* Product Thumbnail */}
                            <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 flex-shrink-0">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                                priority
                              />
                            </div>

                            {/* Details info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-[#1A3320] bg-[#1A3320]/5 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {highlightText(item.category, searchQuery)}
                                </span>
                                {item.stock <= 3 && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-55/60 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                    Only {item.stock} left
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-semibold text-slate-800 mt-1 truncate leading-snug">
                                {highlightText(item.name, searchQuery)}
                              </h4>
                            </div>

                            {/* Prices */}
                            <div className="text-right flex-shrink-0 pl-2">
                              <div className="text-sm font-bold text-slate-900">
                                {formatPrice(item.discountPrice || item.price)}
                              </div>
                              {item.discountPrice && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  {formatPrice(item.price)}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* No matching product exists */
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                        <HelpCircle className="h-6 w-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No products found</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                        We couldn&apos;t find any active, in-stock products matching &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;.
                      </p>
                    </div>
                  )
                ) : (
                  /* Dynamic Categories fetched from Supabase (Syncs automatically with admin) */
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={12} className="text-emerald-600" />
                      <span>Browse Categories (Synced with Database)</span>
                    </div>
                    {categories.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              router.push(`/products?category=${encodeURIComponent(cat.slug)}`);
                              onClose();
                            }}
                            className="group flex flex-col items-center text-center cursor-pointer p-3 rounded-2xl border border-slate-100 hover:border-emerald-600/25 bg-slate-50/20 hover:bg-slate-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                          >
                            <div className="relative h-14 w-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 transition-colors group-hover:border-emerald-600 flex-shrink-0">
                              <Image
                                src={cat.image}
                                alt={cat.name}
                                fill
                                sizes="56px"
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 mt-3.5 uppercase tracking-wider line-clamp-1 group-hover:text-emerald-700 transition-colors">
                              {cat.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-450 italic py-4 pl-1">
                        No categories found in the database.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

