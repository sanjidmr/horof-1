import React from 'react';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  Eye,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/shadcn/button';
import { formatPrice } from '@/lib/utils';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch stats in parallel
  const [
    { count: productCount },
    { count: orderCount },
    { count: customerCount },
    { data: orders },
    { data: lowStockProducts },
    { data: bestSellingProducts },
    { count: newArrivalsCount },
    { data: productOfDay }
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('orders').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('*').lte('stock', 5).limit(5),
    supabase.from('products').select('*').eq('is_best_selling', true).limit(5),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_new_arrival', true),
    supabase.from('products').select('*').eq('is_product_of_the_day', true).maybeSingle()
  ]);

  // Calculate total revenue
  const { data: allOrders } = await supabase.from('orders').select('total');
  const totalRevenue = allOrders?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

  const stats = [
    { label: 'Total Products', value: productCount || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders', value: orderCount || 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Customers', value: customerCount || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-forest-600', bg: 'bg-forest-50' },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-[#1a4731]">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {profile?.full_name || 'Admin'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-[#1a4731] hover:bg-[#2d6a4f] text-white rounded-xl px-6 h-12 shadow-lg shadow-forest-900/10 transition-all hover:-translate-y-0.5">
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[#1a4731] text-white bg-text-[#1a4731] hover:bg-[#1a4731]/5 rounded-xl px-6 h-12 transition-all">
            <Link href="/admin/orders">
              <Eye className="mr-2 h-4 w-4" /> View Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[#1a4731] text-white hover:bg-[#1a4731]/5 rounded-xl px-6 h-12 transition-all">
            <Link href="/admin/customers">
              <Users className="mr-2 h-4 w-4" /> Manage Users
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color === 'text-forest-600' ? 'text-[#1a4731]' : stat.color}`} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Status</span>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-display font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-display font-bold text-[#1a4731]">Recent Orders</h3>
              <Link href="/admin/orders" className="text-xs font-bold text-[#1a4731] hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="px-8 py-4">Order ID</th>
                    <th className="px-8 py-4">Customer</th>
                    <th className="px-8 py-4">Amount</th>
                    <th className="px-8 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders && orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-[#1a4731]">#{order.id.slice(0, 8)}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-slate-900">{(order as any).profiles?.full_name || 'Guest'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{formatPrice(order.total)}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-10 text-center text-slate-400 text-sm">No recent orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Best Selling */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-display font-bold text-[#1a4731]">Best Selling</h3>
                <TrendingUp className="h-5 w-5 text-[#1a4731]/40" />
              </div>
              <div className="space-y-4">
                {bestSellingProducts?.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatPrice(p.price)}</p>
                    </div>
                    <span className="text-[10px] font-black text-[#1a4731]/20">0{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Product of Day */}
            <div className="bg-[#1a4731] p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl shadow-forest-900/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Daily Spotlight</span>
                </div>
                {productOfDay ? (
                  <div className="space-y-4">
                    <div className="h-32 w-full rounded-2xl overflow-hidden shadow-2xl">
                      <img src={productOfDay.images?.[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-bold leading-tight">{productOfDay.name}</h4>
                      <p className="text-white/60 text-xs mt-1 font-light line-clamp-2">{productOfDay.description}</p>
                    </div>
                    <Button asChild size="sm" className="w-full bg-white text-[#1a4731] hover:bg-slate-100 rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 transition-all">
                      <Link href={`/admin/products/${productOfDay.id}/edit`}>Edit Product</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="py-10 text-center text-white/40 italic text-sm">No product highlighted today.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Low Stock Alerts */}
          <div className="bg-red-50/30 p-8 rounded-[2.5rem] border border-red-100">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-bold text-red-900">Low Stock Alert</h3>
            </div>
            <div className="space-y-4">
              {lowStockProducts && lowStockProducts.length > 0 ? (
                lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                    <div className="min-w-0 flex-1 mr-4">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{p.stock} Units left</p>
                    </div>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#1a4731]">
                      <Link href={`/admin/products/${p.id}/edit`}><Plus className="h-4 w-4 rotate-45" /></Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm italic">Stock levels are healthy.</div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-display font-bold text-[#1a4731] mb-6">Store Insights</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-[#1a4731]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">New Arrivals</span>
                </div>
                <span className="text-lg font-display font-bold text-slate-900">{newArrivalsCount || 0}</span>
              </div>
              <div className="h-px bg-slate-50" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-[#1a4731]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Avg Order Value</span>
                </div>
                <span className="text-lg font-display font-bold text-slate-900">
                  {orderCount && orderCount > 0 ? formatPrice(totalRevenue / (orderCount || 1)) : formatPrice(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
