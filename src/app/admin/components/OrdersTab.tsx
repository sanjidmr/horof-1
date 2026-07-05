'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreVertical, Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, Eye } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn, formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

export const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // For this demo, we assume 'orders' table exists with these fields.
      // We will also join with 'profiles' to get customer names if possible, 
      // but standard Supabase orders table might not have foreign keys set up perfectly.
      // Let's fetch orders directly.
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });
        
      if (error) {
        // Fallback if relation fails
        const { data: rawOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        setOrders(rawOrders || []);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'delivered': return 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20';
      case 'shipped': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'processing': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-[#A7F3D0] bg-[#0B3D2E] border-[#22C55E]/20';
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Order Management</h2>
          <p className="text-[#A7F3D0] text-sm">Real-time fulfillment and logistics tracking</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-xl bg-[#0F241C] border border-[#22C55E]/20 text-[#A7F3D0] font-bold text-xs uppercase tracking-widest hover:text-[#ECFDF5] transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0B3D2E]/20">
        <div className="p-8 border-b border-[#22C55E]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#071A12]/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A7F3D0]" />
            <input
              placeholder="Search by Order ID or Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-[#071A12] border border-[#22C55E]/20 rounded-2xl pl-12 pr-4 text-sm text-[#ECFDF5] outline-none focus:border-[#22C55E] transition-all placeholder:text-[#A7F3D0]/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-[#071A12] text-[10px] font-bold text-[#A7F3D0] uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Order ID</th>
                <th className="px-8 py-6">Customer</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Total</th>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22C55E]/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-[#A7F3D0]">Loading orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-[#A7F3D0]">No orders found</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#14532D]/20 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-mono text-xs text-[#22C55E] font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-[#ECFDF5]">{order.profiles?.full_name || 'Guest User'}</p>
                      <p className="text-[10px] text-[#A7F3D0]/70 uppercase tracking-widest">{order.profiles?.email || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        getStatusColor(order.status)
                      )}>
                        {order.status === 'delivered' && <CheckCircle className="h-3 w-3" />}
                        {order.status === 'shipped' && <Truck className="h-3 w-3" />}
                        {(order.status === 'processing' || order.status === 'pending') && <Clock className="h-3 w-3" />}
                        {order.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-display font-bold text-lg text-[#ECFDF5]">{formatPrice(order.total_price || order.total || 0)}</span>
                    </td>
                    <td className="px-8 py-6 text-xs text-[#A7F3D0]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="h-10 w-10 rounded-xl bg-[#071A12] hover:bg-[#14532D] text-[#A7F3D0] hover:text-[#ECFDF5] border border-[#22C55E]/20 flex items-center justify-center transition-all shadow-sm ml-auto">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
