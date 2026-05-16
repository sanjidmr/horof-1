import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export const SpecialOffer: React.FC = () => {
  const [offer, setOffer] = useState<any>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchOffer() {
      const { data } = await supabase.from('special_offers').select('*').limit(1).maybeSingle();
      if (data) setOffer(data);
    }
    fetchOffer();
  }, [supabase]);

  if (!offer) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-4 sm:py-16">
      <div className="relative overflow-hidden rounded-2xl bg-accent-primary group min-h-0 md:min-h-[500px] flex items-center shadow-2xl">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src={offer.image_url}
            alt="Interior backdrop"
            className="w-full h-full object-cover opacity-40 transition-transform duration-[2000ms] group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary via-accent-primary/90 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-6 py-10 sm:px-16 lg:px-24 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
            <div className="space-y-3">
              <span className="inline-block px-4 py-1.5 bg-accent-light text-accent-primary text-[10px] font-bold uppercase tracking-[0.4em] rounded-full">Season Finale</span>
              <h2 className="text-3xl sm:text-6xl md:text-7xl font-display font-bold text-white leading-[1.1]">
                {offer.title.split(' ').map((word: string, i: number) => (
                  <React.Fragment key={i}>
                    {i === 1 ? <span className="text-accent-light italic">{word}</span> : word}
                    {' '}
                  </React.Fragment>
                ))} <br />
                Up To {offer.discount_percent}% Off
              </h2>
            </div>

            <p className="text-white/70 text-sm sm:text-xl font-light leading-relaxed max-w-lg">
              Our most coveted handcrafted pieces are now available with rare seasonal savings. Elevate your sanctuary with timeless heritage.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <Link href={offer.product_id ? `/products/${offer.product_id}` : '/products'}>
                <Button className="bg-white text-accent-primary hover:bg-accent-light h-14 sm:h-16 px-10 sm:px-12 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl hover:shadow-accent-light/20 active:scale-95">
                  Secure Your Piece <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <Link href={offer.product_id ? `/products/${offer.product_id}` : '#'} className="w-full flex justify-center lg:justify-end cursor-pointer">
              <div className="relative z-10 aspect-[3/4] w-full max-w-[200px] sm:max-w-[400px] rounded-xl overflow-hidden shadow-[-20px_20px_40px_-10px_rgba(0,0,0,0.5)] lg:shadow-[-40px_40px_80px_-20px_rgba(0,0,0,0.5)] border border-white/10 group/img">
                <img
                  src={offer.image_url}
                  alt="Spotlight Product"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 translate-y-12 group-hover/img:translate-y-0 opacity-0 group-hover/img:opacity-100 transition-all duration-500">
                  <p className="text-white text-sm font-bold uppercase tracking-widest mb-1 group-hover/img:text-accent-light transition-colors">{offer.title}</p>
                  <p className="text-white/60 text-xs font-light">Limited Collection Bundle</p>
                </div>
              </div>
            </Link>
            {/* Decorative Background Elements */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-accent-light/10 blur-[100px] rounded-full" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-black/40 blur-[100px] rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
