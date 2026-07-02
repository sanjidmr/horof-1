import React from 'react';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  ArrowUpRight,
  Plus,
  Eye,
  TrendingUp,
  Clock,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/shadcn/button';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';

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
    { data: recentMessages },
    { data: newArrivals },
    { data: allOrdersData },
    { data: orderItemsData }
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('orders').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('total_price, status'),
    supabase.from('order_items').select('product_id, quantity, products(*)')
  ]);

  // Calculate total revenue
  const totalRevenue = allOrdersData?.reduce((acc, order) => acc + (Number((order as any).total_price) || 0), 0) || 0;


  // Real Best Selling Products
  const salesCount: Record<string, { product: any, count: number }> = {};
  if (orderItemsData) {
    orderItemsData.forEach((item: any) => {
      if (!item.products) return;
      if (!salesCount[item.product_id]) {
        salesCount[item.product_id] = { product: item.products, count: 0 };
      }
      salesCount[item.product_id].count += item.quantity || 1;
    });
  }
  
  const bestSellingProducts = Object.values(salesCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stats = [
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-forest-600', bg: 'bg-forest-50' },
    { label: 'Total Orders', value: orderCount || 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Customers', value: customerCount || 0, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Products', value: productCount || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
          <Button asChild variant="outline" className="border-[#1a4731] text-gray-800 bg-text-[#1a4731] hover:bg-[#1a4731]/5 rounded-xl px-6 h-12 transition-all">
            <Link href="/admin/orders">
              <Eye className="mr-2 h-4 w-4" /> View Orders
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[#1a4731] text-gray-800 hover:bg-[#1a4731]/5 rounded-xl px-6 h-12 transition-all">
            <Link href="/admin/messages">
              <MessageSquare className="mr-2 h-4 w-4" /> Messages
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform`}>
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
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Orders Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
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
                          <span className="text-sm font-bold text-[#1a4731]">#{String(order.id).slice(0, 8)}</span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-slate-900">{(order as any).profiles?.full_name || 'Guest'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{formatPrice(Number((order as any).total_price || order.amount || 0))}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
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

          {/* Recent Messages */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Mail className="h-5 w-5 text-[#1a4731]" />
                </div>
                <h3 className="text-xl font-display font-bold text-[#1a4731]">Recent Messages</h3>
              </div>
              <Link href="/admin/messages" className="text-xs font-bold text-[#1a4731] hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentMessages && recentMessages.length > 0 ? (
                recentMessages.map((msg) => (
                  <div key={msg.id} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-[#1a4731]/10 flex items-center justify-center flex-shrink-0 text-[#1a4731] font-bold text-sm">
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate pr-4">{msg.name}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{format(new Date(msg.created_at), 'MMM d')}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate mb-1">{msg.subject}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{msg.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">No new messages.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column (Sidebar Info) */}
        <div className="space-y-8">
          
          {/* Best Selling (Real Data) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-bold text-[#1a4731]">Best Selling</h3>
              <TrendingUp className="h-5 w-5 text-[#1a4731]/40" />
            </div>
            <div className="space-y-5">
              {bestSellingProducts && bestSellingProducts.length > 0 ? (
                bestSellingProducts.map((p, i) => (
                  <div key={p.product.id} className="flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 group-hover:shadow-md transition-shadow">
                      {p.product.images?.[0] && <img src={p.product.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.product.name}</p>
                      <p className="text-xs text-emerald-600 font-bold">{p.count} sold</p>
                    </div>
                    <span className="text-xs font-black text-[#1a4731]/20">#{i + 1}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">Not enough data to calculate best sellers yet.</div>
              )}
            </div>
          </div>

          {/* New Arrivals (Latest added) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-bold text-[#1a4731]">New Arrivals</h3>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-5">
              {newArrivals && newArrivals.length > 0 ? (
                newArrivals.map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">No new products added recently.</div>
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-gradient-to-br from-[#1a4731] to-forest-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-forest-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
            <h3 className="text-lg font-display font-bold mb-6 relative z-10">Store Insights</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Avg Order Value</span>
                </div>
                <span className="text-lg font-display font-bold text-white">
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
