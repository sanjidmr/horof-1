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
  title = "Featured Collection", 
  subtitle = "Masterpieces", 
  limit = 8,
  products
}) => {
  const featured = products.slice(0, limit);

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-6">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-4">
          <span className="text-accent-hover text-xs font-bold uppercase tracking-[0.3em]">{subtitle}</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-accent-primary">{title}</h2>
          <div className="h-1 w-20 bg-accent-primary rounded-full"></div>
        </div>

        {/* Custom Navigation Buttons for Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <button className="featured-prev-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
            <ChevronLeft className="h-6 w-6 group-active:scale-95" />
          </button>
          <button className="featured-next-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
            <ChevronRight className="h-6 w-6 group-active:scale-95" />
          </button>
        </div>
      </div>
      
      {/* Slider Wrapper */}
      <div className="relative px-1 pb-12">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={16}
          slidesPerView={1}
          grabCursor={true}
          speed={600}
          loop={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
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
              spaceBetween: 20
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 28
            }
          }}
          className="featured-products-swiper !overflow-visible"
        >
          {featured.map((product) => (
            <SwiperSlide key={product.id} className="h-auto py-2">
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

