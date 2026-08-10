'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Globe, CreditCard, Truck, Shield } from 'lucide-react';

export const SettingsTab = () => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Platform Settings</h2>
        <p className="text-[#A7F3D0] text-sm">Configure your SaaS ecommerce environment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0F241C] p-8 rounded-[2rem] border border-[#22C55E]/15 hover:border-[#22C55E]/30 transition-all shadow-xl group">
          <div className="h-12 w-12 bg-[#071A12] rounded-xl flex items-center justify-center border border-[#22C55E]/20 mb-6 group-hover:scale-110 transition-transform">
            <Globe className="h-6 w-6 text-[#22C55E]" />
          </div>
          <h3 className="text-xl font-bold text-[#ECFDF5] mb-2">Store Details</h3>
          <p className="text-[#A7F3D0] text-sm mb-6">Manage your store's name, contact email, and primary currency settings.</p>
          <button className="px-5 py-2.5 bg-[#14532D] text-[#ECFDF5] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-[#071A12] transition-colors">
            Configure
          </button>
        </div>

        <div className="bg-[#0F241C] p-8 rounded-[2rem] border border-[#22C55E]/15 hover:border-[#22C55E]/30 transition-all shadow-xl group">
          <div className="h-12 w-12 bg-[#071A12] rounded-xl flex items-center justify-center border border-[#22C55E]/20 mb-6 group-hover:scale-110 transition-transform">
            <CreditCard className="h-6 w-6 text-[#22C55E]" />
          </div>
          <h3 className="text-xl font-bold text-[#ECFDF5] mb-2">Cash on Delivery</h3>
          <p className="text-[#A7F3D0] text-sm mb-6">All orders are processed with Cash on Delivery. No online payment gateways needed.</p>
          <button className="px-5 py-2.5 bg-[#14532D] text-[#ECFDF5] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-[#071A12] transition-colors">
            Configure
          </button>
        </div>

        <div className="bg-[#0F241C] p-8 rounded-[2rem] border border-[#22C55E]/15 hover:border-[#22C55E]/30 transition-all shadow-xl group">
          <div className="h-12 w-12 bg-[#071A12] rounded-xl flex items-center justify-center border border-[#22C55E]/20 mb-6 group-hover:scale-110 transition-transform">
            <Truck className="h-6 w-6 text-[#22C55E]" />
          </div>
          <h3 className="text-xl font-bold text-[#ECFDF5] mb-2">Shipping Zones</h3>
          <p className="text-[#A7F3D0] text-sm mb-6">Set up regional shipping rates, delivery estimates, and local pickup.</p>
          <button className="px-5 py-2.5 bg-[#14532D] text-[#ECFDF5] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-[#071A12] transition-colors">
            Configure
          </button>
        </div>

        <div className="bg-[#0F241C] p-8 rounded-[2rem] border border-[#22C55E]/15 hover:border-[#22C55E]/30 transition-all shadow-xl group">
          <div className="h-12 w-12 bg-[#071A12] rounded-xl flex items-center justify-center border border-[#22C55E]/20 mb-6 group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-[#22C55E]" />
          </div>
          <h3 className="text-xl font-bold text-[#ECFDF5] mb-2">Security & Roles</h3>
          <p className="text-[#A7F3D0] text-sm mb-6">Manage administrator roles, API keys, and Supabase integration settings.</p>
          <button className="px-5 py-2.5 bg-[#14532D] text-[#ECFDF5] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#22C55E] hover:text-[#071A12] transition-colors">
            Configure
          </button>
        </div>
      </div>
    </motion.div>
  );
};
