'use client';

import React, { useEffect, useState } from 'react';
import { Search, Mail, Phone, Calendar, Shield, ExternalLink } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    // Fetch profiles with role = 'customer'
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Failed to load customers');
      setLoading(false);
      return;
    }

    const profilesList = profilesData || [];
    if (profilesList.length === 0) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    // Fetch orders in a single batch using user_id instead of customer_id
    const userIds = profilesList.map(p => p.id);
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, user_id, total_price')
      .in('user_id', userIds);

    if (ordersError) {
      console.error('Failed to load customer orders:', ordersError);
      setCustomers(profilesList.map(p => ({ ...p, orders: [] })));
    } else {
      // Map orders to their respective profile
      const ordersMap = new Map<string, any[]>();
      ordersData?.forEach(o => {
        const list = ordersMap.get(o.user_id) || [];
        list.push(o);
        ordersMap.set(o.user_id, list);
      });

      const combined = profilesList.map(p => ({
        ...p,
        orders: ordersMap.get(p.id) || []
      }));
      setCustomers(combined);
    }
    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated successfully');
      fetchCustomers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500">Manage your user base and view their activity.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2D6A4F]" />
            <input 
              placeholder="Search customers by name or email..." 
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No customers found.</td></tr>
              ) : (
                customers.map((customer) => {
                  const ordersCount = customer.orders?.length || 0;
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center font-bold">
                            {customer.avatar_url ? (
                              <img src={customer.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              (customer.full_name?.[0] || 'U').toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{customer.full_name || 'Unnamed User'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail className="h-3 w-3 text-slate-400" /> {customer.email}
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
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E6F0EB] text-[#1B4332] text-xs font-bold">
                          <Shield className="h-3 w-3" /> {customer.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => updateRole(customer.id, 'admin')}
                            className="text-[10px] uppercase font-bold text-slate-500 hover:text-[#1B4332] border border-slate-200 px-2 py-1 rounded hover:bg-slate-50"
                          >
                            Make Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
