'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HeroSection } from '../components/home/HeroSection';
import { DecorShowcase } from '../components/home/DecorShowcase';
import { CategorySection } from '../components/home/CategorySection';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { FlashSale } from '../components/home/FlashSale';
import { SpecialOffer } from '../components/home/SpecialOffer';
import { ProductOfTheDay } from '../components/home/ProductOfTheDay';
import { WhyChooseUs } from '../components/home/WhyChooseUs';
import { NewArrivals } from '../components/home/NewArrivals';
import { Newsletter } from '../components/home/Newsletter';
import { FAQSection } from '../components/home/FAQSection';
import { CustomDesignCTA } from '../components/home/CustomDesignCTA';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import { Product } from '../lib/types';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [dailyProducts, setDailyProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchData() {
      if (!supabase) return;
      setLoading(true);

      // Fetch Categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*, products(count)')
        .eq('is_active', true);

      if (catData) {
        setCategories(catData.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image_url || '/images/category-placeholder.jpg',
          productCount: c.products?.[0]?.count || 0
        })));
      }

      // 1. Fetch Best Selling Products
      const { data: bestSellingData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .eq('is_best_selling', true)
        .order('created_at', { ascending: false })
        .limit(8);

      // 2. Fetch New Arrivals
      const { data: newArrivalsData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .eq('is_new_arrival', true)
        .order('created_at', { ascending: false })
        .limit(4);

      // 3. Fetch Product of the Day
      const { data: productDayData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .eq('is_product_of_the_day', true)
        .limit(1);

      // 4. Fetch All Products (Latest)
      const { data: allProdData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      const mapProduct = (p: any): Product => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        discountPrice: p.compare_price ? Number(p.compare_price) : undefined,
        images: p.images || [],
        category: p.categories?.name || 'Uncategorized',
        rating: 4.5,
        reviewCount: 12,
        stock: p.stock || 0,
        tags: [],
        isNew: !!p.is_new_arrival,
        isFeatured: !!p.is_best_selling,
        is_best_selling: !!p.is_best_selling,
        is_new_arrival: !!p.is_new_arrival,
        is_product_of_the_day: !!p.is_product_of_the_day
      });

      if (bestSellingData) setFeaturedProducts(bestSellingData.map(mapProduct));
      if (newArrivalsData) setNewArrivals(newArrivalsData.map(mapProduct));
      if (productDayData) setDailyProducts(productDayData.map(mapProduct));
      if (allProdData) setAllProducts(allProdData.map(mapProduct));
      
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 sm:space-y-16 pb-12 sm:pb-24"
    >
      <HeroSection />

      <DecorShowcase />

      <div id="categories" className="max-w-7xl mx-auto px-6">
        <CategorySection categories={categories} />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <FeaturedProducts 
          title="Best Selling Products" 
          subtitle="Top Favorites" 
          limit={8} 
          products={featuredProducts}
        />
      </div>

      <FlashSale />

      <div className="max-w-7xl mx-auto px-6">
        <NewArrivals products={newArrivals} />
      </div>

      <SpecialOffer />

      <div className="max-w-7xl mx-auto px-6">
        <FeaturedProducts 
          title="Our Collection" 
          subtitle="Latest Discoveries" 
          limit={8} 
          products={allProducts}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <ProductOfTheDay products={dailyProducts} />
      </div>

      <WhyChooseUs />

      <CustomDesignCTA />

      <div className="max-w-7xl mx-auto px-6">
        <FAQSection />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <Newsletter />
      </div>
    </motion.div>
  );
}
