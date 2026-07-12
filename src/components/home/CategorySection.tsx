'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, FreeMode, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { Category } from '../../lib/types';

export const CategorySection: React.FC<{ categories: Category[] }> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="relative py-8 border-t border-slate-100/60">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-10 gap-4 relative">
        <div className="flex flex-col items-center space-y-4">
          <span className="text-accent-primary text-sm font-bold uppercase tracking-[0.3em]">Curation</span>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-accent-primary">Nature's Categories</h2>
          <div className="h-1.5 w-24 bg-accent-primary rounded-full"></div>
        </div>

        {/* Custom Navigation Buttons for Desktop — absolute right */}
        {categories.length > 1 && (
          <div className="hidden md:flex items-center gap-4 absolute right-0 top-1/2 -translate-y-1/2">
            <button className="cat-prev-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
              <ChevronLeft className="h-6 w-6 group-active:scale-95" />
            </button>
            <button className="cat-next-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
              <ChevronRight className="h-6 w-6 group-active:scale-95" />
            </button>
          </div>
        )}
      </div>

      {/* Slider Wrapper — same width as OurServices, auto-size cards like original */}
      <div className="relative pb-14">
        <Swiper
          modules={[Navigation, Pagination, FreeMode, Autoplay]}
          spaceBetween={20}
          slidesPerView="auto"
          freeMode={{ enabled: true, momentum: true }}
          grabCursor={true}
          speed={600}
          loop={false}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            prevEl: '.cat-prev-btn',
            nextEl: '.cat-next-btn',
          }}
          pagination={{
            clickable: true,
          }}
          breakpoints={{
            640: { spaceBetween: 24 },
            1024: { spaceBetween: 32 },
          }}
          className="categories-swiper !overflow-visible"
        >
          {categories.map((category) => (
            <SwiperSlide key={category.id} className="!w-auto h-auto pb-2">
              {/* ── Original elegant card design ── */}
              <div className="group w-[240px] sm:w-[300px]">
              <Link
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className="block"
              >
                {/* Image card */}
                <div className="relative aspect-[4/5] rounded-2xl bg-bg-secondary shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-gold/20 group-hover:-translate-y-2 overflow-hidden">
                  <div className="relative h-full w-full overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />

                    {/* Green overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Explore label slides up on hover */}
                    <div className="absolute bottom-5 left-5 right-5 translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="flex items-center justify-between text-white">
                        <span className="text-xs font-bold uppercase tracking-widest">Explore</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name & count below the card */}
                <div className="mt-4 text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-accent-primary group-hover:text-gold transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">
                    {category.productCount} Pieces
                  </p>
                </div>
              </Link>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
