'use client';

import React from 'react';
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

export default function HomePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 sm:space-y-16 pb-12 sm:pb-24"
    >
      <HeroSection />

      <DecorShowcase />

      <div id="categories" className="max-w-7xl mx-auto px-6">
        <CategorySection />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <FeaturedProducts title="Best Selling Products" subtitle="Top Favorites" limit={8} />
      </div>

      <FlashSale />

      <div className="max-w-7xl mx-auto px-6">
        <NewArrivals />
      </div>

      <SpecialOffer />

      <div className="max-w-7xl mx-auto px-6">
        <ProductOfTheDay />
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
