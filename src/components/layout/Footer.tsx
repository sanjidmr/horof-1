import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';


export const Footer: React.FC = () => {
  return (
    <footer className="bg-accent-primary text-white pt-10 pb-6 md:pt-14 md:pb-8 overflow-hidden border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Mission */}
          <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex justify-center items-center">
              <Link href="/" className="relative block group">
                <div className="relative h-15 md:h-20 w-[140px] md:w-[160px] px-2 flex items-center justify-center">
                  <Image
                    src="/images/horof.svg"
                    alt="Horof Logo"
                    width={160}
                    height={180}
                    className="object-contain"
                  />
                </div>
              </Link>
            </div>
            <p className="text-white/60 text-[12px] leading-relaxed max-w-xs font-light">
              Crafting sustainable heritage through master woodcarving. We turn nature's finest timber into heirloom stories.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Facebook, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Twitter, href: "#" }
              ].map((social, i) => (
                <a key={i} href={social.href} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-accent-light hover:border-accent-light hover:bg-accent-light/5 transition-all">
                  <social.icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Group - More responsive grid */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-white text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">Shop</h4>
              <ul className="space-y-2">
                {['Furniture', 'Decor', 'Supplies', 'Crafts'].map((item) => (
                  <li key={item}>
                    <Link href="/products" className="text-white/50 hover:text-accent-light text-[12px] font-light transition-colors flex items-center group">
                      <span className="w-0 group-hover:w-2 h-[1px] bg-accent-light mr-0 group-hover:mr-2 transition-all opacity-0 group-hover:opacity-100" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-white text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">Studio</h4>
              <ul className="space-y-2">
                {['About', 'Contact', 'FAQs', 'Policy'].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-white/50 hover:text-white text-[12px] font-light transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Details & Payment - Combined for compact look */}
          <div className="space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="space-y-3">
              <h4 className="text-white text-[9px] font-bold uppercase tracking-[0.3em] opacity-40">Connect</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Mail className="h-3 w-3 text-accent-light flex-shrink-0" />
                  <p className="text-white/60 text-[12px] font-light">studio@horof.com</p>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <Phone className="h-3 w-3 text-accent-light flex-shrink-0" />
                  <p className="text-white/60 text-[12px] font-light">+880 1234 567890</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center md:justify-start">
              <div className="bg-white p-2 rounded-md">
                <img src="/images/bkash.svg" alt="bKash" className="h-6 w-auto" />
              </div>

              <div className="bg-white p-2 rounded-md">
                <img src="/images/nagad.svg" alt="Nagad" className="h-6 w-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-10 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
          <p>&copy; 2026 Horof Studio.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
