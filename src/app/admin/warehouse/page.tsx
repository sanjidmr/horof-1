'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Package, ClipboardList, Clock, Hourglass, PackageCheck, Truck, Send,
  CheckCheck, RotateCcw, XCircle, Bell, Loader2, AlertTriangle,
  ArrowRight, LayoutDashboard, Boxes, Inbox,
} from 'lucide-react';
import { getWarehouseDashboardStats, type WarehouseDashboardStats } from '@/lib/actions/warehouse';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useWarehouseRealtime } from '@/hooks/useWarehouseRealtime';

export default function WarehouseDashboardPage() {
  const { isWarehouseStaff, userRole } = useAuth();
  const [stats, setStats] = useState<WarehouseDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await getWarehouseDashboardStats();
      setStats(data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useWarehouseRealtime(createSupabaseBrowserClient(), stats?.warehouseId, fetchStats);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4731]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Boxes className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-bold text-slate-600">No Warehouse Assigned</p>
        <p className="text-sm mt-1">Contact an admin to assign you to a warehouse</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ClipboardList, color: 'text-slate-600', href: '/admin/warehouse/orders' },
    { label: 'Assigned (Pending)', value: stats.assigned, icon: Inbox, color: 'text-amber-600', href: '/admin/warehouse/orders' },
    { label: 'Processing', value: stats.processing, icon: Hourglass, color: 'text-blue-600', href: '/admin/warehouse/orders' },
    { label: 'Packed', value: stats.packed, icon: PackageCheck, color: 'text-teal-600', href: '/admin/warehouse/orders' },
    { label: 'Ready for Dispatch', value: stats.ready_for_dispatch, icon: Truck, color: 'text-purple-600', href: '/admin/warehouse/orders' },
    { label: 'Out for Delivery', value: stats.out_for_delivery, icon: Send, color: 'text-indigo-600', href: '/admin/warehouse/orders' },
    { label: 'Delivered', value: stats.delivered, icon: CheckCheck, color: 'text-emerald-600', href: '/admin/warehouse/orders' },
    { label: 'Returned', value: stats.returned, icon: RotateCcw, color: 'text-orange-600', href: '/admin/warehouse/orders' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-600', href: '/admin/warehouse/orders' },
    { label: 'Assigned Products', value: stats.totalProducts, icon: Package, color: 'text-[#1a4731]', href: '/admin/warehouse/products' },
    { label: 'Notifications', value: stats.unreadNotifications, icon: Bell, color: 'text-rose-600', href: '/admin/warehouse/orders' },
    { label: 'Urgent Priority', value: stats.highPriority, icon: AlertTriangle, color: 'text-red-600', href: '/admin/warehouse/orders' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-[#1a4731]" />
            Warehouse Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats.warehouseName}
            {isWarehouseStaff ? '' : ' · Aggregate across all warehouses'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/warehouse/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#1a4731] border border-[#1a4731]/20 rounded-xl hover:bg-[#f0fdf4] transition-all">
            <ClipboardList className="w-4 h-4" /> Orders
          </Link>
          <Link href="/admin/warehouse/products" className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-[#1a4731] hover:bg-[#22573d] text-white rounded-xl transition-all shadow-lg shadow-[#1a4731]/30">
            <Package className="w-4 h-4" /> Products
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-[#1a4731]/30 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#1a4731] transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Warehouse Orders', desc: 'Accept, process, pack and dispatch assigned orders', icon: ClipboardList, href: '/admin/warehouse/orders' },
            { title: 'My Products', desc: 'Update stock and pricing for your warehouse products', icon: Package, href: '/admin/warehouse/products' },
            { title: 'Activity & Review', desc: 'Track every action and review assignment history', icon: Clock, href: '/admin/warehouse/activity' },
          ].map((q) => (
            <Link key={q.title} href={q.href} className="group flex items-start gap-3 rounded-xl border border-slate-100 p-4 hover:border-[#1a4731]/30 hover:bg-[#f0fdf4] transition-all">
              <div className="p-2 rounded-lg bg-[#1a4731]/10 text-[#1a4731]">
                <q.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-[#1a4731]">{q.title}</p>
                <p className="text-xs text-slate-500 mt-1">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
