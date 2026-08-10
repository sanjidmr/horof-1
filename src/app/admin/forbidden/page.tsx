import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-lg mx-auto px-6">
        <div className="relative">
          <div className="text-[12rem] font-display font-bold text-[#1a4731]/5 leading-none select-none">403</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-3xl bg-red-50 flex items-center justify-center shadow-lg border border-red-100">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-display font-bold text-slate-900">
            Access <span className="text-[#c9a84c] italic">Denied</span>
          </h1>
          <p className="text-slate-500 text-lg font-light leading-relaxed max-w-sm mx-auto">
            You don't have permission to access this page. Please contact your administrator for access.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#1a4731] text-white rounded-2xl text-sm font-bold tracking-wider uppercase hover:bg-[#0e2f20] transition-all duration-300 shadow-lg shadow-[#1a4731]/20"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl text-sm font-bold tracking-wider uppercase hover:bg-slate-50 transition-all duration-300"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
