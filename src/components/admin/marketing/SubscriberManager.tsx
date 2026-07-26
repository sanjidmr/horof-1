'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Plus, Edit2, Trash2, Save, X, Search, Mail, CheckCircle, XCircle, Users, Loader2, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Subscriber = {
  id: string; email: string; full_name: string | null; phone: string | null;
  source: string; tags: string[]; is_active: boolean;
  subscribed_at: string; unsubscribed_at: string | null;
  unsubscribe_token: string | null; created_at: string; updated_at: string;
};

const SOURCE_STYLES: Record<string, string> = {
  newsletter: 'bg-emerald-50 text-emerald-700',
  popup: 'bg-blue-50 text-blue-700',
  checkout: 'bg-purple-50 text-purple-700',
  admin: 'bg-amber-50 text-amber-700',
  import: 'bg-slate-100 text-slate-600',
};

export function SubscriberManager({
  initialSubscribers, initialSources,
}: {
  initialSubscribers: Subscriber[]; initialSources: string[];
}) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', full_name: '', phone: '', source: 'newsletter', tags: '',
  });

  const supabase = createSupabaseBrowserClient();

  const filtered = useMemo(() => {
    let list = subscribers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => s.email.toLowerCase().includes(q) || (s.full_name?.toLowerCase().includes(q))
      );
    }
    if (sourceFilter) list = list.filter((s) => s.source === sourceFilter);
    if (statusFilter === 'active') list = list.filter((s) => s.is_active);
    else if (statusFilter === 'inactive') list = list.filter((s) => !s.is_active);
    return list;
  }, [subscribers, searchQuery, sourceFilter, statusFilter]);

  const resetForm = () => {
    setFormData({ email: '', full_name: '', phone: '', source: 'newsletter', tags: '' });
  };

  const handleEdit = (s: Subscriber) => {
    setEditingId(s.id);
    setFormData({
      email: s.email, full_name: s.full_name || '', phone: s.phone || '',
      source: s.source, tags: (s.tags || []).join(', '),
    });
  };

  const handleSave = async () => {
    if (!formData.email.trim()) { toast.error('Email is required'); return; }
    setIsLoading(true);
    const payload: any = {
      email: formData.email.trim(),
      full_name: formData.full_name.trim() || null,
      phone: formData.phone.trim() || null,
      source: formData.source,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (editingId) {
      const { error } = await supabase.from('subscribers').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); setIsLoading(false); return; }
      toast.success('Subscriber updated');
      setSubscribers((prev) => prev.map((s) => s.id === editingId ? { ...s, ...payload } : s));
    } else {
      const { data, error } = await supabase.from('subscribers').insert(payload).select('*').single();
      if (error) { toast.error(error.message); setIsLoading(false); return; }
      toast.success('Subscriber added');
      setSubscribers((prev) => [data as Subscriber, ...prev]);
    }
    setEditingId(null); setIsAdding(false); resetForm();
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subscribers').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    toast.success('Subscriber deleted');
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from('subscribers')
      .update({
        is_active,
        unsubscribed_at: is_active ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    setSubscribers((prev) => prev.map((s) => s.id === id ? { ...s, is_active, unsubscribed_at: is_active ? null : new Date().toISOString() } : s));
    toast.success(is_active ? 'Subscriber activated' : 'Subscriber deactivated');
  };

  const exportCsv = () => {
    const headers = ['email', 'full_name', 'phone', 'source', 'tags', 'is_active', 'subscribed_at'];
    const rows = filtered.map((s) =>
      [s.email, s.full_name || '', s.phone || '', s.source, (s.tags || []).join(';'), s.is_active ? 'yes' : 'no', s.subscribed_at].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all bg-white"
          >
            <option value="">All Sources</option>
            {initialSources.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-2 text-xs font-bold transition-colors',
                  statusFilter === s ? 'bg-[#1a4731] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Subscriber
          </Button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit' : 'Add'} Subscriber
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+8801XXXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <select
                value={formData.source}
                onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all"
              >
                <option value="newsletter">Newsletter</option>
                <option value="popup">Popup</option>
                <option value="checkout">Checkout</option>
                <option value="admin">Admin</option>
                <option value="import">Import</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
              placeholder="vip, repeat-customer, wholesale"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.email.trim()}>
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Add'} Subscriber
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Subscriber</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Tags</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Subscribed</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#1a4731]/10 flex items-center justify-center text-[#1a4731] font-bold text-xs">
                        {(s.full_name || s.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{s.full_name || '—'}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      SOURCE_STYLES[s.source] || 'bg-slate-100 text-slate-600'
                    )}>
                      {s.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.tags || []).length > 0 ? (
                        (s.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                      {(s.tags || []).length > 3 && (
                        <span className="text-[9px] text-slate-400 font-medium">+{s.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    )}>
                      {s.is_active ? (
                        <><CheckCircle className="w-3 h-3" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Inactive</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(s.subscribed_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggle(s.id, !s.is_active)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          s.is_active
                            ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                            : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                        )}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {s.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setEditingId(s.id); setIsAdding(false); handleEdit(s); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    No subscribers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
