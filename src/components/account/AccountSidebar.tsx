'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Package, MapPin, Heart, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const menuItems = [
  { name: 'Profile', href: '/account', icon: User },
  { name: 'Orders', href: '/account/orders', icon: Package },
  { name: 'Addresses', href: '/account/addresses', icon: MapPin },
  { name: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { name: 'Settings', href: '/account/settings', icon: Settings },
];

export const AccountSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="w-full lg:w-64 space-y-2">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
            pathname === item.href
              ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/20"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <item.icon size={18} />
          {item.name}
        </Link>
      ))}
      
      <button
        onClick={() => logout()}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mt-4"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
};
