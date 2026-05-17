'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Leaf, Truck, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'Art Soul',
    desc: 'Hand-carved by master craftsmen with heritage techniques.'
  },
  {
    icon: Leaf,
    title: 'Earth First',
    desc: 'Sustainable walnut & mahogany sourced from certified forests.'
  },
  {
    icon: Truck,
    title: 'Safe-Shipping',
    desc: 'Rapid delivery with secure, premium eco-packaging.'
  },
  {
    icon: ShieldCheck,
    title: 'Heritage Quality',
    desc: 'Heirloom-grade builds designed to last for generations.'
  }
];

export const WhyChooseUs: React.FC = () => {
  return (
    <section className="bg-white pt-6 sm:pt-10 pb-6 sm:pb-20 relative overflow-hidden border-t border-b border-border-forest/30">
      {/* Decorative Radiance - More subtle for white BG */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-primary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-3 mb-16">
          <span className="text-gold text-[10px] font-bold uppercase tracking-[0.4em]">Excellence</span>
          <h2 className="text-3xl md:text-5xl font-display font-medium text-accent-primary tracking-tight">Why Horof</h2>
          <div className="h-0.5 w-16 bg-gold/50 rounded-full"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center space-y-4 group"
            >
              <div className="h-14 w-14 bg-white rounded-2xl border border-accent-primary/20 flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-[0_10px_30px_-10px_rgba(20,45,34,0.1)]">
                <feature.icon className="h-7 w-7 text-accent-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-accent-primary tracking-wide">{feature.title}</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed max-w-[160px] mx-auto">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
