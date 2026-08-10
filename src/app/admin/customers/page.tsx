'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Mail, Phone, Calendar, Shield, ExternalLink, Users, Ban, UserCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  user_type: string;
  is_banned: boolean;
  is_warehouse_staff: boolean;
  avatar_url: string | null;
  created_at: string;
  orders?: any[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const perPage = 20;
  const supabase = createSupabaseBrowserClient();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ONLY real customers: user_type = 'customer', role = 'customer', not warehouse staff
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('user_type', 'customer')
        .eq('role', 'customer')
        .eq('is_warehouse_staff', false);

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);

      if (error) {
        console.error('Failed to load customers:', error);
        toast.error('Failed to load customers');
        setLoading(false);
        return;
      }

      const profilesList = (data || []) as Customer[];
      setTotal(count || 0);

      if (profilesList.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Fetch orders for these customers
      const userIds = profilesList.map(p => p.id);
      const [ordersRes, requestsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, user_id, total_price')
          .in('user_id', userIds),
        supabase
          .from('order_requests')
          .select('id, user_id, final_total_price')
          .in('user_id', userIds)
          .in('status', ['pending', 'rejected'])
      ]);

      const ordersMap = new Map<string, any[]>();
      ordersRes.data?.forEach(o => {
        const list = ordersMap.get(o.user_id) || [];
        list.push({ ...o, is_request: false });
        ordersMap.set(o.user_id, list);
      });
      requestsRes.data?.forEach(r => {
        const list = ordersMap.get(r.user_id) || [];
        list.push({ id: r.id, user_id: r.user_id, total_price: r.final_total_price, is_request: true });
        ordersMap.set(r.user_id, list);
      });

      const combined = profilesList.map(p => ({
        ...p,
        orders: ordersMap.get(p.id) || []
      }));
      setCustomers(combined);
    } catch (err) {
      console.error('fetchCustomers error:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [supabase, search, page, refreshKey]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleBan = async (customer: Customer) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !customer.is_banned }).eq('id', customer.id);
    if (error) return toast.error(error.message);
    toast.success(customer.is_banned ? 'Customer unbanned' : 'Customer banned');
    setRefreshKey(k => k + 1);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6 max-w-7xl pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">{total} total customers</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <div className="h-8 w-8 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map((customer) => {
                  const ordersCount = customer.orders?.length || 0;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/admin/customers/${customer.id}`} className="flex items-center gap-3 group">
                          <div className="h-10 w-10 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center font-bold shrink-0">
                            {customer.avatar_url ? (
                              <img src={customer.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              (customer.full_name?.[0] || 'U').toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#1B4332] flex items-center gap-1.5 transition-colors">
                              {customer.full_name || 'Unnamed User'}
                              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#2D6A4F]" />
                            </p>
                            <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400" /> {customer.email || '—'}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" /> {customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          {ordersCount} Orders
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {customer.is_banned ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                            <Ban className="h-3 w-3" /> Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                            <UserCheck className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleBan(customer)}
                            className={`p-2 rounded-lg transition ${customer.is_banned ? 'text-slate-400 hover:text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}
                            title={customer.is_banned ? 'Unban' : 'Ban'}
                          >
                            {customer.is_banned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                ←
              </button>
              <span className="text-sm font-bold text-slate-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}