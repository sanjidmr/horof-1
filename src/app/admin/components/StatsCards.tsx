'use client';

import React from 'react';
import { Users, UserCheck, ShieldCheck, UserPlus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  stats: {
    total: number;
    customers: number;
    admins: number;
    newThisMonth: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    { label: 'Total Users', value: stats.total, icon: Users, color: 'text-[#ECFDF5]', bg: 'bg-[#14532D]', border: 'border-[#22C55E]/10', trend: '+12%' },
    { label: 'Customers', value: stats.customers, icon: UserCheck, color: 'text-[#A7F3D0]', bg: 'bg-[#0B3D2E]', border: 'border-[#22C55E]/10', trend: '+8%' },
    { label: 'Total Admins', value: stats.admins, icon: ShieldCheck, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/20', trend: '0%' },
    { label: 'New This Month', value: stats.newThisMonth, icon: UserPlus, color: 'text-[#22C55E]', bg: 'bg-[#14532D]', border: 'border-[#22C55E]/30', trend: '+24%' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            "p-8 rounded-[2rem] border bg-[#0F241C] flex flex-col justify-between h-48 transition-all hover:shadow-2xl hover:shadow-[#0B3D2E]/50 group relative overflow-hidden",
            card.border
          )}
        >
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#22C55E]/5 blur-[50px] rounded-full group-hover:bg-[#22C55E]/10 transition-colors" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-lg", card.bg, card.color)}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-1 text-[#22C55E] bg-[#22C55E]/10 px-2 py-1 rounded-lg text-xs font-bold">
              <TrendingUp className="h-3 w-3" />
              {card.trend}
            </div>
          </div>
          
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#A7F3D0] uppercase tracking-[0.2em] mb-1">{card.label}</p>
            <h3 className="text-4xl font-display font-bold text-[#ECFDF5]">{card.value}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
