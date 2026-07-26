'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronRight, Package, Home, Eye } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clearCheckoutItems } from '@/lib/checkoutStorage';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const tran_id = searchParams.get('tran_id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear checkout items when landing on success page
    clearCheckoutItems();

    const fetchOrder = async () => {
      if (tran_id) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('transaction_id', tran_id)
          .single();
        
        if (data) {
          setOrder(data);
        }
      }
      setLoading(false);
    };

    fetchOrder();
  }, [tran_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all">
        <div className="bg-emerald-600 p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Payment Successful!</h2>
          <p className="mt-2 text-emerald-100 font-medium">Thank you for your purchase.</p>
        </div>
        
        <div className="p-8">
          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Order Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-semibold text-gray-900">{tran_id || 'N/A'}</span>
              </div>
              
              {order && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Date</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-emerald-600 text-lg">
                      ৳ {order.amount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Link 
              href={`/track-order?order=${order?.order_number || order?.id || ''}`}
              className="w-full flex items-center justify-center px-6 py-3 border-2 border-emerald-600 text-base font-medium rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Eye className="w-5 h-5 mr-2" />
              Track Order
            </Link>
            <Link 
              href="/orders" 
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Package className="w-5 h-5 mr-2" />
              View Orders
            </Link>
            <Link 
              href="/" 
              className="w-full flex items-center justify-center px-6 py-3 border-2 border-gray-200 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
