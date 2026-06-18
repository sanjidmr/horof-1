'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Shield,
  Truck,
  RefreshCcw,
  HeadphonesIcon,
  ChevronRight,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// ─── Inline SVG Payment Icons ─────────────────────────────────────────────────

const paymentMethods = [
  {
    name: 'bKash',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#E2136E" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="Arial,sans-serif">bKash</text>
      </svg>
    ),
  },
  {
    name: 'Nagad',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#F05A28" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="Arial,sans-serif">Nagad</text>
      </svg>
    ),
  },
  {
    name: 'Rocket',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#8B008B" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="Arial,sans-serif">Rocket</text>
      </svg>
    ),
  },
  {
    name: 'Visa',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#1A1F71" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="-0.5">VISA</text>
      </svg>
    ),
  },
  {
    name: 'Mastercard',
    el: (
      <svg viewBox="0 0 44 22" className="h-[18px] w-auto">
        <rect width="44" height="22" rx="3" fill="#252525" />
        <circle cx="16" cy="11" r="8" fill="#EB001B" />
        <circle cx="28" cy="11" r="8" fill="#F79E1B" />
        <path d="M22 4.5a8 8 0 0 1 0 13A8 8 0 0 1 22 4.5z" fill="#FF5F00" />
      </svg>
    ),
  },
  {
    name: 'Amex',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#007BC1" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="bold" fontFamily="Arial,sans-serif">AMERICAN EXPRESS</text>
      </svg>
    ),
  },
  {
    name: 'DBBL',
    el: (
      <svg viewBox="0 0 56 22" className="h-[18px] w-auto">
        <rect width="56" height="22" rx="3" fill="#006400" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="Arial,sans-serif">DBBL</text>
      </svg>
    ),
  },
  {
    name: 'BRAC Bank',
    el: (
      <svg viewBox="0 0 60 22" className="h-[18px] w-auto">
        <rect width="60" height="22" rx="3" fill="#C8102E" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="bold" fontFamily="Arial,sans-serif">BRAC Bank</text>
      </svg>
    ),
  },
  {
    name: 'Islami Bank',
    el: (
      <svg viewBox="0 0 60 22" className="h-[18px] w-auto">
        <rect width="60" height="22" rx="3" fill="#006341" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial,sans-serif">Islami Bank</text>
      </svg>
    ),
  },
  {
    name: 'SSLCommerz',
    el: (
      <svg viewBox="0 0 64 22" className="h-[18px] w-auto">
        <rect width="64" height="22" rx="3" fill="#FF6600" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial,sans-serif">SSLCommerz</text>
      </svg>
    ),
  },
];

// ─── Static Data ──────────────────────────────────────────────────────────────

const quickLinks = [
  { label: 'Shop All', href: '/products' },
  { label: 'Best Sellers', href: '/products?filter=best_selling' },
  { label: 'New Arrivals', href: '/products?filter=new_arrival' },
  { label: 'Flash Sale', href: '/products?filter=flash_sale' },
  { label: 'Custom Orders', href: '/contact' },
];

const supportLinks = [
  { label: 'Help Center', href: '/faq' },
  { label: 'Shipping Policy', href: '/policy' },
  { label: 'Return & Refund', href: '/policy' },
  { label: 'Track Your Order', href: '/dashboard' },
  { label: 'Privacy Policy', href: '/policy' },
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook', hoverBg: 'hover:bg-[#1877F2]' },
  { icon: Instagram, href: '#', label: 'Instagram', hoverBg: 'hover:bg-[#E1306C]' },
  { icon: Twitter, href: '#', label: 'Twitter', hoverBg: 'hover:bg-[#1DA1F2]' },
  { icon: Youtube, href: '#', label: 'YouTube', hoverBg: 'hover:bg-[#FF0000]' },
];



// ─── Category type ────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Footer: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(8)
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
  }, []);

  return (
    <footer className="bg-[#0F2016] text-white overflow-hidden">

      {/* ── Trust Strip ────────────────────────────────────────────────── */}
     

      {/* ── Main Body ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">

          {/* Brand */}
          <div className="lg:col-span-3 space-y-4">
            <Link href="/" className="inline-block group">
              <div className="relative h-12 w-[120px]">
                <Image
                  src="/images/horof.svg"
                  alt="Horof Logo"
                  width={120}
                  height={48}
                  className="object-contain brightness-0 invert opacity-85 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </Link>

            <p className="text-white/45 text-[12.5px] leading-relaxed font-light max-w-[220px]">
              Handcrafted woodwork blending ancient heritage with modern minimalism.
            </p>

            <div className="space-y-2">
              <a href="mailto:studio@horof.com" className="flex items-center gap-2.5 text-white/45 hover:text-accent-light transition-colors group">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-accent-light/10 transition-colors flex-shrink-0">
                  <Mail className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">studio@horof.com</span>
              </a>
              <a href="tel:+8801234567890" className="flex items-center gap-2.5 text-white/45 hover:text-accent-light transition-colors group">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-accent-light/10 transition-colors flex-shrink-0">
                  <Phone className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">+880 1234 567890</span>
              </a>
              <div className="flex items-center gap-2.5 text-white/35">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">Mymensingh, Dhaka</span>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className={`h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-transparent ${s.hoverBg} transition-all duration-300 hover:scale-110`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white/35 text-[9.5px] font-black uppercase tracking-[0.35em] pb-2 border-b border-white/5">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-1.5 text-white/45 hover:text-white text-[12.5px] font-light transition-all duration-200"
                  >
                    <ChevronRight className="h-3 w-3 text-accent-light opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Dynamic Categories */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white/35 text-[9.5px] font-black uppercase tracking-[0.35em] pb-2 border-b border-white/5">
              Categories
            </h4>
            {categories.length === 0 ? (
              <div className="space-y-2.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-3.5 w-28 bg-white/5 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="group flex items-center gap-1.5 text-white/45 hover:text-white text-[12.5px] font-light transition-all duration-200"
                    >
                      <ChevronRight className="h-3 w-3 text-accent-light opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" />
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Customer Care */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white/35 text-[9.5px] font-black uppercase tracking-[0.35em] pb-2 border-b border-white/5">
              Customer Care
            </h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-1.5 text-white/45 hover:text-white text-[12.5px] font-light transition-all duration-200"
                  >
                    <ChevronRight className="h-3 w-3 text-accent-light opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact CTA */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white/35 text-[9.5px] font-black uppercase tracking-[0.35em] pb-2 border-b border-white/5">
              Get in Touch
            </h4>
            <p className="text-white/40 text-[12px] font-light leading-relaxed">
              Have a custom order request or question? We&apos;d love to hear from you.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-accent-light/10 hover:bg-accent-light/20 border border-accent-light/20 hover:border-accent-light/40 text-accent-light text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      

      {/* ── Legal Bar ──────────────────────────────────────────────────── */}
      <div className="border-t border-white/5 bg-[#091410]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/25 text-[11px] font-light tracking-wide">
              © {new Date().getFullYear()}{' '}
              <span className="text-white/40 font-medium">Horof Studio</span>.
              All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {[
                { label: 'Privacy', href: '/policy' },
                { label: 'Terms', href: '/policy' },
                { label: 'Cookies', href: '/policy' },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-white/25 hover:text-white/55 text-[11px] font-light transition-colors tracking-wide"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
