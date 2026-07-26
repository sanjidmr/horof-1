'use client';

import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Palette, ChevronRight, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  design_in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  design_ready: 'bg-green-50 text-green-700 border-green-200',
  waiting_approval: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revision_requested: 'bg-pink-50 text-pink-700 border-pink-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-slate-50 text-slate-700 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  design_in_progress: 'Design In Progress',
  design_ready: 'Design Ready',
  waiting_approval: 'Waiting Approval',
  approved: 'Approved',
  revision_requested: 'Revision Requested',
  rejected: 'Rejected',
  completed: 'Completed',
};

export default function MyDesignRequestsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('design_requests')
        .select('*, files:design_request_files(count)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch design requests:', error);
        return;
      }
      setRequests(data || []);
    } catch (err: any) {
      console.error('fetchRequests error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      fetchRequests();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user, fetchRequests]);

  const getFileCount = (files: any): number => {
    if (!files) return 0;
    if (Array.isArray(files)) return files.length;
    if (typeof files === 'object' && files.count !== undefined) return files.count;
    return 0;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#1a4731] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12 text-center max-w-md w-full">
          <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
            <Palette className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Please log in to view your design requests</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to access your custom design portfolio.</p>
          <Link
            href="/login?next=/design-requests"
            className="inline-flex px-6 py-3 bg-[#1a4731] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-all text-sm uppercase tracking-wider shadow-lg shadow-[#1a4731]/20"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#E6F0EB] text-[#1a4731] flex items-center justify-center shrink-0">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Design Requests</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage your custom design projects.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-5 bg-slate-200 rounded w-48" />
                    <div className="h-3 bg-slate-200 rounded w-64" />
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12 text-center max-w-lg mx-auto">
            <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
              <Palette className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">No design requests yet</h2>
            <p className="text-sm text-slate-500">Submit one on our home page!</p>
            <Link
              href="/"
              className="inline-flex mt-6 px-5 py-2.5 bg-[#1a4731] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-all text-xs uppercase tracking-wider"
            >
              Go to Home Page
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Link
                key={req.id}
                href={`/design-requests/${req.id}`}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 p-5 md:p-6 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-400 tracking-wider">
                        #{req.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-slate-300 text-[10px]">·</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {req.product_name && (
                      <h3 className="font-bold text-base text-slate-800 group-hover:text-[#1a4731] transition-colors truncate">
                        {req.product_name}
                      </h3>
                    )}

                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {req.description?.length > 100
                        ? req.description.slice(0, 100) + '...'
                        : req.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {getFileCount(req.files)} file{getFileCount(req.files) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap',
                        STATUS_COLORS[req.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                      )}
                    >
                      {STATUS_LABELS[req.status] || req.status.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#1a4731] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
