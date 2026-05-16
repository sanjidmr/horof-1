'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CouponManager({ initialCoupons }: { initialCoupons: any[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ 
    code: '', 
    discount_type: 'percentage', 
    discount_value: 0, 
    min_purchase: 0,
    expires_at: '',
    is_active: true
  });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleEdit = (cpn: any) => {
    setEditingId(cpn.id);
    setFormData({ 
      code: cpn.code, 
      discount_type: cpn.discount_type, 
      discount_value: cpn.discount_value, 
      min_purchase: cpn.min_purchase || 0,
      expires_at: cpn.expires_at ? new Date(cpn.expires_at).toISOString().split('T')[0] : '',
      is_active: cpn.is_active
    });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ 
      code: '', 
      discount_type: 'percentage', 
      discount_value: 0, 
      min_purchase: 0,
      expires_at: '',
      is_active: true
    });
  };

  const handleSave = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error('Code and value are required');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
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
        if (error) throw error;
        toast.success('Coupon added');
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Coupons</CardTitle>
            <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
              <Plus size={16} className="mr-2" /> Create Coupon
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {coupons.map((cpn) => (
                <div key={cpn.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{cpn.code}</div>
                      <div className="text-xs text-slate-500">
                        {cpn.discount_type === 'percentage' ? `${cpn.discount_value}% OFF` : `BDT ${cpn.discount_value} OFF`}
                        {cpn.min_purchase > 0 && ` · Min. Spend: ${cpn.min_purchase}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cpn.is_active ? 'success' : 'secondary'} className="text-[10px]">
                      {cpn.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cpn)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cpn.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && !isAdding && (
                <div className="p-10 text-center text-slate-400">No coupons found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {(isAdding || editingId) ? (
          <Card className="border-none shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-bold">{editingId ? 'Edit Coupon' : 'New Coupon'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER25" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-lg border bg-white text-sm"
                    value={formData.discount_type}
                    onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (BDT)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input type="number" value={formData.discount_value} onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min. Purchase Amount</Label>
                <Input type="number" value={formData.min_purchase} onChange={e => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expires_at} onChange={e => setFormData({ ...formData, expires_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="cpn_active"
                  checked={formData.is_active} 
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })} 
                />
                <Label htmlFor="cpn_active">Active</Label>
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                  <Save size={16} className="mr-2" />
                  {isLoading ? 'Saving...' : 'Save Coupon'}
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
  );
}
