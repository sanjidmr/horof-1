'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Palette, Search, Eye, Filter, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getDesignRequests } from '@/lib/actions/design-requests';
import Link from 'next/link';

interface DesignRequestFile {
  count: number;
}

interface DesignRequest {
  id: string;
  customer_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  product_name: string | null;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  files: DesignRequestFile | DesignRequestFile[];
}

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

export default function DesignRequestsClient() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const perPage = 20;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDesignRequests({
        search: search || undefined,
        status: statusFilter || undefined,
        sort: sort === 'updated' ? 'updated' : undefined,
        page,
        perPage,
      });
      if (result.error) {
        console.error('Failed to fetch design requests:', result.error);
      }
      setRequests(result.data as DesignRequest[]);
      setTotal(result.total);
    } catch (err: any) {
      console.error('fetchRequests error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort, page, refreshKey]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const getFileCount = (files: DesignRequestFile | DesignRequestFile[] | undefined): number => {
    if (!files) return 0;
    if (Array.isArray(files)) return files.length;
    return files.count ?? 0;
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6 max-w-7xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Design Requests</h1>
          <p className="text-slate-500 mt-1">{total} total requests</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, description..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 appearance-none"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 appearance-none"
          >
            <option value="newest">Newest</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <div className="h-8 w-8 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading design requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Palette className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No design requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Files</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map(req => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/admin/design-requests/${req.id}`}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-bold text-slate-900">
                        {req.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#1a4731] flex items-center justify-center overflow-hidden shrink-0">
                          <span className="text-sm font-bold text-white">
                            {(req.full_name || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">{req.full_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">{req.email}</div>
                      {req.phone_number && <div className="text-xs text-slate-400">{req.phone_number}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{req.product_name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${STATUS_COLORS[req.status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {STATUS_LABELS[req.status] || req.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-slate-600 font-bold">{getFileCount(req.files)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/design-requests/${req.id}`}
                          className="p-2 text-slate-400 hover:text-[#1a4731] hover:bg-[#1a4731]/5 rounded-lg transition"
                          title="View"
                          onClick={e => e.stopPropagation()}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-slate-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
