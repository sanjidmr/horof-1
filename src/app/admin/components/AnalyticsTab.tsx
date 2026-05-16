'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, ArrowUpRight, DollarSign, Users, ShoppingBag } from 'lucide-react';

const revData = [
  { name: 'Mon', revenue: 45000 },
  { name: 'Tue', revenue: 52000 },
  { name: 'Wed', revenue: 38000 },
  { name: 'Thu', revenue: 65000 },
  { name: 'Fri', revenue: 84000 },
  { name: 'Sat', revenue: 125000 },
  { name: 'Sun', revenue: 98000 },
];

const activityData = [
  { name: 'Week 1', users: 120 },
  { name: 'Week 2', users: 150 },
  { name: 'Week 3', users: 220 },
  { name: 'Week 4', users: 180 },
];

export const AnalyticsTab = () => {
  const [timeRange, setTimeRange] = useState('7D');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Realtime Analytics</h2>
          <p className="text-[#A7F3D0] text-sm">Actionable insights from your boutique's data</p>
        </div>
        <div className="flex bg-[#0F241C] border border-[#22C55E]/15 p-1 rounded-xl">
          {['24H', '7D', '30D', 'YTD'].map(t => (
            <button 
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === t ? 'bg-[#22C55E] text-[#071A12]' : 'text-[#A7F3D0] hover:text-[#ECFDF5]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#22C55E]/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-[#22C55E]/10" />
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-[#A7F3D0] text-[10px] font-bold uppercase tracking-widest mb-2">Revenue Growth</p>
              <h3 className="text-4xl font-display font-bold text-[#ECFDF5]">৳5,07,000</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[#22C55E] text-xs font-bold flex items-center bg-[#22C55E]/10 px-2 py-0.5 rounded">
                  <TrendingUp className="h-3 w-3 mr-1" /> +18.4%
                </span>
                <span className="text-[#A7F3D0]/50 text-xs">vs last period</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-[#071A12] flex items-center justify-center border border-[#22C55E]/20">
              <DollarSign className="h-6 w-6 text-[#22C55E]" />
            </div>
          </div>

          <div className="h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#22C55E" strokeOpacity={0.05} />
                <XAxis dataKey="name" stroke="#A7F3D0" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#A7F3D0" fontSize={10} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => `৳${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A12', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px' }}
                  itemStyle={{ color: '#22C55E', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#A7F3D0] text-[10px] font-bold uppercase tracking-widest mb-1">User Activity</p>
                <h3 className="text-2xl font-display font-bold text-[#ECFDF5]">670 Active</h3>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#071A12] flex items-center justify-center border border-[#22C55E]/20">
                <Users className="h-5 w-5 text-[#22C55E]" />
              </div>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 3 ? '#22C55E' : 'rgba(34,197,94,0.2)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#22C55E]/10 pb-4">
              <div>
                <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-bold">Conversion</p>
                <p className="text-xl font-bold text-[#ECFDF5]">3.4%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-bold">AOV</p>
                <p className="text-xl font-bold text-[#ECFDF5]">৳4,200</p>
              </div>
            </div>
            <button className="w-full py-3 bg-[#071A12] border border-[#22C55E]/20 rounded-xl text-xs font-bold text-[#22C55E] uppercase tracking-widest hover:bg-[#22C55E]/10 transition-colors flex items-center justify-center gap-2">
              Full Report <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
