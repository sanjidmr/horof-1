'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, MapPin, Calendar, CheckCircle2, Clock, Truck, ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import Link from 'next/link';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    const sb = createSupabaseBrowserClient();
    
    try {
      const { data, error: fetchError } = await sb
        .from('orders')
        .select('*, order_items(*, products(name, images))')
        .eq('order_number', orderNumber.trim())
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError("We couldn't find an order with those details. Please check your order number and email.");
        setLoading(false);
        return;
      }

      const { data: timelineData } = await sb
        .from('order_timeline')
        .select('*')
        .eq('order_id', data.id)
        .order('created_at', { ascending: false });

      setOrder(data);
      setTimeline(timelineData || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="text-green-500" />;
      case 'shipped': return <Truck className="text-blue-500" />;
      case 'processing': return <Clock className="text-amber-500" />;
      default: return <Package className="text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h1 className="text-4xl md:text-6xl font-display font-medium text-slate-900 leading-tight">
            Track Your <br />
            <span className="italic text-accent-light">Treasures</span>
          </h1>
          <p className="text-slate-500 font-light text-lg">Enter your details to see the journey of your handcrafted pieces.</p>
        </div>

        {!order ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm"
          >
            <form onSubmit={handleTrack} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orderNumber" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order Number</Label>
                <Input 
                  id="orderNumber"
                  placeholder="HRF-XXXXXXXX"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-accent-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</Label>
                <Input 
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-accent-primary"
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-accent-primary text-white hover:bg-accent-hover shadow-xl shadow-accent-primary/20"
              >
                {loading ? "Searching..." : "Track Order"}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {/* Summary Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-accent-primary text-white rounded-[3rem] p-10 md:p-16 relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 block mb-2">Current Status</span>
                    <h2 className="text-3xl md:text-5xl font-display capitalize italic">{order.status}</h2>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 block mb-1">Order #</span>
                      <span className="text-sm font-mono font-bold">{order.order_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 block mb-1">Items</span>
                      <span className="text-sm font-bold">{order.order_items?.length} Artisan Pieces</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-[1px] bg-white/20 hidden md:block" />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60 block">Shipped To</span>
                    <p className="text-sm font-medium leading-relaxed max-w-[200px]">{order.shipping_address}</p>
                  </div>
                </div>
              </div>
              
              {/* Background Graphics */}
              <div className="absolute top-0 right-0 p-10 opacity-10">
                <Package size={200} strokeWidth={1} />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Timeline */}
              <div className="lg:col-span-2 space-y-8">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <Clock size={20} className="text-accent-primary" />
                  Order Journey
                </h3>
                <div className="space-y-8 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-px before:bg-slate-100">
                  {timeline.length > 0 ? timeline.map((event, idx) => (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-8 relative"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-sm transition-all",
                        idx === 0 ? "bg-accent-primary text-white" : "bg-slate-50 text-slate-400"
                      )}>
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-slate-900 capitalize">{event.status}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(event.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 font-light">{event.note || `Order status updated to ${event.status}.`}</p>
                      </div>
                    </motion.div>
                  )) : (
                    <p className="text-slate-400 italic pl-16">Journey data is being processed...</p>
                  )}
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <ShoppingBag size={20} className="text-accent-primary" />
                  Your Collection
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 space-y-6">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-100 flex-shrink-0">
                        <img 
                          src={item.products?.images?.[0]} 
                          alt={item.products?.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.products?.name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Qty: {item.quantity}</p>
                        <p className="text-xs font-bold text-accent-primary mt-1">{formatPrice(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-6 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-2">
                      <span>Total Collection Value</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex gap-4 items-center">
                  <ShieldCheck size={32} className="text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-green-900 uppercase tracking-widest">Heritage Guarantee</h4>
                    <p className="text-[10px] text-green-700/70 mt-1">Every piece is verified for artisanal quality and authenticity.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center pt-8">
              <Button 
                variant="outline" 
                onClick={() => setOrder(null)}
                className="rounded-full px-10 h-14 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Track Another Order
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
