'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, RefreshCcw, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';

export default function OrderFailedPage() {
  const searchParams = useSearchParams();
  const tran_id = searchParams.get('tran_id');
  const reason = searchParams.get('reason');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border-t-4 border-red-500">
        <div className="p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-500 mb-8">
            {reason === 'validation_failed' 
              ? "We couldn't validate your payment. If money was deducted, it will be refunded automatically." 
              : "We couldn't process your payment at this time. Please try again."}
          </p>
          
          {tran_id && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-gray-600 border border-gray-100">
              Transaction ID: <span className="font-mono font-medium text-gray-900">{tran_id}</span>
            </div>
          )}

          <div className="space-y-4">
            <Link 
              href="/checkout" 
              className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
            >
              <RefreshCcw className="w-5 h-5 mr-2" />
              Try Payment Again
            </Link>
            
            <a 
              href="mailto:support@horof.com" 
              className="w-full flex items-center justify-center px-6 py-4 border-2 border-gray-200 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <HeadphonesIcon className="w-5 h-5 mr-2 text-gray-400" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
