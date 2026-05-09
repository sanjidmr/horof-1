'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  Package,
  Heart,
  MapPin,
  UserRound,
  Settings,
  ArrowLeft,
  TreePine,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const SIDEBAR_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/dashboard/orders', label: 'My Orders', icon: Package },
  { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/dashboard/addresses', label: 'Addresses', icon: MapPin },
  { href: '/dashboard/profile', label: 'Profile', icon: UserRound },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href || pathname === `${href}/`
      : pathname === href ||
        pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border-forest bg-white shadow-xl shadow-accent-primary/5">
        <div className="flex h-full flex-col pt-10 pb-6">
          <div className="px-6 pb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary text-white shadow-lg shadow-accent-primary/25">
                <TreePine className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold tracking-tight text-accent-primary italic">
                  Horof
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-secondary">
                  My account
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {SIDEBAR_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all',
                    active
                      ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/20'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-accent-primary'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="px-6 pt-8">
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 rounded-2xl border border-border-forest bg-bg-secondary py-3 text-[11px] font-bold uppercase tracking-widest text-accent-primary hover:border-accent-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to shop
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-24 lg:pb-12 lg:pt-10">
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[90] border-t border-border-forest bg-white/95 px-2 py-2 backdrop-blur-md lg:hidden safe-area-pb">
        <div className="mx-auto flex max-w-lg justify-between gap-1">
          {SIDEBAR_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl py-2 text-[9px] font-bold uppercase tracking-tight transition-colors',
                  active ? 'text-accent-primary' : 'text-text-secondary'
                )}
              >
                <Icon className={cn('mb-0.5 h-5 w-5', active && 'text-gold')} />
                <span className="truncate px-0.5 text-center">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
