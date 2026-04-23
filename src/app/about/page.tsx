'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TreePine, Heart, Leaf, Award, Globe, Users, ShoppingBag, Clock, ArrowRight, Star, Sparkles, Quote, MapPin, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import Image from "next/image";

const stats = [
  { label: 'Masterpieces Crafted', value: '18,400+', icon: ShoppingBag, color: 'text-accent-light' },
  { label: 'Global Patrons', value: '12k+', icon: Users, color: 'text-gold' },
  { label: 'Artisan Heritage', value: '25 Years', icon: Clock, color: 'text-accent-light' },
  { label: 'Legacy Partners', value: '150+', icon: Award, color: 'text-gold' },
];

const values = [
  {
    title: "Eco-Conscious Spirit",
    description: "We exclusively source timber from naturally fallen giants or verified ethical plantations, healing the earth as we create.",
    icon: Leaf,
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800",
    accent: "bg-emerald-500/10 text-emerald-600"
  },
  {
    title: "Ancestral Mastery",
    description: "Our artisans employ hand-tools and mystical carving rituals passed down through seven generations of wood magic.",
    icon: Sparkles,
    image: "/images/c5.jpg",
    accent: "bg-gold/10 text-gold"
  },
  {
    title: "Immortal Integrity",
    description: "Every fragment undergoes a rigorous 12-point spiritual and structural inspection before receiving our royal seal.",
    icon: ShieldCheck,
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&q=80&w=800",
    accent: "bg-accent-light/10 text-accent-light"
  },
  {
    title: "Artisan Innovation",
    description: "Blending timeless techniques with contemporary aesthetics to create ergonomic poetry in wood.",
    icon: Zap,
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800",
    accent: "bg-blue-500/10 text-blue-600"
  }
];

const milestones = [
  { year: '1999', event: 'The first seed was planted in a small workshop in Chittagong.' },
  { year: '2008', event: 'Expanded to international galleries, bringing Bengali woodcraft to Gotham.' },
  { year: '2015', event: 'Patented our Eco-Seasoning method, reducing waste by 40%.' },
  { year: '2024', event: 'Launched the Heritage Foundation to train the next generation.' },
];

export default function AboutPage() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="bg-white selection:bg-accent-primary selection:text-white">
      {/* Cinematic Hero */}
      {/* Cinematic Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

        {/* Background Image */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <img
            src="/images/hero2.jpg"
            alt="Premium Artisan Decor"
            className="w-full h-full object-cover object-[50%_55%] sm:object-[50%_60%] md:object-[40%_30%]"
          />
        </motion.div>
        {/* 🔥 Dark Overlay (Top Focus) */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/80 via-black/40 to-black/60" />

        {/* Optional subtle side depth */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md shadow-2xl">
              <span className="flex h-2 w-2 rounded-full bg-gold" />
              <span className="text-[10px] font-bold text-white uppercase tracking-[0.4em]">
                Our Eternal Chronicle
              </span>
            </div>

            <h1 className="text-4xl md:text-8xl lg:text-[10rem] font-display font-medium text-white leading-none tracking-tighter">
              Origin of <br />
              <span className="text-gold italic text-accent-light">Horof</span>
            </h1>

            <p className="text-base md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed px-4">
              We don't just build furniture; we curate the silent whispers of the forest into heirlooms that define your spaces.
            </p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          style={{ opacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 text-white/50"
        >
          <span className="text-[10px] uppercase tracking-[0.5em] font-bold">
            Scroll to Explore
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="h-10 w-[1px] bg-white/30"
          />
        </motion.div>
      </section>
      {/* Philosophy Section - Interactive Storytelling */}
      <section className="py-16 lg:py-40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <div className="aspect-[4/5] rounded-3xl lg:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(4,52,44,0.15)] border-4 lg:border-8 border-white">
                  <img
                    src="images/c.jpg"
                    className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                    alt="Legacy Artisan"
                  />
                </div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-accent-primary rounded-3xl p-8 text-white hidden lg:flex flex-col justify-end gap-2 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <Quote className="h-10 w-10 text-gold opacity-50" />
                  <p className="text-lg font-display leading-tight italic">"Wood is alive; it remembers the seasons."</p>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gold">Master Malek, 56y Artisan</span>
                </div>
              </motion.div>
              {/* Floating Decorative Blobs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-[100px] -z-10" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-light/10 rounded-full blur-[100px] -z-10" />
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-block px-4 py-1.5 bg-accent-primary/5 rounded-full border border-accent-primary/10"
                >
                  <span className="text-[11px] font-bold text-accent-primary uppercase tracking-[0.3em]">Our Ethos</span>
                </motion.div>
                <h2 className="text-3xl lg:text-7xl font-display font-medium text-accent-primary leading-[1.1]">
                  Listening to the <span className="text-accent-hover italic">Heartbeat</span> of Timber
                </h2>
                <p className="text-lg lg:text-xl text-text-secondary font-light leading-relaxed max-w-xl">
                  At Horof, we believe in "Slow Craft". It's a meditative dialogue between the artisan and the grain—a refusal of the mass-produced for something that possesses a soul.
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  { icon: TreePine, title: "Curated Extraction", desc: "Every piece of wood is sourced from trees that finished their journey naturally." },
                  { icon: Zap, title: "Precision Soul", desc: "Blending 18th-century carving tools with modern spatial ergonomics." }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2 }}
                    className="flex gap-6 p-6 rounded-2xl bg-white border border-border-forest hover:shadow-xl transition-shadow group"
                  >
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-accent-primary flex items-center justify-center group-hover:bg-gold transition-colors duration-300">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-medium text-accent-primary mb-1">{item.title}</h4>
                      <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Board - Impact & Scale */}
      <section className="bg-accent-primary py-16 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent blur-3xl scale-150" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-20">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center space-y-3 lg:space-y-6 group"
              >
                <div className="relative inline-block">
                  <stat.icon className="h-6 w-6 lg:h-10 lg:w-10 text-white/40 absolute -top-2 -right-2 lg:-top-4 lg:-right-4 rotate-12 group-hover:scale-125 transition-transform" />
                  <h3 className="text-3xl lg:text-7xl font-display font-medium text-white tracking-tighter">
                    {stat.value}
                  </h3>
                </div>
                <div className="space-y-1">
                  <p className="text-gold text-[9px] lg:text-[11px] font-bold uppercase tracking-[0.4em]">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values - Masonry Style */}
      <section className="py-16 lg:py-48 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24 space-y-4 lg:space-y-6">
            <h2 className="text-3xl lg:text-6xl font-display font-medium text-accent-primary">The horof Standard</h2>
            <p className="text-base lg:text-lg text-text-muted font-light">Precision isn't a goal; it's our minimum requirement. These are the pillars we stand upon.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-10">
            {values.map((v, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -15 }}
                className="group relative h-[300px] md:h-[500px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <img src={v.image} alt={v.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/95 via-accent-primary/40 to-transparent" />

                <div className="absolute inset-0 p-4 md:p-10 flex flex-col justify-end space-y-2 md:space-y-6">
                  <div className={cn("h-10 w-10 md:h-16 md:w-16 rounded-lg md:rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20", v.accent)}>
                    <v.icon className="h-5 w-5 md:h-8 md:w-8" />
                  </div>
                  <h4 className="text-lg md:text-3xl font-display font-medium text-white tracking-tight leading-tight">{v.title}</h4>
                  <p className="text-white/70 font-light text-[10px] md:text-sm leading-relaxed translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hidden md:block">
                    {v.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section - Premium List */}
      <section className="py-16 lg:py-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            <div className="lg:w-1/3">
              <div className="lg:sticky lg:top-40 space-y-4 lg:space-y-6">
                <span className="text-gold text-xs font-bold uppercase tracking-[0.4em]">Our Timeline</span>
                <h2 className="text-3xl lg:text-5xl font-display font-medium text-accent-primary leading-tight">The Journey <br /> of a Seed</h2>
                <p className="text-text-secondary font-light">From a modest garage dream to a global hallmark of sustainability and luxury craftsmanship.</p>
              </div>
            </div>
            <div className="lg:w-2/3 border-l border-border-forest pl-8 lg:pl-20 space-y-16 lg:space-y-24">
              {milestones.map((m, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[49px] lg:-left-[91px] top-2 h-5 w-5 rounded-full bg-white border-4 border-accent-primary z-10 group-hover:bg-gold transition-colors duration-300 shadow-[0_0_0_10px_white]" />
                  <span className="text-7xl lg:text-9xl font-display font-black text-bg-secondary absolute -top-8 lg:-top-16 -left-4 lg:-left-8 pointer-events-none transition-colors group-hover:text-gold/10">
                    {m.year}
                  </span>
                  <div className="relative pt-4">
                    <h5 className="text-xl lg:text-2xl font-display font-bold text-accent-primary mb-2 lg:mb-4">{m.year}</h5>
                    <p className="text-base lg:text-xl text-text-muted font-light leading-relaxed max-w-2xl">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Global Connection CTA */}
      <section className="pt-24 lg:pt-56 pb-16 lg:pb-20 relative overflow-hidden bg-accent-primary">
        <img src="/images/hero1.jpg" className="absolute inset-0 w-full h-full object-[40%_30%] opacity-20 brightness-50" alt="Timber Texture" />
        <div className="absolute inset-0 bg-gradient-to-t from-accent-primary via-transparent to-accent-primary" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-12 lg:space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 lg:space-y-8"
          >
            <h2 className="text-4xl lg:text-8xl font-display font-medium text-white tracking-tighter leading-none">
              Start Your Own <br />
              <span className="text-gold italic">Legacy</span>
            </h2>
            <p className="text-lg lg:text-xl text-white/70 font-light max-w-2xl mx-auto">
              Our pieces aren't just bought; they're inherited. Connect with our artisans or explore the collection.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button className="h-14 lg:h-20 px-10 lg:px-16 rounded-full bg-white text-accent-primary hover:bg-gold hover:text-white text-sm lg:text-lg font-bold shadow-[0_20px_50px_-15px_rgba(4,52,44,0.3)] transition-all duration-300 w-full sm:w-auto">
              Shop Collections
            </Button>
          </div>

          {/* Moved Branding Icons inside to remove gap */}
          <div className="pt-24 opacity-30 flex items-center justify-center gap-8 grayscale brightness-0 invert">
            <ShoppingBag className="h-6 w-6 text-white" />
            <TreePine className="h-6 w-6 text-white" />
            <Award className="h-6 w-6 text-white" />
            <Globe className="h-6 w-6 text-white" />
          </div>
        </div>
      </section>
    </div>
  );
};
