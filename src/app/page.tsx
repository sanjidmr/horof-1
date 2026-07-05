import React from 'react';
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
import { createSupabaseServerClient } from '../lib/supabase/server';
import { Product } from '../lib/types';
import { HomeMotionWrapper } from '../components/home/HomeMotionWrapper';
import { OurServices } from '../components/home/OurServices';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  // Fetch all home page data server-side in parallel
  const [
    { data: catData },
    { data: bestSellingData },
    { data: newArrivalsData },
    { data: productDayData },
    { data: allProdData },
    { data: decorImages },
    { data: heroData },
    { data: heroContent },
    { data: servicesData }
  ] = await Promise.all([
    supabase.from('categories').select('*, products(count)').eq('is_active', true),
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .eq('is_best_selling', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .eq('is_new_arrival', true)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .eq('is_product_of_the_day', true)
      .limit(4),
    supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('site_images')
      .select('*')
      .like('section', 'decor-%'),
    supabase
      .from('site_images')
      .select('image_url')
      .eq('section', 'hero')
      .maybeSingle(),
    supabase
      .from('hero_content')
      .select('subtitle_normal, subtitle_bold')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('site_images')
      .select('*')
      .eq('section', 'services')
      .order('created_at', { ascending: true })
  ]);

  // Format Categories
  const categories = catData
    ? catData.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image_url || '/images/category-placeholder.jpg',
      productCount: c.products?.[0]?.count || 0
    }))
    : [];

  // Helper to map products
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

  const featuredProducts = bestSellingData ? bestSellingData.map(mapProduct) : [];
  const newArrivals = newArrivalsData ? newArrivalsData.map(mapProduct) : [];
  const dailyProducts = productDayData ? productDayData.map(mapProduct) : [];
  const allProducts = allProdData ? allProdData.map(mapProduct) : [];

  const initialDecorImages = decorImages || [];
  const heroImage = heroData?.image_url || '';
  const subtitleNormal = heroContent?.subtitle_normal || undefined;
  const subtitleBold = heroContent?.subtitle_bold || undefined;

  return (
    <HomeMotionWrapper>
      <HeroSection
        initialImage={heroImage}
        initialSubtitleNormal={subtitleNormal}
        initialSubtitleBold={subtitleBold}
      />

      <DecorShowcase initialImages={initialDecorImages} />

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

      <div className="max-w-[1400px] mx-auto px-6 mt-16">
        <OurServices services={servicesData || []} />
      </div>

      <FlashSale />

      <div className="max-w-7xl mx-auto px-6">
        <NewArrivals products={newArrivals} />
      </div>

      <SpecialOffer />


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
    </HomeMotionWrapper>
  );
}
