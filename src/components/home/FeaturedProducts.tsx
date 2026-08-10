'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Product } from '../../lib/types';
import { ProductCard } from '../product/ProductCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  products: Product[];
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title = 'Featured Collection',
  subtitle = 'Masterpieces',
  limit = 8,
  products,
}) => {
  const featured = products.slice(0, limit);

  if (!featured || featured.length === 0) return null;

  return (
    <div className="relative py-8 border-t border-slate-100/60">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-10 gap-4 relative">
        <div className="flex flex-col items-center space-y-4">
          <span className="text-accent-primary text-sm font-bold uppercase tracking-[0.3em]">{subtitle}</span>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-accent-primary">{title}</h2>
          <div className="h-1.5 w-24 bg-accent-primary rounded-full"></div>
        </div>

        {/* Custom Navigation Buttons for Desktop — absolute right */}
        {featured.length > 1 && (
          <div className="hidden md:flex items-center gap-4 absolute right-0 top-1/2 -translate-y-1/2">
            <button className="featured-prev-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
              <ChevronLeft className="h-6 w-6 group-active:scale-95" />
            </button>
            <button className="featured-next-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
              <ChevronRight className="h-6 w-6 group-active:scale-95" />
            </button>
          </div>
        )}
      </div>

      {/* Slider Wrapper — no side padding on mobile so card fills full width */}
      <div className="relative -mx-6 sm:mx-0 pb-14">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          grabCursor={true}
          speed={400}
          loop={featured.length > 1}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            prevEl: '.featured-prev-btn',
            nextEl: '.featured-next-btn',
          }}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 24,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 32,
            },
          }}
          className="featured-products-swiper"
        >
          {featured.map((product) => (
            <SwiperSlide key={product.id} className="h-auto pb-2">
              <div className="h-full">
                <ProductCard product={product} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
