'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function OrderCancelledPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <OrderCancelledContent />
    </Suspense>
  );
}

function OrderCancelledContent() {
  const searchParams = useSearchParams();
  const tran_id = searchParams.get('tran_id');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-amber-50 mb-6">
          <AlertCircle className="h-10 w-10 text-amber-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Cancelled</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          You have cancelled the payment process. No charges were made to your account. Your items are still in your cart.
        </p>
        
        {tran_id && (
          <p className="text-xs text-gray-400 mb-8 uppercase tracking-wide">
            Ref: {tran_id}
          </p>
        )}

        <div className="space-y-3">
          <Link 
            href="/checkout" 
            className="w-full flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Checkout
          </Link>
          <Link 
            href="/shop" 
            className="w-full flex items-center justify-center px-6 py-3.5 border-2 border-gray-100 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 mr-2 text-gray-400" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
