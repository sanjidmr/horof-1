'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CategoryManager({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', order: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, slug: cat.slug, order: cat.order });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', slug: '', order: 0 });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({ ...formData })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ ...formData }]);
        if (error) throw error;
        toast.success('Category added');
      }

      // Refresh list
      const { data } = await supabase.from('categories').select('*').order('order');
      setCategories(data || []);
      handleCancel();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* List */}
      <div className="lg:col-span-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Categories</CardTitle>
            <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding || !!editingId}>
              <Plus size={16} className="mr-2" /> Add New
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-slate-300"><GripVertical size={16} /></div>
                    <div>
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{cat.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Order: {cat.order}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cat.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && !isAdding && (
                <div className="p-10 text-center text-slate-400">No categories found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <div>
        {(isAdding || editingId) ? (
          <Card className="border-none shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-bold">{editingId ? 'Edit Category' : 'New Category'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') });
                  }} 
                  placeholder="e.g. Traditional Wear"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input 
                  value={formData.slug} 
                  onChange={e => setFormData({ ...formData, slug: e.target.value })} 
                  placeholder="traditional-wear"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input 
                  type="number"
                  value={formData.order || ''} 
                  onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} 
                />
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                  <Save size={16} className="mr-2" />
                  {isLoading ? 'Saving...' : 'Save Category'}
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
            <p className="text-sm text-slate-500">Select a category to edit or click "Add New" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
