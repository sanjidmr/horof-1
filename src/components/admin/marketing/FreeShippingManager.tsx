'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Search, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type FreeShippingOffer = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  min_order_amount: number;
  coupon_code: string | null;
  applicable_products: string[];
  applicable_categories: string[];
  applicable_districts: string[];
  exclude_districts: string[];
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  created_at: string;
};

export function FreeShippingManager({ initial }: { initial: FreeShippingOffer[] }) {
  const [offers, setOffers] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    min_order_amount: 0,
    coupon_code: '',
    applicable_products: '',
    applicable_categories: '',
    applicable_districts: '',
    exclude_districts: '',
    starts_at: '',
    expires_at: '',
    priority: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q) ||
        (o.coupon_code || '').toLowerCase().includes(q)
    );
  }, [offers, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', is_active: true, min_order_amount: 0,
      coupon_code: '', applicable_products: '', applicable_categories: '',
      applicable_districts: '', exclude_districts: '',
      starts_at: '', expires_at: '', priority: 0,
    });
  };

  const handleEdit = (o: FreeShippingOffer) => {
    setEditingId(o.id);
    setFormData({
      name: o.name,
      description: o.description || '',
      is_active: o.is_active,
      min_order_amount: o.min_order_amount,
      coupon_code: o.coupon_code || '',
      applicable_products: o.applicable_products.join(', '),
      applicable_categories: o.applicable_categories.join(', '),
      applicable_districts: o.applicable_districts.join(', '),
      exclude_districts: o.exclude_districts.join(', '),
      starts_at: o.starts_at ? o.starts_at.split('T')[0] : '',
      expires_at: o.expires_at ? o.expires_at.split('T')[0] : '',
      priority: o.priority,
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload: any = {
      name: formData.name,
      description: formData.description || null,
      is_active: formData.is_active,
      min_order_amount: formData.min_order_amount,
      coupon_code: formData.coupon_code || null,
      applicable_products: formData.applicable_products.split(',').map((s) => s.trim()).filter(Boolean),
      applicable_categories: formData.applicable_categories.split(',').map((s) => s.trim()).filter(Boolean),
      applicable_districts: formData.applicable_districts.split(',').map((s) => s.trim()).filter(Boolean),
      exclude_districts: formData.exclude_districts.split(',').map((s) => s.trim()).filter(Boolean),
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      priority: formData.priority,
    };

    if (editingId) payload.id = editingId;

    let query;
    if (editingId) {
      query = supabase.from('free_shipping_offers').update(payload).eq('id', editingId);
    } else {
      query = supabase.from('free_shipping_offers').insert(payload).select('*').single();
    }

    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? 'Offer updated' : 'Offer created');
      if (data) {
        setOffers((prev) => {
          if (editingId) return prev.map((o) => (o.id === editingId ? data : o));
          return [data, ...prev];
        });
      }
      setEditingId(null);
      setIsAdding(false);
      resetForm();
    }
    setIsLoading(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('free_shipping_offers')
      .update({ is_active: active })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, is_active: active } : o)));
    toast.success(active ? 'Offer activated' : 'Offer deactivated');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('free_shipping_offers').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setOffers((prev) => prev.filter((o) => o.id !== id));
    toast.success('Offer deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-2" /> New Free Shipping Offer
        </Button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'New'} Free Shipping Offer</h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Offer Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Min Order Amount</Label>
              <Input type="number" min={0} value={formData.min_order_amount || ''} onChange={(e) => setFormData((p) => ({ ...p, min_order_amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Coupon Code (optional)</Label>
              <Input value={formData.coupon_code} onChange={(e) => setFormData((p) => ({ ...p, coupon_code: e.target.value }))} placeholder="Leave empty for automatic" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Applicable Districts (comma separated)</Label>
              <Input value={formData.applicable_districts} onChange={(e) => setFormData((p) => ({ ...p, applicable_districts: e.target.value }))} placeholder="Mymensingh, Dhaka" />
            </div>
            <div className="space-y-1.5">
              <Label>Exclude Districts (comma separated)</Label>
              <Input value={formData.exclude_districts} onChange={(e) => setFormData((p) => ({ ...p, exclude_districts: e.target.value }))} placeholder="Leave empty to include all" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Applicable Products (comma separated IDs)</Label>
              <Input value={formData.applicable_products} onChange={(e) => setFormData((p) => ({ ...p, applicable_products: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Applicable Categories (comma separated IDs)</Label>
              <Input value={formData.applicable_categories} onChange={(e) => setFormData((p) => ({ ...p, applicable_categories: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Starts At</Label>
              <Input type="date" value={formData.starts_at} onChange={(e) => setFormData((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires At</Label>
              <Input type="date" value={formData.expires_at} onChange={(e) => setFormData((p) => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" value={formData.priority || ''} onChange={(e) => setFormData((p) => ({ ...p, priority: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.name}>
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Create'} Offer
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Min Order</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Coupon</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Districts</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Dates</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{o.name}</div>
                    {o.description && <div className="text-xs text-slate-400 truncate max-w-[200px]">{o.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold">৳{o.min_order_amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {o.coupon_code ? (
                      <Badge variant="outline" className="text-xs font-mono">{o.coupon_code}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Automatic</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">
                    {o.applicable_districts.length > 0
                      ? o.applicable_districts.join(', ')
                      : 'All districts'}
                    {o.exclude_districts.length > 0 && (
                      <span className="text-red-400"> (excl: {o.exclude_districts.join(', ')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{o.priority}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(o.id, !o.is_active)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors',
                        o.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      )}
                    >
                      {o.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {o.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {o.starts_at ? new Date(o.starts_at).toLocaleDateString() : '—'}
                    {' → '}
                    {o.expires_at ? new Date(o.expires_at).toLocaleDateString() : '∞'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(o)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No free shipping offers found
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
