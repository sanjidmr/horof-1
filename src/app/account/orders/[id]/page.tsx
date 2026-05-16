import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { formatPrice, cn } from '@/lib/utils';
import { Package, Clock, MapPin, CreditCard, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, product:products(name, image_url)')
    .eq('order_id', id);

  const { data: timeline } = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/account/orders" className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.order_number}</h1>
            <Badge variant="secondary" className="capitalize">{order.status}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Package size={16} />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {(items ?? []).map((item) => (
                  <div key={item.id} className="p-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden border flex-shrink-0">
                      <img src={item.product?.image_url || '/placeholder.png'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{item.product?.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.quantity} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-50/50 border-t space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Delivery Charge</span>
                  <span>{formatPrice(order.delivery_charge)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                  <span>Total</span>
                  <span className="text-accent-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} />
                Order Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {(timeline ?? []).map((t, idx) => (
                  <div key={t.id} className="relative pl-10">
                    <div className={cn(
                      "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm ring-2",
                      idx === timeline!.length - 1 ? "bg-accent-primary ring-accent-primary/20" : "bg-slate-200 ring-slate-100"
                    )} />
                    <div>
                      <div className="font-bold text-slate-900 capitalize">{t.status}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(t.created_at).toLocaleString()}</div>
                      {t.note && <div className="text-xs text-slate-500 mt-1">{t.note}</div>}
                    </div>
                  </div>
                ))}
                {(!timeline || timeline.length === 0) && (
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm ring-2 bg-accent-primary ring-accent-primary/20" />
                    <div>
                      <div className="font-bold text-slate-900">Order Placed</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} />
                Shipping To
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-bold text-slate-900">{order.full_name}</div>
              <div className="text-sm text-slate-600 leading-relaxed">
                {order.shipping_address}<br />
                {order.area && `${order.area}, `}{order.city}
              </div>
              <div className="text-sm text-slate-600">{order.phone}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={16} />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Method</span>
                <span className="text-sm font-bold uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <Badge variant="outline" className="capitalize">{order.payment_status}</Badge>
              </div>
              {order.transaction_id && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Transaction ID</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1">{order.transaction_id}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
