'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  TreePine, Heart, Leaf, Award, Globe, Users, ShoppingBag,
  Clock, ArrowRight, Star, Sparkles, Quote, MapPin, ShieldCheck,
  Zap, CheckCircle, ChevronRight, Instagram, Facebook, Youtube
} from 'lucide-react';

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const stats = [
  { label: 'Masterpieces Crafted', value: '18,400+', icon: ShoppingBag },
  { label: 'Happy Customers', value: '12,000+', icon: Users },
  { label: 'Years of Legacy', value: '25+', icon: Clock },
  { label: 'Global Partners', value: '150+', icon: Award },
];

const products = [
  {
    name: 'Royal Throne Chair',
    category: 'Seating',
    price: '৳ 48,000',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Forest Dining Table',
    category: 'Dining',
    price: '৳ 95,000',
    image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Heritage Bookshelf',
    category: 'Storage',
    price: '৳ 62,000',
    image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Zen Coffee Table',
    category: 'Living',
    price: '৳ 35,000',
    image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800',
  },
];

const milestones = [
  {
    year: '1999',
    title: 'The First Seed',
    desc: 'Founded in a small workshop in Chittagong with just three artisans and a dream to preserve Bengali woodcraft.',
    icon: '🌱',
  },
  {
    year: '2005',
    title: 'National Recognition',
    desc: `Won Bangladesh's prestigious Craft Excellence Award, placing Horof on the national design map.`,
    icon: '🏆',
  },
  {
    year: '2008',
    title: 'Going Global',
    desc: 'Expanded to international galleries in London and New York, bringing Bengali woodcraft to the world.',
    icon: '🌍',
  },
  {
    year: '2015',
    title: 'Eco-Seasoning Patent',
    desc: 'Patented our revolutionary Eco-Seasoning method, reducing timber waste by 40% while preserving quality.',
    icon: '🌿',
  },
  {
    year: '2020',
    title: 'Digital Atelier',
    desc: 'Launched our online showroom, making premium artisan furniture accessible across Bangladesh.',
    icon: '💻',
  },
  {
    year: '2024',
    title: 'Heritage Foundation',
    desc: 'Launched the Horof Heritage Foundation to train the next generation of master artisans.',
    icon: '🎓',
  },
];

const followPlans = [
  {
    platform: 'Instagram',
    handle: '@horof.official',
    followers: '45K',
    icon: Instagram,
    color: 'from-pink-500 to-orange-400',
    desc: 'Daily craftsmanship stories & behind-the-scenes',
  },
  {
    platform: 'Facebook',
    handle: 'Horof Furniture',
    followers: '120K',
    icon: Facebook,
    color: 'from-blue-600 to-blue-400',
    desc: 'Community updates, offers & customer stories',
  },
  {
    platform: 'YouTube',
    handle: 'Horof Studio',
    followers: '18K',
    icon: Youtube,
    color: 'from-red-600 to-red-400',
    desc: 'Workshop tours & artisan documentaries',
  },
];

const testimonials = [
  {
    name: 'Rashida Begum',
    role: 'Interior Designer, Dhaka',
    text: `Horof pieces don't just fill a room — they define it. My clients always ask where that stunning piece is from.`,
    rating: 5,
  },
  {
    name: 'Arif Hossain',
    role: 'Architect, Chittagong',
    text: `The attention to grain, finish, and form is unlike anything I've seen from local craftsmen. Truly world-class.`,
    rating: 5,
  },
  {
    name: 'Sultana Parvin',
    role: 'Homeowner, Sylhet',
    text: 'Bought a dining table 8 years ago. It only gets more beautiful with time. Worth every taka.',
    rating: 5,
  },
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function AboutPage() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }}
      className="bg-[#faf9f7] text-[#1a1a1a] overflow-x-hidden">

      {/* ── HERO (unchanged design, same as original) ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <img
            src="https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&q=80&w=1800"
            alt="Premium Artisan Decor"
            className="w-full h-full object-cover object-[50%_55%]"
          />
        </motion.div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/80 via-black/40 to-black/60" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md shadow-2xl">
              <span className="flex h-2 w-2 rounded-full bg-[#c9a84c]" />
              <span style={{ fontFamily: 'sans-serif' }} className="text-[10px] font-bold text-white uppercase tracking-[0.4em]">
                Our Eternal Chronicle
              </span>
            </div>

            <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-5xl md:text-8xl lg:text-[9rem] font-medium text-white leading-none tracking-tighter">
              Origin of <br />
              <span className="text-[#c9a84c] italic">Horof</span>
            </h1>

            <p style={{ fontFamily: 'sans-serif' }}
              className="text-base md:text-xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed px-4">
              We don't just build furniture; we curate the silent whispers of the forest into heirlooms that define your spaces.
            </p>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 text-white/50"
        >
          <span style={{ fontFamily: 'sans-serif' }} className="text-[10px] uppercase tracking-[0.5em] font-bold">Scroll to Explore</span>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            className="h-10 w-[1px] bg-white/30" />
        </motion.div>
      </section>

      {/* ── OWNER SECTION ── */}
      <section className="py-20 lg:py-36 bg-[#faf9f7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Owner Image */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="relative"
            >
              <div className="relative w-full max-w-md mx-auto">
                {/* Decorative frame */}
                <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2.5rem] border-2 border-[#c9a84c]/30" />
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(4,52,44,0.2)] aspect-[3/4]">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600"
                    alt="Horof Owner"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04342c]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <span style={{ fontFamily: 'sans-serif' }}
                      className="text-[#c9a84c] text-[10px] font-bold uppercase tracking-[0.4em]">Founder & Master Artisan</span>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-3xl text-white font-medium mt-1"></h3>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -right-6 top-16 bg-[#04342c] text-white rounded-2xl p-5 shadow-2xl w-36 text-center">
                  <div style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-4xl font-bold text-[#c9a84c]">25</div>
                  <div style={{ fontFamily: 'sans-serif' }} className="text-[9px] uppercase tracking-widest text-white/70 mt-1">Years of Mastery</div>
                </div>
              </div>
            </motion.div>

            {/* Owner Bio */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="space-y-8"
            >
              <div>
                <div style={{ fontFamily: 'sans-serif' }}
                  className="inline-block px-4 py-1.5 bg-[#04342c]/5 rounded-full border border-[#04342c]/10 text-[11px] font-bold text-[#04342c] uppercase tracking-[0.3em] mb-6">
                  The Visionary Behind Horof
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-4xl lg:text-6xl font-medium text-[#04342c] leading-[1.1] mb-6">
                  Crafting Dreams <br />
                  <span className="text-[#c9a84c] italic">One Grain at a Time</span>
                </h2>
                <p style={{ fontFamily: 'sans-serif' }}
                  className="text-lg text-[#4a5568] font-light leading-relaxed mb-4">
                  Born in the heart of Chittagong, <strong className="font-semibold text-[#04342c]">Abdul Karim Horof</strong> grew up watching his grandfather breathe life into raw timber. At 17, he picked up his first chisel — and never put it down.
                </p>
                <p style={{ fontFamily: 'sans-serif' }}
                  className="text-lg text-[#4a5568] font-light leading-relaxed">
                  With a philosophy rooted in "Slow Craft" and ecological responsibility, he turned a humble garage workshop into Bangladesh's most celebrated artisan furniture house — a name now whispered in galleries from Dhaka to Dubai.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Workshops Held', value: '340+' },
                  { label: 'Countries Reached', value: '28' },
                  { label: 'Awards Won', value: '47' },
                  { label: 'Artisans Trained', value: '200+' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#e8e2d9] shadow-sm">
                    <div style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-3xl font-bold text-[#04342c]">{item.value}</div>
                    <div style={{ fontFamily: 'sans-serif' }}
                      className="text-xs text-[#718096] uppercase tracking-wider mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-4 p-6 bg-[#04342c]/5 rounded-2xl border-l-4 border-[#c9a84c]">
                <Quote className="h-8 w-8 text-[#c9a84c] shrink-0 mt-1" />
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    className="text-xl italic text-[#04342c] leading-relaxed">
                    "A piece of furniture is not complete until it carries a memory — the memory of the tree, the artisan, and the home it will grace."
                  </p>
                  <span style={{ fontFamily: 'sans-serif' }} className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-widest mt-3 block">
                    — Abdul Karim Horof
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS BANNER ── */}
      <section className="bg-[#04342c] py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white,transparent_70%)]" />
        </div>
        {/* Subtle wood grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)' }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#c9a84c]/20 transition-colors duration-300">
                  <stat.icon className="h-5 w-5 text-[#c9a84c]" />
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-5xl lg:text-7xl font-bold text-white tracking-tight">
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'sans-serif' }}
                  className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-[0.35em] mt-2">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MASTERPIECE PRODUCTS ── */}

      {/* ── JOURNEY TIMELINE ── */}
      <section className="py-20 lg:py-40 bg-[#04342c] relative overflow-hidden">
        {/* Background decorative */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 lg:mb-24 space-y-4"
          >
            <span style={{ fontFamily: 'sans-serif' }}
              className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">
              Since 1999
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl lg:text-7xl font-medium text-white">
              The Horof Journey
            </h2>
          </motion.div>

          {/* Timeline grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {milestones.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/10 transition-colors duration-300 h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl">{m.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'sans-serif' }}
                        className="text-[#c9a84c] text-[10px] font-bold uppercase tracking-[0.35em]">{m.year}</div>
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-white text-2xl font-medium mt-1">{m.title}</h3>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'sans-serif' }}
                    className="text-white/60 text-sm leading-relaxed font-light">{m.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-36 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14 space-y-3"
          >
            <span style={{ fontFamily: 'sans-serif' }}
              className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">What They Say</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl lg:text-6xl font-medium text-[#04342c]">
              Words from Our Patrons
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-[#e8e2d9] hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-[#c9a84c] fill-[#c9a84c]" />
                  ))}
                </div>
                <Quote className="h-8 w-8 text-[#c9a84c]/30 mb-3" />
                <p style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-xl text-[#04342c] italic leading-relaxed mb-6">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#04342c] flex items-center justify-center">
                    <span style={{ fontFamily: 'sans-serif' }} className="text-sm font-bold text-[#c9a84c]">
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'sans-serif' }} className="text-sm font-bold text-[#04342c]">{t.name}</div>
                    <div style={{ fontFamily: 'sans-serif' }} className="text-xs text-[#718096]">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOLLOW / SOCIAL PLAN ── */}
      <section className="py-20 lg:py-36 bg-[#faf9f7]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14 space-y-3"
          >
            <span style={{ fontFamily: 'sans-serif' }}
              className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Stay Connected</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl lg:text-6xl font-medium text-[#04342c]">
              Follow the Craft
            </h2>
            <p style={{ fontFamily: 'sans-serif' }}
              className="text-[#718096] font-light max-w-xl mx-auto">
              Join our growing community of craft lovers, design enthusiasts, and heritage seekers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {followPlans.map((plan, i) => (
              <motion.a
                key={i}
                href="#"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative block rounded-3xl overflow-hidden shadow-lg cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-90`} />
                <div className="relative z-10 p-8 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <plan.icon className="h-8 w-8" />
                    <span style={{ fontFamily: 'sans-serif' }}
                      className="text-3xl font-bold opacity-90">{plan.followers}</span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-2xl font-medium">{plan.platform}</div>
                    <div style={{ fontFamily: 'sans-serif' }}
                      className="text-white/80 text-sm font-light mt-1">{plan.handle}</div>
                  </div>
                  <p style={{ fontFamily: 'sans-serif' }}
                    className="text-white/80 text-sm leading-relaxed">{plan.desc}</p>
                  <div className="inline-flex items-center gap-2 text-white text-sm font-bold group-hover:gap-4 transition-all duration-300">
                    Follow Now <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUES / PHILOSOPHY ── */}
      <section className="py-20 lg:py-36 bg-[#04342c]/5">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-3"
          >
            <span style={{ fontFamily: 'sans-serif' }}
              className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">Our Pillars</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl lg:text-6xl font-medium text-[#04342c]">
              The Horof Standard
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Leaf, title: 'Eco-Conscious', desc: 'Timber sourced only from naturally fallen trees or verified ethical plantations.', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { icon: Sparkles, title: 'Ancestral Mastery', desc: 'Seven generations of woodcraft wisdom encoded in every chisel stroke.', color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { icon: ShieldCheck, title: '12-Point Inspection', desc: 'Every piece passes our rigorous structural and spiritual quality seal.', color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { icon: Zap, title: 'Modern Innovation', desc: 'Timeless techniques fused with contemporary ergonomic design thinking.', color: 'bg-purple-50 text-purple-700 border-purple-100' },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-3xl p-8 border border-[#e8e2d9] shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center mb-6 ${v.color}`}>
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium text-[#04342c] mb-3">{v.title}</h3>
                <p style={{ fontFamily: 'sans-serif' }}
                  className="text-[#718096] text-sm leading-relaxed font-light">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER BANNER ── */}
      <section className="relative py-24 lg:py-40 overflow-hidden bg-[#04342c]">
        <img
          src="/images/about.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
          alt="Wood texture"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04342c] via-[#04342c]/90 to-transparent" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <span style={{ fontFamily: 'sans-serif' }}
              className="text-[#c9a84c] text-[11px] font-bold uppercase tracking-[0.4em]">
              Begin Your Story
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-5xl lg:text-8xl font-medium text-white tracking-tighter leading-none">
              Start Your Own <br />
              <span className="text-[#c9a84c] italic">Legacy</span>
            </h2>
            <p style={{ fontFamily: 'sans-serif' }}
              className="text-lg text-white/70 font-light max-w-2xl mx-auto leading-relaxed">
              Our pieces aren't just bought — they're inherited. Connect with our artisans or explore the collection that will define your space for generations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <motion.a
                href="#"
                whileHover={{ scale: 1.03 }}
                style={{ fontFamily: 'sans-serif' }}
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#04342c] rounded-full text-sm font-bold tracking-widest uppercase hover:bg-[#c9a84c] hover:text-white transition-colors duration-300 shadow-2xl"
              >
                Shop Collections <ArrowRight className="h-4 w-4" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.03 }}
                style={{ fontFamily: 'sans-serif' }}
                className="inline-flex items-center gap-3 px-10 py-5 bg-white/10 border border-white/20 text-white rounded-full text-sm font-bold tracking-widest uppercase hover:bg-white/20 transition-colors duration-300 backdrop-blur-md"
              >
                Contact Artisans
              </motion.a>
            </div>

            <div className="pt-16 opacity-20 flex items-center justify-center gap-10">
              <ShoppingBag className="h-5 w-5 text-white" />
              <TreePine className="h-5 w-5 text-white" />
              <Award className="h-5 w-5 text-white" />
              <Globe className="h-5 w-5 text-white" />
              <Heart className="h-5 w-5 text-white" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}