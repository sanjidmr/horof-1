'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Ticket, Search, CheckCircle, XCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CouponManager({ initialCoupons }: { initialCoupons: any[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: 0,
    min_order: 0,
    max_discount: 0,
    max_uses: 0,
    per_user_limit: 1,
    starts_at: '',
    expires_at: '',
    first_order_only: false,
    applicable_products: '',
    applicable_categories: '',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons;
    const q = searchQuery.toLowerCase();
    return coupons.filter(
      (c: any) =>
        c.code.toLowerCase().includes(q) ||
        (c.type || '').toLowerCase().includes(q) ||
        String(c.value).includes(q)
    );
  }, [coupons, searchQuery]);

  const handleEdit = (cpn: any) => {
    setEditingId(cpn.id);
    setFormData({
      code: cpn.code,
      type: cpn.type || 'percent',
      value: Number(cpn.value),
      min_order: Number(cpn.min_order || 0),
      max_discount: cpn.max_discount != null ? Number(cpn.max_discount) : 0,
      max_uses: cpn.max_uses != null ? Number(cpn.max_uses) : 0,
      per_user_limit: Number(cpn.per_user_limit || 1),
      starts_at: cpn.starts_at ? new Date(cpn.starts_at).toISOString().split('T')[0] : '',
      expires_at: cpn.expires_at ? new Date(cpn.expires_at).toISOString().split('T')[0] : '',
      first_order_only: !!cpn.first_order_only,
      applicable_products: Array.isArray(cpn.applicable_products) ? cpn.applicable_products.join(', ') : '',
      applicable_categories: Array.isArray(cpn.applicable_categories) ? cpn.applicable_categories.join(', ') : '',
      is_active: cpn.is_active,
    });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      code: '',
      type: 'percent',
      value: 0,
      min_order: 0,
      max_discount: 0,
      max_uses: 0,
      per_user_limit: 1,
      starts_at: '',
      expires_at: '',
      first_order_only: false,
      applicable_products: '',
      applicable_categories: '',
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.code || !formData.value) {
      toast.error('Code and value are required');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave: any = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: formData.value,
        min_order: formData.min_order || 0,
        max_discount: formData.max_discount > 0 ? formData.max_discount : null,
        max_uses: formData.max_uses > 0 ? formData.max_uses : null,
        per_user_limit: formData.per_user_limit || 1,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        first_order_only: formData.first_order_only,
        applicable_products: formData.applicable_products
          ? formData.applicable_products.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        applicable_categories: formData.applicable_categories
          ? formData.applicable_categories.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from('coupons')
          .update(dataToSave)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Coupon updated');
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([dataToSave]);
        if (error) {
          if (error.code === '23505') {
            toast.error('A coupon with this code already exists');
            return;
          }
          throw error;
        }
        toast.success('Coupon created');
      }

      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      setCoupons(data || []);
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons(coupons.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete coupon');
    }
  };

  const toggleActive = async (cpn: any) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !cpn.is_active })
      .eq('id', cpn.id);
    if (error) {
      toast.error('Failed to toggle status');
      return;
    }
    setCoupons(coupons.map((c: any) => (c.id === cpn.id ? { ...c, is_active: !cpn.is_active } : c)));
    toast.success(cpn.is_active ? 'Coupon deactivated' : 'Coupon activated');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          placeholder="Search by code or value..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Coupons ({filteredCoupons.length})</CardTitle>
              <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
                <Plus size={16} className="mr-2" /> Create Coupon
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredCoupons.length === 0 && (
                  <div className="p-10 text-center text-slate-400">
                    {searchQuery ? 'No coupons match your search.' : 'No coupons found.'}
                  </div>
                )}
                {filteredCoupons.map((cpn: any) => (
                  <div key={cpn.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                        <Ticket size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{cpn.code}</span>
                          <button onClick={() => copyCode(cpn.code)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            {cpn.type === 'percent' ? `${cpn.value}% OFF` : `৳${Number(cpn.value).toLocaleString()} OFF`}
                          </span>
                          {cpn.min_order > 0 && <span> · Min: ৳{Number(cpn.min_order).toLocaleString()}</span>}
                          {cpn.expires_at && <span> · Until {formatDate(cpn.expires_at)}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400">
                            Used: {cpn.used_count || 0}{cpn.max_uses ? `/${cpn.max_uses}` : ''}
                          </span>
                          {cpn.first_order_only && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">First Order</span>
                          )}
                          {cpn.per_user_limit > 1 && (
                            <span className="text-[10px] text-slate-400">Limit: {cpn.per_user_limit}/user</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(cpn)}
                        className="flex items-center gap-1"
                      >
                        {cpn.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cpn)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cpn.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <div>
          {(isAdding || editingId) ? (
            <Card className="border-none shadow-sm sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg font-bold">{editingId ? 'Edit Coupon' : 'New Coupon'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>Coupon Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER25"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as 'percent' | 'fixed' })}
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (BDT)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.value}
                      onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                {formData.type === 'percent' && (
                  <div className="space-y-2">
                    <Label>Max Discount Amount (BDT) <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.max_discount}
                      onChange={e => setFormData({ ...formData, max_discount: parseFloat(e.target.value) || 0 })}
                      placeholder="Leave empty for no limit"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Min Order Amount (BDT)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.min_order}
                    onChange={e => setFormData({ ...formData, min_order: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.starts_at}
                      onChange={e => setFormData({ ...formData, starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expires_at}
                      onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses <span className="text-slate-400 font-normal">(0 = unlimited)</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.max_uses}
                      onChange={e => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Per User Limit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.per_user_limit}
                      onChange={e => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="first_order_only"
                    checked={formData.first_order_only}
                    onChange={e => setFormData({ ...formData, first_order_only: e.target.checked })}
                    className="accent-[#1B4332]"
                  />
                  <Label htmlFor="first_order_only">First Order Only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cpn_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="accent-[#1B4332]"
                  />
                  <Label htmlFor="cpn_active">Active</Label>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                    <Save size={16} className="mr-2" />
                    {isLoading ? 'Saving...' : editingId ? 'Update Coupon' : 'Create Coupon'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-slate-50 border border-dashed rounded-3xl p-10 text-center space-y-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Plus size={24} />
              </div>
              <p className="text-sm text-slate-500">Select a coupon to edit or click "Create Coupon" to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
