import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, ArrowRight, Paintbrush } from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { IoLogoWhatsapp } from "react-icons/io";

export const CustomDesignCTA: React.FC = () => {
  return (
    <section className="relative py-6 md:py-24 px-6 overflow-hidden bg-white">
      {/* Decorative Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 w-full">
        <div className="bg-accent-primary rounded-3xl md:rounded-[3rem] p-6 md:p-16 text-center space-y-6 md:space-y-10 shadow-2xl shadow-accent-primary/20 relative overflow-hidden group/card">
          {/* Subtle Inner Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-hover opacity-20 blur-[80px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4 md:space-y-6 relative z-10"
          >
            <div className="inline-flex items-center gap-1.5 md:gap-3 px-3 md:px-6 py-1 md:py-2 rounded-full bg-accent-light/10 border border-accent-light/20 text-accent-light text-[7px] md:text-xs font-bold uppercase tracking-[0.3em] md:tracking-[0.4em] mb-2 md:mb-4">
              <Paintbrush className="h-2.5 w-2.5 md:h-4 md:w-4" />
              Bespoke Craftsmanship
            </div>

            <h2 className="text-2xl md:text-5xl lg:text-6xl font-display font-medium text-white leading-[1.1] tracking-tight">
              Bring Your <span className="text-accent-light italic">custom</span> <br />
              design to us
            </h2>

            <p className="text-white/70 text-sm md:text-xl max-w-2xl mx-auto font-light leading-relaxed italic">
              Have a unique idea in mind? Our master artist are ready to transform your specific woodcraft visions into reality. Contact us for personalized consultations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6 pt-2 md:pt-4 relative z-10"
          >
            <Button
              onClick={() => window.open('https://wa.me/yournumber', '_blank')}
              className="w-full sm:w-auto h-12 md:h-16 px-8 md:px-10 rounded-full bg-accent-light text-accent-primary hover:bg-white border-none shadow-lg shadow-black/20 flex items-center justify-center gap-3 text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
            >
              <IoLogoWhatsapp className="h-4 w-4 md:h-9 md:w-9 fill-current" />
              WhatsApp Us
            </Button>

            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 md:h-16 px-8 md:px-10 rounded-full border-white/20 text-white hover:bg-white hover:text-accent-primary flex items-center justify-center gap-3 text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
              >
                <Mail className="h-4 w-4 md:h-5 md:w-5" />
                Contact Inquiry
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="pt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">
            <span className="flex items-center gap-2">✓ Personalized Consultation</span>
            <span className="flex items-center gap-2">✓ Premium Wood Selection</span>
            <span className="flex items-center gap-2">✓ Global Delivery</span>
          </div>
        </div>
      </div>
    </section>
  );
};
