'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';

export default function OrderConfirmationPage() {
  const orderId = 'ORD-' + Math.floor(Math.random() * 900000 + 100000);

  return (
    <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 100 }}
        className="h-24 w-24 bg-success/20 rounded-full flex items-center justify-center mb-8 border border-success/30"
      >
        <CheckCircle className="h-12 w-12 text-success" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <h1 className="text-5xl font-display font-bold text-text-primary">Order Confirmed!</h1>
        <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
          Thank you for your purchase. Our artisans have received your order and are preparing your handcrafted treasures for delivery.
        </p>
        
        <div className="bg-bg-card border border-border-forest rounded-2xl p-6 inline-block">
          <p className="text-xs text-text-muted uppercase tracking-[0.3em] mb-2 font-bold">Order Tracking ID</p>
          <p className="text-2xl font-display font-bold text-gold">{orderId}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
           <Button variant="gold" className="px-8">
             Track Order <Package className="ml-2 h-5 w-5" />
           </Button>
           <Link href="/products">
             <Button variant="outline" className="px-8">
               Return to Shop <ShoppingBag className="ml-2 h-5 w-5" />
             </Button>
           </Link>
        </div>
      </motion.div>
    </div>
  );
};
