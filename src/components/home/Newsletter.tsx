import React from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export const Newsletter: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent-primary border border-white/10 py-8 px-4 sm:py-12 sm:px-8 md:px-16 shadow-2xl group">
      {/* Premium Background Textures */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12 relative z-10">
        <div className="max-w-xl space-y-4 md:space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full backdrop-blur-md">
            <Mail className="h-3.5 w-3.5 text-accent-light" />
            <span className="text-[8px] md:text-[9px] font-bold text-accent-light uppercase tracking-[0.3em]">Exclusive Access</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-medium text-white leading-tight">
            Join the <span className="text-accent-light italic">Horof</span> group
          </h2>
          <p className="text-white/60 text-xs sm:text-sm md:text-base leading-relaxed font-light">
            Be the first to know about new collection drops, workshop stories, and exclusive subscriber-only offers. No spam, just pure craftsmanship.
          </p>
        </div>

        <div className="w-full lg:max-w-md">
          <form className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-1.5 sm:p-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 focus-within:border-accent-light/50 transition-all shadow-inner">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-transparent px-4 py-2 sm:py-3 text-white border-none outline-none placeholder:text-white/30 text-sm"
              required
            />
            <Button variant="primary" className="px-6 sm:px-8 bg-accent-light hover:bg-white text-accent-primary rounded-lg h-10 sm:h-12 transition-all font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
              Subscribe <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </form>
          <p className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-white/30 text-center lg:text-left tracking-wide">By subscribing, you agree to our Privacy Policy</p>
        </div>
      </div>

      <div className="mt-8 lg:mt-12 flex flex-wrap justify-center lg:justify-start items-center gap-3 sm:gap-6 md:gap-10 opacity-30">
        <span className="text-[7px] sm:text-[8px] font-bold text-white uppercase tracking-[0.4em] mr-1 sm:mr-2">Featured In:</span>
        <span className="text-[10px] sm:text-xs font-display font-bold text-white border-b border-white/20 pb-0.5">Vogue Living</span>
        <span className="text-[10px] sm:text-xs font-display font-bold text-white border-b border-white/20 pb-0.5">Architectural Digest</span>
        <span className="text-[10px] sm:text-xs font-display font-bold text-white border-b border-white/20 pb-0.5">Dwell</span>
      </div>
    </div>
  );
};
