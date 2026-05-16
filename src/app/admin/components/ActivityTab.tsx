'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ShoppingBag, UserPlus, Edit3, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const ActivityTab = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const combined = [
        ...(recentOrders || []).map(o => ({
          id: `order-${o.id}`,
          type: 'order',
          message: `New order placed: #${o.id.slice(0, 8).toUpperCase()}`,
          time: new Date(o.created_at),
          icon: ShoppingBag,
          color: 'text-[#22C55E]',
          bg: 'bg-[#22C55E]/10 border-[#22C55E]/20'
        })),
        ...(recentUsers || []).map(u => ({
          id: `user-${u.created_at}`,
          type: 'user',
          message: `New customer joined: ${u.full_name || 'Guest User'}`,
          time: new Date(u.created_at),
          icon: UserPlus,
          color: 'text-[#A7F3D0]',
          bg: 'bg-[#14532D] border-[#22C55E]/20'
        }))
      ];

      combined.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl"
    >
      <div className="space-y-1">
        <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Activity Logs</h2>
        <p className="text-[#A7F3D0] text-sm">System-wide event tracking and audit trails</p>
      </div>

      <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] overflow-hidden shadow-2xl p-8">
        {loading ? (
          <div className="text-center py-12 text-[#A7F3D0]">Loading logs...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-[#A7F3D0]">No recent activity</div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#22C55E]/20 before:to-transparent">
            {activities.map((act, i) => (
              <div key={act.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0F241C] ${act.bg} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10`}>
                  <act.icon className={`h-4 w-4 ${act.color}`} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-[#22C55E]/10 bg-[#071A12] shadow-sm hover:border-[#22C55E]/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#ECFDF5] text-sm">{act.type.toUpperCase()}</span>
                    <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest">{act.time.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[#A7F3D0]/80">{act.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
