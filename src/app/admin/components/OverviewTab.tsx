'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatsCards } from './StatsCards';
import { Clock, Package, ShoppingBag } from 'lucide-react';

interface OverviewTabProps {
  stats: any;
  users: any[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, users }) => {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-12"
    >
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0F241C] p-8 rounded-[2.5rem] border border-[#22C55E]/15 space-y-6 shadow-2xl">
          <h3 className="text-xl font-display font-bold text-[#ECFDF5]">Recent Signups</h3>
          <div className="space-y-4">
            {users.slice(0, 5).map((u, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#071A12] rounded-2xl border border-[#22C55E]/10 hover:border-[#22C55E]/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#14532D] flex items-center justify-center shadow-sm">
                    <Clock className="h-5 w-5 text-[#A7F3D0]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#ECFDF5]">{u.full_name || 'New user'}</p>
                    <p className="text-[10px] text-[#A7F3D0] font-bold uppercase tracking-widest">Joined the boutique</p>
                  </div>
                </div>
                <span className="text-xs text-[#22C55E] font-medium">{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#071A12] p-8 rounded-[2.5rem] text-[#ECFDF5] flex flex-col justify-center space-y-8 relative overflow-hidden border border-[#22C55E]/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#22C55E]/10 blur-[80px] rounded-full" />
          <div className="space-y-2 relative z-10">
            <h3 className="text-3xl font-display font-medium text-[#22C55E]">Ready for Sales?</h3>
            <p className="text-[#A7F3D0] text-sm font-light leading-relaxed max-w-sm">
              Track your handcrafted pieces and monitor every transaction in real-time.
            </p>
          </div>
          <div className="flex gap-4 relative z-10">
            <div className="flex-1 p-6 bg-[#0F241C] rounded-2xl border border-[#22C55E]/20 space-y-3 shadow-lg">
              <Package className="h-6 w-6 text-[#A7F3D0]" />
              <div>
                <p className="text-[10px] font-bold text-[#22C55E] uppercase tracking-widest">Stock Alert</p>
                <p className="text-xl font-display font-bold">12 Low</p>
              </div>
            </div>
            <div className="flex-1 p-6 bg-[#0F241C] rounded-2xl border border-[#22C55E]/20 space-y-3 shadow-lg">
              <ShoppingBag className="h-6 w-6 text-[#22C55E]" />
              <div>
                <p className="text-[10px] font-bold text-[#22C55E] uppercase tracking-widest">Live Orders</p>
                <p className="text-xl font-display font-bold">8 Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
