'use client';

import React from 'react';
import { LayoutDashboard, Users, Settings, LogOut, TreePine, Package, ShoppingBag, BarChart3, Database, Bell } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const navItems = [
    { id: 'Overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'Analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'Orders', name: 'Orders', icon: ShoppingBag },
    { id: 'Products', name: 'Products', icon: Package },
    { id: 'Customers', name: 'Customers', icon: Users },
    { id: 'Inventory', name: 'Inventory', icon: Database },
    { id: 'Activity', name: 'Activity Logs', icon: Bell },
    { id: 'Settings', name: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-72 bg-[#071A12] border-r border-[#22C55E]/15 text-[#ECFDF5] flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-[#22C55E]/10 p-2.5 rounded-2xl border border-[#22C55E]/20 group-hover:bg-[#22C55E]/20 transition-colors">
            <TreePine className="h-6 w-6 text-[#22C55E]" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-display font-bold tracking-tight text-[#ECFDF5]">
              Horof<span className="text-[#22C55E] font-sans text-sm ml-1 uppercase tracking-widest font-black">SaaS</span>
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all relative group overflow-hidden",
                isActive
                  ? "text-[#ECFDF5] bg-[#14532D] shadow-lg shadow-[#0B3D2E]/50"
                  : "text-[#A7F3D0] hover:text-[#ECFDF5] hover:bg-[#0F241C]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#22C55E] rounded-r-full"
                />
              )}
              <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-[#22C55E]" : "text-[#A7F3D0] group-hover:text-[#22C55E]")} />
              <span className="tracking-wide">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#22C55E]/15 mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all tracking-wide"
        >
          <LogOut className="h-5 w-5" />
          Sign Out Session
        </button>
      </div>
    </div>
  );
};
