'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon } from 'lucide-react';

export function BrandManager({ initialBrands }: { initialBrands: any[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', logo_url: '', website: '' });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleEdit = (brand: any) => {
    setEditingId(brand.id);
    setFormData({ name: brand.name, logo_url: brand.logo_url || '', website: brand.website || '' });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', logo_url: '', website: '' });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('brands')
          .update({ ...formData })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Brand updated');
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([{ ...formData }]);
        if (error) throw error;
        toast.success('Brand added');
      }

      const { data } = await supabase.from('brands').select('*').order('name');
      setBrands(data || []);
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save brand');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;
      setBrands(brands.filter(b => b.id !== id));
      toast.success('Brand deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brand');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Brands</CardTitle>
            <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
              <Plus size={16} className="mr-2" /> Add Brand
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden border">
                      {brand.logo_url ? <img src={brand.logo_url} alt="" className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-slate-300" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{brand.name}</div>
                      {brand.website && <div className="text-xs text-slate-500">{brand.website}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(brand.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {brands.length === 0 && !isAdding && (
                <div className="p-10 text-center text-slate-400">No brands found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {(isAdding || editingId) ? (
          <Card className="border-none shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-bold">{editingId ? 'Edit Brand' : 'New Brand'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Nike" />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={formData.logo_url} onChange={e => setFormData({ ...formData, logo_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Website (Optional)</Label>
                <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                  <Save size={16} className="mr-2" />
                  {isLoading ? 'Saving...' : 'Save Brand'}
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
            <p className="text-sm text-slate-500">Select a brand to edit or click "Add Brand" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
