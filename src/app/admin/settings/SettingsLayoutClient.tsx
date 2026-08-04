'use client';

import React from 'react';
import {
  Store,
  Truck,
  Bell,
  Mail,
  Share2,
  ShieldCheck,
  FileText,
  LayoutGrid,
} from 'lucide-react';
import { SettingsNav, type SettingsSection } from '@/components/admin/settings/SettingsNav';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const sections: SettingsSection[] = [
  { href: '/admin/settings/general', title: 'General', description: 'Business identity & branding', icon: Store },
  { href: '/admin/settings/shipping', title: 'Shipping', description: 'Charges, threshold & delivery', icon: Truck },
  { href: '/admin/settings/notifications', title: 'Notifications', description: 'Email, admin, browser & warehouse', icon: Bell },
  { href: '/admin/settings/email', title: 'Email', description: 'Sender, SMTP & password reset', icon: Mail },
  { href: '/admin/settings/social', title: 'Social', description: 'Facebook, Instagram & WhatsApp', icon: Share2 },
  { href: '/admin/settings/security', title: 'Super Admin Security', description: 'Password & session security', icon: ShieldCheck },
  { href: '/admin/settings/legal-pages', title: 'Legal Pages', description: 'Terms & privacy policy', icon: FileText },
];

export function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/admin/settings';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[#1a4731] text-white flex items-center justify-center shadow-lg shadow-[#1a4731]/20">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Settings Center</h1>
            <p className="text-sm text-slate-500">Configure, secure, and customize your entire storefront.</p>
          </div>
        </div>
      </header>

      {isLanding ? (
        children
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <aside className="lg:sticky lg:top-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Configuration
            </p>
            <SettingsNav sections={sections} />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </div>
  );
}
