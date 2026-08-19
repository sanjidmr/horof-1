import React from 'react';
import { buildMeta } from '@/lib/seo';
import type { Metadata } from 'next';
import { HeroSection } from '../components/home/HeroSection';
import { DecorShowcase } from '../components/home/DecorShowcase';
import { CategorySection } from '../components/home/CategorySection';
import { FeaturedProducts } from '../components/home/FeaturedProducts';
import { FlashSale } from '../components/home/FlashSale';
import { SpecialOffer } from '../components/home/SpecialOffer';
import { ProductOfTheDay } from '../components/home/ProductOfTheDay';
import { WhyChooseUs } from '../components/home/WhyChooseUs';
import { NewArrivals } from '../components/home/NewArrivals';
import { FAQSection } from '../components/home/FAQSection';
import { CustomDesignCTA } from '../components/home/CustomDesignCTA';
import { DesignRequestForm } from '../components/home/DesignRequestForm';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { extractProductImages } from '../lib/store/extract-images';
import { Product } from '../lib/types';
import { HomeMotionWrapper } from '../components/home/HomeMotionWrapper';
import { OurServices } from '../components/home/OurServices';
import { IoLogoWhatsapp } from 'react-icons/io';
import { Mail, Phone, MessageSquare } from 'lucide-react';

export const metadata: Metadata = buildMeta({
  title: 'Horof - Premium Wood Crafts',
  description: 'Discover premium handcrafted wood crafts, DIY supplies, and home decor from Bangladesh. Shop unique wooden masterpieces at Horof.',
  path: '/',
});

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: catData },
    { data: bestSellingData },
    { data: newArrivalsData },
    { data: productDayData },
    { data: decorImages },
    { data: heroData },
    { data: heroContent },
    { data: servicesData }
  ] = await Promise.all([
    supabase.from('categories').select('*, products(count)').eq('is_active', true),
    supabase
      .from('products')
      .select('*, product_images(url,sort_order), categories(name), reviews(rating)')
      .eq('is_active', true)
      .eq('section', 'best_selling')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('*, product_images(url,sort_order), categories(name), reviews(rating)')
      .eq('is_active', true)
      .eq('section', 'new_arrival')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('products')
      .select('*, product_images(url,sort_order), categories(name), reviews(rating)')
      .eq('is_active', true)
      .eq('section', 'product_of_the_day')
      .limit(4),
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
      .select('*, categories(name, slug)')
      .eq('section', 'services')
      .order('created_at', { ascending: true })
  ]);

  const categories = catData
    ? catData.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image_url || '/images/category-placeholder.jpg',
      productCount: c.products?.[0]?.count || 0
    }))
    : [];

  const mapProduct = (p: any): Product => {
    const reviews = (p.reviews ?? []).filter((r: any) => r.rating >= 1);
    const reviewCount = reviews.length;
    const rating = reviewCount > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount : 0;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      discountPrice: p.compare_price ? Number(p.compare_price) : undefined,
      images: extractProductImages(p.product_images),
      category: p.categories?.name || 'Uncategorized',
      rating,
      reviewCount,
      stock: p.stock || 0,
      tags: [],
      isNew: p.section === 'new_arrival',
      isFeatured: p.section === 'best_selling',
    };
  };

  const featuredProducts = bestSellingData ? bestSellingData.map(mapProduct) : [];
  const newArrivals = newArrivalsData ? newArrivalsData.map(mapProduct) : [];
  const dailyProducts = productDayData ? productDayData.map(mapProduct) : [];
  const initialDecorImages = decorImages || [];
  const heroImage = heroData?.image_url || '';
  const subtitleNormal = heroContent?.subtitle_normal || undefined;
  const subtitleBold = heroContent?.subtitle_bold || undefined;

  // Resolve each service's linked category (via site_images.category_id)
  // so the "Products" button can reuse the existing /category/<slug> route.
  const services = (servicesData || []).map((s: any) => ({
    ...s,
    categorySlug: s.categories?.slug || undefined,
  }));

  return (
    <HomeMotionWrapper>
      <HeroSection
        initialImage={heroImage}
        initialSubtitleNormal={subtitleNormal}
        initialSubtitleBold={subtitleBold}
      />
      <DecorShowcase initialImages={initialDecorImages} />
      <div id="categories" className="max-w-[1400px] mx-auto px-6">
        <CategorySection categories={categories} />
      </div>
      <div className="max-w-[1400px] mx-auto px-6">
        <FeaturedProducts
          title="Best Selling Products"
          subtitle="Top Favorites"
          limit={8}
          products={featuredProducts}
        />
      </div>
      <div className="max-w-[1400px] mx-auto px-6">
        <OurServices services={services} />
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
      <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-12">
        <DesignRequestForm />
        <div className="bg-white border-t border-slate-100 pt-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0F4F0] text-slate-800 text-sm font-bold uppercase tracking-wider mb-6">
              <MessageSquare className="w-4 h-4" /> Get In Touch
            </div>
            <div className="space-y-4 text-slate-600">
              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/01877292706"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#20ba5a] transition-all font-bold uppercase tracking-wider text-xs"
                >
                  <IoLogoWhatsapp className="w-4 h-4" /> Chat on WhatsApp
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href="mailto:info@horof.com" className="hover:underline font-semibold">info@horof.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>+880 1723 8900 / +880 1938 4948</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HomeMotionWrapper>
  );
}