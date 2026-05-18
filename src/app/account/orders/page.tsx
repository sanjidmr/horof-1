import React from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { formatPrice } from '@/lib/utils';
import { Package, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';

export default async function AccountOrdersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id,total_price,status,payment_status,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const orders = (rawOrders ?? []).map(o => ({
    ...o,
    amount: (o as any).total_price ?? 0,
    order_number: `#${o.id.slice(0, 8)}`
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order History</h1>
        <p className="text-sm text-slate-500">View and track all your handcrafted treasures.</p>
      </div>

      <div className="space-y-4">
        {(!orders || orders.length === 0) ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No orders yet</h3>
            <p className="text-slate-500 mb-6">Start your collection with something special.</p>
            <Link href="/products">
              <button className="px-8 py-3 bg-accent-primary text-white rounded-full font-bold shadow-xl shadow-accent-primary/20 hover:scale-105 transition-transform">
                Explore Products
              </button>
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-accent-primary group-hover:text-white transition-colors">
                      <Package size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{order.order_number}</span>
                        <Badge variant="secondary" className="capitalize text-[10px]">{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{formatPrice(order.amount)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link href={`/account/orders/${order.id}`} className="flex-1 md:flex-none">
                      <button className="w-full px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-accent-primary transition-colors flex items-center justify-center gap-2">
                        View Details
                        <ExternalLink size={14} />
                      </button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
