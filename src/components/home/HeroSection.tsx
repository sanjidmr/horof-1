'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

interface HeroSectionProps {
  initialImage?: string;
  initialSubtitleNormal?: string;
  initialSubtitleBold?: string;
}

const DEFAULT_SUBTITLE_NORMAL =
  'Crafted with passion, inspired by timeless artistry — Horof brings warmth, creativity, and elegance into every corner of your home.';
const DEFAULT_SUBTITLE_BOLD = 'DIY • HANDMADE • DECOR';

export const HeroSection: React.FC<HeroSectionProps> = ({
  initialImage,
  initialSubtitleNormal,
  initialSubtitleBold,
}) => {
  const [heroImage, setHeroImage] = React.useState(initialImage || '');
  const [subtitleNormal, setSubtitleNormal] = React.useState(
    initialSubtitleNormal ?? DEFAULT_SUBTITLE_NORMAL
  );
  const [subtitleBold, setSubtitleBold] = React.useState(
    initialSubtitleBold ?? DEFAULT_SUBTITLE_BOLD
  );
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  React.useEffect(() => {
    if (initialImage && initialSubtitleNormal !== undefined) return;

    async function getHeroData() {
      const [imageRes, contentRes] = await Promise.all([
        initialImage
          ? Promise.resolve({ data: null })
          : supabase
            .from('site_images')
            .select('image_url')
            .eq('section', 'hero')
            .maybeSingle(),
        initialSubtitleNormal !== undefined
          ? Promise.resolve({ data: null })
          : supabase
            .from('hero_content')
            .select('subtitle_normal, subtitle_bold')
            .limit(1)
            .maybeSingle(),
      ]);

      if (imageRes.data?.image_url) setHeroImage(imageRes.data.image_url);
      if (contentRes.data) {
        if (contentRes.data.subtitle_normal)
          setSubtitleNormal(contentRes.data.subtitle_normal);
        if (contentRes.data.subtitle_bold)
          setSubtitleBold(contentRes.data.subtitle_bold);
      }
    }
    getHeroData();
  }, [supabase, initialImage, initialSubtitleNormal]);

  return (
    <section className="relative min-h-screen flex items-center bg-black overflow-hidden pt-20">
      {/* Full-Bleed Premium Decor Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.75 }}
          transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {heroImage && (
            <img
              src={heroImage}
              alt="Premium Artisan Decor"
              className="w-full h-full object-cover object-top"
            />
          )}
        </motion.div>

        {/* Refined Dark Overlays */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none z-[2]" />

        {/* Decorative Texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[''] z-[3]" />

        {/* Luxury Shimmer Layer */}
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none z-[1]">
          <img
            src="/images/about.jpg"
            alt="Premium Texture"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Ambient Glow */}
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 -right-40 w-[900px] h-[900px] bg-white/5 blur-[180px] rounded-full -translate-y-1/2 z-[1]"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 w-full py-20">
        <div className="max-w-3xl mx-auto space-y-12 text-center">

          {/* Text Area */}
          <div className="space-y-10">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="space-y-8 flex flex-col items-center"
            >

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-5 sm:py-2.5 bg-accent-hover/10 rounded-full border border-accent-hover/20 backdrop-blur-md">
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-accent-light animate-pulse" />

                <span className="text-accent-light text-[8px] sm:text-[11px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em]">
                  Artisan Collection • Heritage Edition
                </span>
              </div>

              <h1 className="text-5xl text-white  sm:text-7xl md:text-8xl lg:text-[10rem] font-display font-medium  leading-[0.9] tracking-tighter">
                Horof
              </h1>

              <p className="text-lg md:text-2xl text-white/60 leading-relaxed font-light max-w-2xl px-1">
                {subtitleNormal}
                <span className="text-white font-bold">
                  {' '}<br />{subtitleBold}
                </span>
              </p>

            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
            >

              <Link href="/products" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto bg-accent-hover hover:bg-white text-white hover:text-accent-primary rounded-full px-8 sm:px-14 h-14 sm:h-20 text-[11px] sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] font-bold shadow-[0_20px_50px_-15px_rgba(45,106,79,0.3)] border-none transition-all active:scale-95"
                >
                  The Collection
                  <ShoppingBag className="ml-2 h-4 w-4 sm:ml-3 sm:h-5 sm:w-5" />
                </Button>
              </Link>

              <Link
                href="/about"
                className="group flex items-center gap-4 sm:gap-5 text-white font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] hover:text-accent-light transition-all py-1 sm:py-2"
              >
                Discover Story

                <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-accent-hover group-hover:border-accent-hover group-hover:text-white transition-all shadow-xl">
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </Link>

            </motion.div>

            {/* Let's Talk Button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="pt-4 flex justify-center"
            >
              <Link href="/contact" className="w-full sm:w-auto flex justify-center">
                <Button
                  variant="secondary"
                  className="bg-transparent border border-white/15 hover:border-accent-light text-white/80 hover:text-white rounded-full px-8 sm:px-12 h-12 sm:h-16 text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold transition-all hover:bg-white/5 active:scale-95 flex items-center justify-center gap-2.5 shadow-lg"
                >
                  Let's Contact
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-ping shrink-0" />
                </Button>
              </Link>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
};
