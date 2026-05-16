import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

import { Category } from '../../lib/types';

export const CategorySection: React.FC<{ categories: Category[] }> = ({ categories }) => {
  return (
    <div className="relative py-6">
      <div className="flex flex-col items-center text-center md:flex-row md:items-end md:justify-between mb-12 gap-6">
        <div className="flex flex-col items-center md:items-start space-y-4">
          <span className="text-accent-hover text-xs font-bold uppercase tracking-[0.3em]">Curation</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-accent-primary">Nature's Categories</h2>
          <div className="h-1 w-20 bg-accent-primary rounded-full"></div>
        </div>

        {/* Custom Navigation Buttons for Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <button className="swiper-prev-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group">
            <ChevronLeft className="h-6 w-6 group-active:scale-95" />
          </button>
          <button className="swiper-next-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group">
            <ChevronRight className="h-6 w-6 group-active:scale-95" />
          </button>
        </div>
      </div>

      <Swiper
        modules={[Navigation, FreeMode, Autoplay]}
        spaceBetween={20}
        slidesPerView="auto"
        freeMode={{
          enabled: true,
          momentum: true,
        }}
        speed={800}
        grabCursor={true}
        navigation={{
          prevEl: '.swiper-prev-btn',
          nextEl: '.swiper-next-btn',
        }}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        breakpoints={{
          640: { spaceBetween: 24 },
          1024: { spaceBetween: 32 }
        }}
        className="categories-swiper !overflow-visible"
      >
        {categories.map((category, index) => (
          <SwiperSlide key={category.id} className="!w-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group relative w-[180px] sm:w-[220px]"
            >
              <Link href={`/category/${category.slug}`} className="block">
                {/* Seamless Elegant Card */}
                <div className="relative aspect-[4/5] rounded-2xl bg-bg-secondary border-none shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-gold/20 group-hover:-translate-y-2 overflow-hidden">

                  {/* Image Container */}
                  <div className="relative h-full w-full overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />

                    {/* Glass Overlay for Content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Info available on hover */}
                    <div className="absolute bottom-4 left-4 right-4 translate-y-8 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="flex items-center justify-between text-white">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Explore</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-label below the card */}
                <div className="mt-4 text-center space-y-1">
                  <h3 className="text-lg font-display font-bold text-accent-primary group-hover:text-gold transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                    {category.productCount} Pieces
                  </p>
                </div>
              </Link>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
