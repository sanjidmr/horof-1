import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params?.token;
  let success = false;

  if (token) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from('subscribers')
        .update({ is_active: false, unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('unsubscribe_token', token);
      if (!error) success = true;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-10 text-center">
        {success ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Unsubscribed</h1>
            <p className="text-slate-500 mb-6">You have been successfully unsubscribed from our marketing emails.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
            <p className="text-slate-500 mb-6">This unsubscribe link is invalid or expired.</p>
          </>
        )}
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-[#1a4731] text-white font-bold rounded-xl hover:bg-[#14402a] transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
