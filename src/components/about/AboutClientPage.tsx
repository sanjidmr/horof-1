'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  TreePine, Heart, Leaf, Award, Globe, Users, ShoppingBag,
  Clock, ArrowRight, Star, Sparkles, Quote, ShieldCheck,
  Zap, CheckCircle, Truck, Target, Eye as EyeIcon, Building2
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

const ICON_MAP: Record<string, React.ElementType> = {
  Star, Leaf, Sparkles, ShieldCheck, Zap, Target, Eye: EyeIcon,
  Award, Truck, TreePine, CheckCircle, Users, ShoppingBag,
  Clock, Heart, Globe, Building2,
};

const DEFAULT_STATS = [
  { label: 'Masterpieces Crafted', value: '18400', suffix: '+', icon: 'ShoppingBag' },
  { label: 'Happy Customers', value: '12000', suffix: '+', icon: 'Users' },
  { label: 'Years of Legacy', value: '25', suffix: '+', icon: 'Clock' },
  { label: 'Global Partners', value: '150', suffix: '+', icon: 'Award' },
];

function AnimatedCounter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = Math.ceil(value / (duration * 60));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/80 rounded-2xl ${className}`} />;
}

export default function AboutClientPage() {
  const supabase = createSupabaseBrowserClient();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<any>({});
  const [values, setValues] = useState<any[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [pageRes, valRes, wcuRes, clientRes] = await Promise.all([
        supabase.from('about_page').select('*').limit(1).maybeSingle(),
        supabase.from('about_values').select('*').eq('is_active', true).order('display_order'),
        supabase.from('about_why_choose_us').select('*').eq('is_active', true).order('display_order'),
        supabase.from('about_trusted_clients').select('*').eq('is_active', true).order('display_order'),
      ]);
      if (pageRes.data) setPage(pageRes.data);
      if (valRes.data && valRes.data.length > 0) setValues(valRes.data);
      if (wcuRes.data && wcuRes.data.length > 0) setWhyChooseUs(wcuRes.data);
      if (clientRes.data && clientRes.data.length > 0) setClients(clientRes.data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24 px-6 max-w-7xl mx-auto space-y-8 pb-20">
        <Skeleton className="h-[80vh] w-full" />
        <div className="grid md:grid-cols-2 gap-8"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
        <Skeleton className="h-64" />
        <div className="grid md:grid-cols-4 gap-6"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        <div className="grid md:grid-cols-3 gap-6"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const heroImage = page.hero_image_url || 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&q=80&w=1800';
  const founderImage = page.founder_image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600';
  const founderSignature = page.founder_signature_url;
  const storyImage = page.story_image_url || 'https://images.unsplash.com/photo-1449247709967-d4461a6a6103?auto=format&fit=crop&q=80&w=800';
  const ctaImage = page.cta_image_url || '/images/about.jpg';

  const rawStats = (Array.isArray(page.stats) && page.stats.length > 0) ? page.stats : DEFAULT_STATS;
  const parsedStats = rawStats.map((s: any) => ({
    ...s,
    numericValue: parseInt(String(s.value).replace(/[^0-9]/g, '')) || 0,
    suffix: String(s.value).replace(/[0-9]/g, '') || '+',
  }));

  const displayValues = values.length > 0 ? values : [];
  const displayWcu = whyChooseUs.length > 0 ? whyChooseUs : [];
  const displayClients = clients.length > 0 ? clients : [];

  const ease = [0.22, 1, 0.36, 1] as const;

  const fadeUp = {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' as const },
    transition: { duration: 0.7, ease },
  };

  const stagger = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease },
  };

  return (
    <div className="bg-[#faf9f7] text-[#1a1a1a] overflow-x-hidden">

      {/* ─── 1. Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/70 via-black/30 to-black/60" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="max-w-3xl"
          >
            {page.hero_badge && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md mb-8"
              >
                <span className="flex h-2 w-2 rounded-full bg-[#c9a84c]" />
                <span className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">{page.hero_badge}</span>
              </motion.div>
            )}
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[8.5rem] font-light text-white leading-[0.95] tracking-tighter">
              {page.hero_title || 'Where Craft'} <br />
              <span className="text-[#c9a84c] italic font-medium">Meets Soul</span>
            </h1>
            {page.hero_subtitle && (
              <p className="mt-6 text-lg md:text-xl text-white/70 font-light max-w-xl leading-relaxed">
                {page.hero_subtitle}
              </p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              {page.hero_button_text && (
                <Link
                  href={page.hero_button_link || '/products'}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#04342c] rounded-full text-sm font-bold tracking-widest uppercase hover:bg-[#c9a84c] hover:text-white transition-all duration-300 shadow-2xl"
                >
                  {page.hero_button_text} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 text-white/40"
        >
          <span className="text-[9px] uppercase tracking-[0.4em] font-bold">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="h-8 w-[1px] bg-white/30"
          />
        </motion.div>
      </section>

      {/* ─── 2. Story + Stats ─── */}
      {(page.story_is_active !== false && (page.story_title || page.story_content)) && (
        <section className="py-24 lg:py-36 bg-[#faf9f7]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div {...fadeUp} className="relative">
                <div className="relative w-full max-w-lg mx-auto">
                  <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] border-2 border-[#c9a84c]/20" />
                  <div className="relative rounded-[2rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(4,52,44,0.15)] aspect-[4/5]">
                    <img src={storyImage} alt={page.story_title || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04342c]/60 via-transparent to-transparent" />
                  </div>
                </div>
              </motion.div>

              <motion.div {...fadeUp} className="space-y-8">
                <div>
                  <span className="inline-block px-4 py-1.5 bg-[#04342c]/5 rounded-full border border-[#04342c]/10 text-[11px] font-bold text-[#04342c] uppercase tracking-[0.3em] mb-6">
                    {page.story_subtitle || 'Our Story'}
                  </span>
                  {page.story_title && (
                    <h2 className="text-4xl lg:text-5xl font-light text-[#04342c] leading-[1.1] tracking-tight mb-6">
                      {page.story_title}
                    </h2>
                  )}
                  {page.story_content && (
                    <p className="text-base md:text-lg text-[#5a6b60] font-light leading-relaxed whitespace-pre-line">
                      {page.story_content}
                    </p>
                  )}
                </div>

                {parsedStats.length > 0 && (
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#04342c]/10">
                    {parsedStats.slice(0, 4).map((stat: any, i: number) => {
                      const IconComp = ICON_MAP[stat.icon] || Award;
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-1">
                            <IconComp className="h-4 w-4 text-[#c9a84c]" />
                            <span className="text-2xl md:text-3xl font-bold text-[#04342c] tracking-tight">
                              <AnimatedCounter value={stat.numericValue} suffix={stat.suffix} />
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5a6b60] font-medium uppercase tracking-wider">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 3. Founder ─── */}
      {page.founder_is_active !== false && page.founder_name && (
        <section className="py-24 lg:py-36 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div {...fadeUp} className="relative order-2 lg:order-1">
                <div>
                  <span className="inline-block px-4 py-1.5 bg-[#04342c]/5 rounded-full border border-[#04342c]/10 text-[11px] font-bold text-[#04342c] uppercase tracking-[0.3em] mb-6">
                    {page.founder_title || 'The Visionary'}
                  </span>
                  <h2 className="text-4xl lg:text-5xl font-light text-[#04342c] leading-[1.1] tracking-tight mb-2">
                    {page.founder_name}
                  </h2>
                  {page.founder_designation && (
                    <p className="text-[#c9a84c] text-sm font-bold uppercase tracking-widest mb-6">{page.founder_designation}</p>
                  )}
                  {page.founder_bio && (
                    <p className="text-base md:text-lg text-[#5a6b60] font-light leading-relaxed whitespace-pre-line">
                      {page.founder_bio}
                    </p>
                  )}
                  {founderSignature && (
                    <img src={founderSignature} alt="Signature" className="h-10 mt-6 opacity-70" />
                  )}
                </div>

                {page.founder_quote && (
                  <div className="mt-8 p-6 bg-[#faf9f7] rounded-2xl border-l-4 border-[#c9a84c]">
                    <div className="flex gap-4">
                      <Quote className="h-6 w-6 text-[#c9a84c] shrink-0 mt-1" />
                      <div>
                        <p className="text-lg italic text-[#04342c] leading-relaxed">
                          &ldquo;{page.founder_quote}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div {...fadeUp} className="relative order-1 lg:order-2">
                <div className="relative w-full max-w-md mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-b from-[#c9a84c]/30 via-transparent to-transparent rounded-[2.5rem] blur-sm" />
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(4,52,44,0.2)] aspect-[3/4]">
                    <img src={founderImage} alt={page.founder_name} className="w-full h-full object-cover object-top" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04342c]/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <p className="text-[#c9a84c] text-[10px] font-bold uppercase tracking-[0.4em]">{page.founder_designation || 'Founder'}</p>
                      <p className="text-2xl text-white font-medium mt-1">{page.founder_name}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 4. Mission ─── */}
      {page.mission_is_active !== false && (page.mission_title || page.mission_description) && (
        <section className="py-20 lg:py-28 bg-[#04342c]/[0.02]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
              <motion.div {...fadeUp}>
                <div className="h-14 w-14 rounded-2xl bg-[#04342c] flex items-center justify-center mb-6">
                  {(() => {
                    const IconComp = ICON_MAP[page.mission_icon] || Target;
                    return <IconComp className="h-6 w-6 text-[#c9a84c]" />;
                  })()}
                </div>
                <h2 className="text-3xl lg:text-4xl font-light text-[#04342c] leading-tight tracking-tight mb-4">
                  {page.mission_title || 'Our Mission'}
                </h2>
                <p className="text-base md:text-lg text-[#5a6b60] font-light leading-relaxed">
                  {page.mission_description}
                </p>
              </motion.div>

              <motion.div {...fadeUp}>
                <div className="h-14 w-14 rounded-2xl bg-[#04342c] flex items-center justify-center mb-6">
                  {(() => {
                    const IconComp = ICON_MAP[page.vision_icon] || EyeIcon;
                    return <IconComp className="h-6 w-6 text-[#c9a84c]" />;
                  })()}
                </div>
                <h2 className="text-3xl lg:text-4xl font-light text-[#04342c] leading-tight tracking-tight mb-4">
                  {page.vision_title || 'Our Vision'}
                </h2>
                <p className="text-base md:text-lg text-[#5a6b60] font-light leading-relaxed">
                  {page.vision_description}
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. Stats Banner (full-width) ─── */}
      {parsedStats.length > 0 && (
        <section className="py-20 lg:py-28 bg-[#04342c] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)' }} />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div {...fadeUp} className="text-center mb-12">
              <span className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">By the Numbers</span>
              <h2 className="text-3xl lg:text-4xl font-light text-white mt-3 tracking-tight">Our Impact in Numbers</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
              {parsedStats.map((stat: any, i: number) => {
                const IconComp = ICON_MAP[stat.icon] || Award;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    className="text-center group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#c9a84c]/20 transition-colors duration-300">
                      <IconComp className="h-5 w-5 text-[#c9a84c]" />
                    </div>
                    <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                      <AnimatedCounter value={stat.numericValue} suffix={stat.suffix} />
                    </div>
                    <p className="text-[11px] font-bold text-[#c9a84c] uppercase tracking-[0.3em] mt-2">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 6. Trusted Clients ─── */}
      {displayClients.length > 0 && (
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div {...fadeUp} className="text-center mb-14">
              <span className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Trusted By</span>
              <h2 className="text-3xl lg:text-4xl font-light text-[#04342c] mt-3 tracking-tight">Our Valued Partners</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
              {displayClients.map((client: any, i: number) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="group flex items-center justify-center"
                >
                  {client.website_url ? (
                    <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="h-16 md:h-20 w-32 md:w-40 rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex items-center justify-center group-hover:border-[#c9a84c]/30 group-hover:shadow-md transition-all duration-300">
                        <img src={client.logo_url} alt={client.name} className="max-h-full max-w-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300 grayscale group-hover:grayscale-0" />
                      </div>
                      <p className="text-[10px] text-center text-slate-400 mt-2 font-medium group-hover:text-[#04342c] transition-colors">{client.name}</p>
                    </a>
                  ) : (
                    <div>
                      <div className="h-16 md:h-20 w-32 md:w-40 rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex items-center justify-center group-hover:border-[#c9a84c]/30 group-hover:shadow-md transition-all duration-300">
                        <img src={client.logo_url} alt={client.name} className="max-h-full max-w-full object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300 grayscale group-hover:grayscale-0" />
                      </div>
                      <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">{client.name}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 7. Why Customers Trust Us ─── */}
      {displayWcu.length > 0 && (
        <section className="py-20 lg:py-28 bg-[#faf9f7]">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div {...fadeUp} className="text-center mb-14">
              <span className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Why Us</span>
              <h2 className="text-3xl lg:text-4xl font-light text-[#04342c] mt-3 tracking-tight">Why Customers Trust Us</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayWcu.map((item: any, i: number) => {
                const IconComp = ICON_MAP[item.icon] || CheckCircle;
                return (
                  <motion.div
                    key={item.id || i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-lg hover:border-[#04342c]/10 transition-all duration-300"
                  >
                    <div className="h-12 w-12 rounded-xl bg-[#04342c]/5 border border-[#04342c]/10 flex items-center justify-center mb-5">
                      <IconComp className="h-5 w-5 text-[#04342c]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#04342c] mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-[#5a6b60] font-light leading-relaxed">{item.description}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Values ─── */}
      {displayValues.length > 0 && (
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div {...fadeUp} className="text-center mb-14">
              <span className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Our Values</span>
              <h2 className="text-3xl lg:text-4xl font-light text-[#04342c] mt-3 tracking-tight">What We Stand For</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayValues.map((v: any, i: number) => {
                const IconComp = ICON_MAP[v.icon] || Star;
                return (
                  <motion.div
                    key={v.id || i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    className="bg-[#faf9f7] rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-all duration-300"
                  >
                    <div className={`h-12 w-12 rounded-xl border flex items-center justify-center mb-5 ${v.color || 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#04342c] mb-2">{v.title}</h3>
                    {v.description && (
                      <p className="text-sm text-[#5a6b60] font-light leading-relaxed">{v.description}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 8. Final CTA ─── */}
      {page.cta_is_active !== false && (
        <section className="relative py-28 lg:py-40 overflow-hidden bg-[#04342c]">
          {ctaImage && (
            <img src={ctaImage} className="absolute inset-0 w-full h-full object-cover opacity-[0.07]" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#04342c] via-[#04342c]/95 to-[#04342c]/80" />
          <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
            <motion.div {...fadeUp} className="space-y-8">
              <span className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Begin Your Journey</span>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-light text-white tracking-tight leading-[1.05]">
                {page.cta_title || 'Craft Your Own'} <br />
                <span className="text-[#c9a84c] italic font-medium">Legacy</span>
              </h2>
              {page.cta_description && (
                <p className="text-base md:text-lg text-white/60 font-light max-w-xl mx-auto leading-relaxed">
                  {page.cta_description}
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                {page.cta_button_text && (
                  <Link
                    href={page.cta_button_link || '/products'}
                    className="inline-flex items-center gap-3 px-10 py-4.5 bg-white text-[#04342c] rounded-full text-sm font-bold tracking-widest uppercase hover:bg-[#c9a84c] hover:text-white transition-all duration-300 shadow-2xl"
                  >
                    {page.cta_button_text} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                {page.cta_secondary_button_text && (
                  <Link
                    href={page.cta_secondary_button_link || '/contact'}
                    className="inline-flex items-center gap-3 px-10 py-4.5 bg-white/10 border border-white/20 text-white rounded-full text-sm font-bold tracking-widest uppercase hover:bg-white/20 transition-all duration-300 backdrop-blur-md"
                  >
                    {page.cta_secondary_button_text}
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

    </div>
  );
}
