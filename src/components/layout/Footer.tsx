'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePublicSettings } from '@/hooks/usePublicSettings';

// ─── Cash on Delivery Badge ───────────────────────────────────────────────────

const paymentMethods = [
  {
    name: 'Cash on Delivery',
    el: (
      <svg viewBox="0 0 72 22" className="h-[18px] w-auto">
        <rect width="72" height="22" rx="3" fill="#1a4731" />
        <text x="50%" y="15" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="bold" fontFamily="Arial,sans-serif">CASH ON DELIVERY</text>
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
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
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
  const { settings } = usePublicSettings();

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

  const socialLinks = [
    { icon: Facebook, href: settings.social.facebook, label: 'Facebook', hoverBg: 'hover:bg-[#1877F2]' },
    { icon: Instagram, href: settings.social.instagram, label: 'Instagram', hoverBg: 'hover:bg-[#E1306C]' },
    { icon: Youtube, href: settings.social.youtube, label: 'YouTube', hoverBg: 'hover:bg-[#FF0000]' },
  ].filter((s) => s.href);

  const { website_name, business_address, phone, support_email, company_logo } = settings.general;

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
                  src={company_logo || '/images/horof.svg'}
                  alt={`${website_name} Logo`}
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
              <a href={`mailto:${support_email}`} className="flex items-center gap-2.5 text-white/45 hover:text-accent-light transition-colors group">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-accent-light/10 transition-colors flex-shrink-0">
                  <Mail className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">{support_email}</span>
              </a>
              <a href={`tel:${phone}`} className="flex items-center gap-2.5 text-white/45 hover:text-accent-light transition-colors group">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center group-hover:bg-accent-light/10 transition-colors flex-shrink-0">
                  <Phone className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">{phone}</span>
              </a>
              <div className="flex items-center gap-2.5 text-white/35">
                <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-3 w-3 text-accent-light" />
                </div>
                <span className="text-[12px] font-light">{business_address}</span>
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
              <span className="text-white/40 font-medium">{website_name || 'Horof Studio'}</span>.
              All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {[
                { label: 'Privacy Policy', href: '/privacy-policy' },
                { label: 'Terms', href: '/terms' },
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
