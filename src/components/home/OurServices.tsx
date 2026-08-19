'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface ServiceItem {
  id: string;
  image_url: string;
  title: string;
  subtitle: string;
  description: string;
  categorySlug?: string;
}

interface OurServicesProps {
  services: ServiceItem[];
}

export const OurServices: React.FC<OurServicesProps> = ({ services }) => {
  if (!services || services.length === 0) return null;

  return (
    <div className="relative py-8 border-t border-slate-100/60">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-10 gap-4 relative">
        <div className="flex flex-col items-center space-y-4">
          <span className="text-accent-primary text-sm font-bold uppercase tracking-[0.3em]">Specialties</span>
          <h2 className="text-5xl md:text-6xl font-display font-bold text-accent-primary">Our Services</h2>
          <div className="h-1.5 w-24 bg-accent-primary rounded-full"></div>
        </div>

        {/* Custom Navigation Buttons for Desktop — absolute right */}
        {services.length > 1 && (
          <div className="hidden md:flex items-center gap-4 absolute right-0 top-1/2 -translate-y-1/2">
            <button className="services-prev-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
              <ChevronLeft className="h-6 w-6 group-active:scale-95" />
            </button>
            <button className="services-next-btn h-12 w-12 rounded-full border border-border-forest flex items-center justify-center text-accent-primary hover:bg-accent-primary hover:text-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
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
          loop={services.length > 1}
          autoplay={{
            delay: 1500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            prevEl: '.services-prev-btn',
            nextEl: '.services-next-btn',
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
          className="services-swiper"
        >
          {services.map((item) => (
            <SwiperSlide key={item.id} className="h-auto pb-2">
              <div className="group bg-white overflow-hidden border-0 sm:border sm:border-slate-100 sm:rounded-3xl shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_24px_60px_rgba(26,51,32,0.10)] transition-all duration-500 sm:hover:-translate-y-2 flex flex-col h-full">

                {/* Image Area — square on mobile, 4/3 on larger */}
                <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-bg-secondary sm:rounded-t-3xl">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  {/* Gradient overlay bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>

                {/* Content Area: Title → Semi-Tagline (dark green) → Description */}
                <div className="p-5 sm:p-7 flex-1 flex flex-col space-y-2.5 bg-white">
                  <h3 className="text-2xl sm:text-2xl md:text-3xl font-display font-bold text-slate-800 group-hover:text-accent-hover transition-colors leading-tight">
                    {item.title}
                  </h3>
                  <span className="text-xs sm:text-sm font-bold text-accent-primary uppercase tracking-[0.25em]">
                    {item.subtitle}
                  </span>
                  <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-normal pt-1">
                    {item.description}
                  </p>
                  {item.categorySlug && (
                    <Link
                      href={`/category/${item.categorySlug}`}
                      className="mt-auto pt-3 inline-flex items-center gap-2 text-sm font-bold text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      Products
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
