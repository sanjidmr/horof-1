'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, CreditCard, Clock, PackageOpen, ArrowRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalSpent: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (orders) {
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => ['pending', 'processing'].includes(o.status)).length,
        totalSpent: orders.reduce((acc, o) => acc + Number(o.total), 0)
      });
      setRecentOrders(orders.slice(0, 3));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Welcome Back</h1>
        <p className="text-slate-500">Here's what's happening with your account today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pending Orders</p>
            <p className="text-2xl font-bold text-slate-900">{stats.pendingOrders}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900">৳{stats.totalSpent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-[#2D6A4F]" /> Recent Orders
          </h2>
          <Link href="/customer/orders" className="text-sm font-bold text-[#1B4332] hover:underline flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">You haven't placed any orders yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentOrders.map(order => (
              <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">Order #{order.id.split('-')[0].toUpperCase()}</p>
                  <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-bold text-slate-900">৳{Number(order.total).toLocaleString()}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase">{order.status}</p>
                  </div>
                  <Link href="/customer/orders" className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
