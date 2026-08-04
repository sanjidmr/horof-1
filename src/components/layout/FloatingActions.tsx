'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { IoLogoWhatsapp } from 'react-icons/io';
import { usePublicSettings } from '@/hooks/usePublicSettings';

function toWaLink(value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (v.startsWith('http')) return v;
  const digits = v.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export const FloatingActions: React.FC = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { settings } = usePublicSettings();

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsappHref = useMemo(() => toWaLink(settings.social.whatsapp), [settings.social.whatsapp]);

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-[100] flex flex-col gap-4">
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="w-12 h-12 md:w-14 md:h-14 bg-white text-slate-900 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-50 transition-all border border-slate-100 group"
            title="Back to Top"
          >
            <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {whatsappHref && (
        <motion.a
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 md:w-14 md:h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all hover:rotate-6 active:scale-95"
          title="Chat on WhatsApp"
        >
          <IoLogoWhatsapp size={28} />
        </motion.a>
      )}
    </div>
  );
};
