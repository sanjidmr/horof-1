import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { formatPrice } from '@/lib/utils';
import { User, Mail, Phone, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id,total_price,status,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const orders = (rawOrders ?? []).map(o => ({
    ...o,
    amount: (o as any).total_price ?? 0,
    order_number: `#${o.id.slice(0, 8)}`
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back, {profile?.full_name?.split(' ')[0] || 'Member'}</h1>
          <p className="text-sm text-slate-500">Manage your profile, orders, and preferences.</p>
        </div>
        <Link href="/products">
          <button className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-accent-primary transition-colors flex items-center gap-2">
            Continue Shopping
            <ShoppingBag size={14} />
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <User size={16} />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl">
                {profile?.full_name?.[0] || user.email?.[0].toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-lg">{profile?.full_name || 'Anonymous User'}</div>
                <div className="text-sm text-slate-500">Member since {new Date(profile?.created_at || user.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-slate-400" />
                <span className="text-slate-600">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-slate-400" />
                <span className="text-slate-600">{profile?.phone || 'No phone set'}</span>
              </div>
            </div>

            <Link href="/account/settings" className="block">
              <button className="w-full py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest">
                Edit Profile
              </button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={16} />
              Recent Orders
            </CardTitle>
            <Link href="/account/orders" className="text-xs font-bold text-accent-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(orders ?? []).map((order) => (
                <Link key={order.id} href={`/account/orders/${order.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{order.order_number}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                        {new Date(order.created_at).toLocaleDateString()} · {formatPrice(order.amount)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">{order.status}</Badge>
                  </div>
                </Link>
              ))}
              {(!orders || orders.length === 0) && (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  No orders found.
                </div>
              )}
            </div>
            {orders && orders.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t">
                <Link href="/account/orders" className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 justify-center">
                  Track Your Shipments
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

