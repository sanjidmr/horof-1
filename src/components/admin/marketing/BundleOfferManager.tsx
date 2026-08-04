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
import type { BundleOfferType } from '@/types/database';

type BundleOffer = {
  id: string;
  name: string;
  description: string | null;
  type: BundleOfferType;
  buy_product_id: string | null;
  buy_quantity: number;
  get_product_id: string | null;
  get_quantity: number;
  get_discount_percent: number;
  fixed_price_products: string[];
  fixed_price_total: number | null;
  bundle_discount_percent: number | null;
  combination_products: string[];
  combination_discount_amount: number | null;
  applicable_products: string[];
  applicable_categories: string[];
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  per_user_limit: number;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const BUNDLE_TYPES: { value: BundleOfferType; label: string }[] = [
  { value: 'percent_discount', label: 'Percent Discount (All)' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
  { value: 'fixed_price', label: 'Fixed Price Bundle' },
  { value: 'product_combination', label: 'Product Combination' },
];

export function BundleOfferManager({ initial }: { initial: BundleOffer[] }) {
  const [offers, setOffers] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percent_discount' as BundleOfferType,
    buy_product_id: '',
    buy_quantity: 1,
    get_product_id: '',
    get_quantity: 1,
    get_discount_percent: 100,
    fixed_price_products: '',
    fixed_price_total: 0,
    bundle_discount_percent: 10,
    combination_products: '',
    combination_discount_amount: 0,
    applicable_products: '',
    applicable_categories: '',
    min_subtotal: 0,
    max_uses: 0,
    per_user_limit: 1,
    priority: 0,
    is_active: true,
    starts_at: '',
    expires_at: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q)
    );
  }, [offers, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', type: 'percent_discount',
      buy_product_id: '', buy_quantity: 1, get_product_id: '', get_quantity: 1, get_discount_percent: 100,
      fixed_price_products: '', fixed_price_total: 0,
      bundle_discount_percent: 10, combination_products: '', combination_discount_amount: 0,
      applicable_products: '', applicable_categories: '',
      min_subtotal: 0, max_uses: 0, per_user_limit: 1, priority: 0, is_active: true,
      starts_at: '', expires_at: '',
    });
  };

  const handleEdit = (o: BundleOffer) => {
    setEditingId(o.id);
    setFormData({
      name: o.name,
      description: o.description || '',
      type: o.type,
      buy_product_id: o.buy_product_id || '',
      buy_quantity: o.buy_quantity,
      get_product_id: o.get_product_id || '',
      get_quantity: o.get_quantity,
      get_discount_percent: o.get_discount_percent,
      fixed_price_products: o.fixed_price_products.join(', '),
      fixed_price_total: o.fixed_price_total || 0,
      bundle_discount_percent: o.bundle_discount_percent || 0,
      combination_products: o.combination_products.join(', '),
      combination_discount_amount: o.combination_discount_amount || 0,
      applicable_products: o.applicable_products.join(', '),
      applicable_categories: o.applicable_categories.join(', '),
      min_subtotal: o.min_subtotal,
      max_uses: o.max_uses || 0,
      per_user_limit: o.per_user_limit,
      priority: o.priority,
      is_active: o.is_active,
      starts_at: o.starts_at ? o.starts_at.split('T')[0] : '',
      expires_at: o.expires_at ? o.expires_at.split('T')[0] : '',
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload: any = {
      name: formData.name,
      description: formData.description || null,
      type: formData.type,
      buy_product_id: formData.buy_product_id || null,
      buy_quantity: formData.buy_quantity,
      get_product_id: formData.get_product_id || null,
      get_quantity: formData.get_quantity,
      get_discount_percent: formData.get_discount_percent,
      fixed_price_products: formData.fixed_price_products.split(',').map((s) => s.trim()).filter(Boolean),
      fixed_price_total: formData.fixed_price_total || null,
      bundle_discount_percent: formData.bundle_discount_percent || null,
      combination_products: formData.combination_products.split(',').map((s) => s.trim()).filter(Boolean),
      combination_discount_amount: formData.combination_discount_amount || null,
      applicable_products: formData.applicable_products.split(',').map((s) => s.trim()).filter(Boolean),
      applicable_categories: formData.applicable_categories.split(',').map((s) => s.trim()).filter(Boolean),
      min_subtotal: formData.min_subtotal,
      max_uses: formData.max_uses || null,
      per_user_limit: formData.per_user_limit,
      priority: formData.priority,
      is_active: formData.is_active,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
    };

    if (editingId) payload.id = editingId;

    let query;
    if (editingId) {
      query = supabase.from('bundle_offers').update(payload).eq('id', editingId);
    } else {
      query = supabase.from('bundle_offers').insert(payload).select('*').single();
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
      .from('bundle_offers')
      .update({ is_active: active })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, is_active: active } : o)));
    toast.success(active ? 'Offer activated' : 'Offer deactivated');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('bundle_offers').delete().eq('id', id);
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
          <Plus className="w-4 h-4 mr-2" /> New Bundle Offer
        </Button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'New'} Bundle Offer</h3>
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
              <Label>Type</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as BundleOfferType }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all"
              >
                {BUNDLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          {formData.type === 'buy_x_get_y' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-1.5">
                <Label>Buy Product ID</Label>
                <Input value={formData.buy_product_id} onChange={(e) => setFormData((p) => ({ ...p, buy_product_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Buy Qty</Label>
                <Input type="number" min={1} value={formData.buy_quantity || ''} onChange={(e) => setFormData((p) => ({ ...p, buy_quantity: Number(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Get Product ID</Label>
                <Input value={formData.get_product_id} onChange={(e) => setFormData((p) => ({ ...p, get_product_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Get Qty</Label>
                <Input type="number" min={1} value={formData.get_quantity || ''} onChange={(e) => setFormData((p) => ({ ...p, get_quantity: Number(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Get Discount %</Label>
                <Input type="number" min={0} max={100} value={formData.get_discount_percent || ''} onChange={(e) => setFormData((p) => ({ ...p, get_discount_percent: Number(e.target.value) }))} />
              </div>
            </div>
          )}

          {formData.type === 'fixed_price' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-1.5">
                <Label>Product IDs (comma separated)</Label>
                <Input value={formData.fixed_price_products} onChange={(e) => setFormData((p) => ({ ...p, fixed_price_products: e.target.value }))} placeholder="uuid1, uuid2, uuid3" />
              </div>
              <div className="space-y-1.5">
                <Label>Fixed Bundle Price (৳)</Label>
                <Input type="number" min={0} value={formData.fixed_price_total || ''} onChange={(e) => setFormData((p) => ({ ...p, fixed_price_total: Number(e.target.value) }))} />
              </div>
            </div>
          )}

          {formData.type === 'percent_discount' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min={0} max={100} value={formData.bundle_discount_percent || ''} onChange={(e) => setFormData((p) => ({ ...p, bundle_discount_percent: Number(e.target.value) }))} />
              </div>
            </div>
          )}

          {formData.type === 'product_combination' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-1.5">
                <Label>Combination Product IDs (comma separated)</Label>
                <Input value={formData.combination_products} onChange={(e) => setFormData((p) => ({ ...p, combination_products: e.target.value }))} placeholder="uuid1, uuid2" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Amount (৳)</Label>
                <Input type="number" min={0} value={formData.combination_discount_amount || ''} onChange={(e) => setFormData((p) => ({ ...p, combination_discount_amount: Number(e.target.value) }))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Min Subtotal</Label>
              <Input type="number" min={0} value={formData.min_subtotal || ''} onChange={(e) => setFormData((p) => ({ ...p, min_subtotal: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Uses (0 = unlimited)</Label>
              <Input type="number" min={0} value={formData.max_uses || ''} onChange={(e) => setFormData((p) => ({ ...p, max_uses: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Per User Limit</Label>
              <Input type="number" min={1} value={formData.per_user_limit || ''} onChange={(e) => setFormData((p) => ({ ...p, per_user_limit: Number(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" value={formData.priority || ''} onChange={(e) => setFormData((p) => ({ ...p, priority: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Applicable Products (comma separated IDs)</Label>
              <Input value={formData.applicable_products} onChange={(e) => setFormData((p) => ({ ...p, applicable_products: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Applicable Categories (comma separated IDs)</Label>
              <Input value={formData.applicable_categories} onChange={(e) => setFormData((p) => ({ ...p, applicable_categories: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Starts At</Label>
              <Input type="date" value={formData.starts_at} onChange={(e) => setFormData((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expires At</Label>
              <Input type="date" value={formData.expires_at} onChange={(e) => setFormData((p) => ({ ...p, expires_at: e.target.value }))} />
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
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Discount</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Uses</th>
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
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {o.type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#1a4731]">
                    {o.type === 'percent_discount' && o.bundle_discount_percent ? `${o.bundle_discount_percent}% off` : ''}
                    {o.type === 'buy_x_get_y' && `Buy ${o.buy_quantity} Get ${o.get_quantity}`}
                    {o.type === 'fixed_price' && o.fixed_price_total ? `৳${o.fixed_price_total}` : ''}
                    {o.type === 'product_combination' && o.combination_discount_amount ? `৳${o.combination_discount_amount} off` : ''}
                  </td>
                  <td className="px-4 py-3">{o.priority}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {o.used_count}{o.max_uses ? ` / ${o.max_uses}` : ''}
                  </td>
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
                    No bundle offers found
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
