'use client';

import React from 'react';
import { User as UserIcon, Bell, Search } from 'lucide-react';

interface TopNavbarProps {
  adminName: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ adminName }) => {
  return (
    <header className="h-20 px-8 border-b border-[#22C55E]/15 flex items-center justify-between bg-[#071A12]/80 backdrop-blur-xl sticky top-0 z-30 w-full text-[#ECFDF5]">
      <div className="flex items-center gap-8">
        <div className="relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A7F3D0] transition-colors group-focus-within:text-[#22C55E]" />
          <input
            placeholder="Search orders, customers, or products..."
            className="h-10 w-80 bg-[#0F241C] border border-[#22C55E]/20 rounded-xl pl-10 pr-4 text-sm outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all text-[#ECFDF5] placeholder:text-[#A7F3D0]/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-[#A7F3D0] hover:text-[#22C55E] transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#22C55E] rounded-full border-2 border-[#071A12]" />
        </button>

        <div className="h-8 w-px bg-[#22C55E]/15" />

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#ECFDF5]">{adminName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E] uppercase tracking-widest border border-[#22C55E]/20">
              Admin
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#14532D] text-[#ECFDF5] flex items-center justify-center shadow-lg border border-[#22C55E]/30">
            <UserIcon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
