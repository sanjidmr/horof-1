'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', slug: '', is_active: true });
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Subcategory state
  const [showSubModal, setShowSubModal] = useState(false);
  const [subParentId, setSubParentId] = useState<string>('');
  const [subFormData, setSubFormData] = useState({ id: '', category_id: '', name: '', slug: '', sort_order: 0, is_active: true });
  const [subcategories, setSubcategories] = useState<Record<string, any[]>>({});
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({});

  const supabase = createSupabaseBrowserClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*, products(count)');
    if (error) {
      toast.error('Failed to load categories');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }, [supabase]);

  const fetchSubcategories = useCallback(async (categoryId: string) => {
    setSubLoading(prev => ({ ...prev, [categoryId]: true }));
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true });
    if (!error) {
      setSubcategories(prev => ({ ...prev, [categoryId]: data || [] }));
    }
    setSubLoading(prev => ({ ...prev, [categoryId]: false }));
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (catId: string) => {
    if (expandedCat === catId) {
      setExpandedCat(null);
    } else {
      setExpandedCat(catId);
      if (!subcategories[catId]) {
        fetchSubcategories(catId);
      }
    }
  };

  const handleOpenModal = (category: any = null) => {
    if (category) {
      setFormData({ id: category.id, name: category.name, slug: category.slug, is_active: category.is_active });
    } else {
      setFormData({ id: '', name: '', slug: '', is_active: true });
    }
    setImageFile(null);
    setShowModal(true);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('category-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const payload: any = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        is_active: formData.is_active,
      };

      if (imageUrl) payload.image_url = imageUrl;

      if (formData.id) {
        const { error } = await supabase.from('categories').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
        toast.success('Category created');
      }

      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || 'Error saving category');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? All subcategories will also be deleted.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchCategories();
    }
  };

  const toggleStatus = async (category: any) => {
    const { error } = await supabase.from('categories').update({ is_active: !category.is_active }).eq('id', category.id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(category.is_active ? 'Category deactivated' : 'Category activated');
      fetchCategories();
    }
  };

  // Subcategory handlers
  const handleOpenSubModal = (categoryId: string, sub: any = null) => {
    setSubParentId(categoryId);
    if (sub) {
      setSubFormData({
        id: sub.id,
        category_id: sub.category_id,
        name: sub.name,
        slug: sub.slug,
        sort_order: sub.sort_order,
        is_active: sub.is_active,
      });
    } else {
      const existing = subcategories[categoryId] || [];
      setSubFormData({
        id: '',
        category_id: categoryId,
        name: '',
        slug: '',
        sort_order: existing.length,
        is_active: true,
      });
    }
    setShowSubModal(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormData.name.trim() || !subFormData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    try {
      const payload: any = {
        category_id: subFormData.category_id,
        name: subFormData.name.trim(),
        slug: subFormData.slug.trim().toLowerCase(),
        sort_order: subFormData.sort_order,
        is_active: subFormData.is_active,
      };

      if (subFormData.id) {
        const { error } = await supabase.from('subcategories').update(payload).eq('id', subFormData.id);
        if (error) throw error;
        toast.success('Subcategory updated');
      } else {
        const { error } = await supabase.from('subcategories').insert([payload]);
        if (error) throw error;
        toast.success('Subcategory created');
      }

      setShowSubModal(false);
      fetchSubcategories(subFormData.category_id);
    } catch (error: any) {
      toast.error(error.message || 'Error saving subcategory');
    }
  };

  const handleDeleteSubcategory = async (id: string, categoryId: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const { error } = await supabase.from('subcategories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete subcategory');
    } else {
      toast.success('Subcategory deleted');
      fetchSubcategories(categoryId);
    }
  };

  const handleReorder = async (categoryId: string, subId: string, direction: 'up' | 'down') => {
    const subs = [...(subcategories[categoryId] || [])];
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= subs.length) return;
    [subs[idx], subs[swapIdx]] = [subs[swapIdx], subs[idx]];
    const updated = subs.map((s, i) => ({ ...s, sort_order: i }));
    setSubcategories(prev => ({ ...prev, [categoryId]: updated }));
    for (const s of updated) {
      await supabase.from('subcategories').update({ sort_order: s.sort_order }).eq('id', s.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500">Manage your product categories and subcategories</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-xs font-bold text-slate-500 uppercase">
              <th className="px-6 py-4"></th>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">No categories found.</td></tr>
            ) : (
              categories.map((cat) => (
                <React.Fragment key={cat.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 w-10">
                      <button
                        onClick={() => toggleExpand(cat.id)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        {expandedCat === cat.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-10 w-10 rounded bg-slate-100 overflow-hidden">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">No img</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{cat.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{cat.slug}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{cat.products?.[0]?.count || 0}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleStatus(cat)} className="flex items-center gap-1">
                        {cat.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E6F0EB] text-[#1B4332] text-xs font-bold"><CheckCircle className="h-3 w-3" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-bold"><XCircle className="h-3 w-3" /> Inactive</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(cat)} className="p-2 text-slate-400 hover:text-[#1B4332] bg-white border border-slate-200 rounded hover:bg-slate-50">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded hover:bg-slate-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedCat === cat.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-slate-50/50">
                        <div className="ml-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-700">Subcategories</h3>
                            <Button
                              size="sm"
                              onClick={() => handleOpenSubModal(cat.id)}
                              className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] h-8 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Subcategory
                            </Button>
                          </div>
                          {subLoading[cat.id] ? (
                            <p className="text-sm text-slate-400">Loading subcategories...</p>
                          ) : !subcategories[cat.id] || subcategories[cat.id].length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No subcategories yet.</p>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                              {subcategories[cat.id].map((sub, idx) => (
                                <div key={sub.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                                  <div className="flex items-center gap-3">
                                    <div className="text-slate-300 cursor-grab"><GripVertical size={14} /></div>
                                    <div>
                                      <span className="text-sm font-medium text-slate-800">{sub.name}</span>
                                      <span className="text-xs text-slate-400 ml-2 font-mono">{sub.slug}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${sub.is_active ? 'bg-[#E6F0EB] text-[#1B4332]' : 'bg-slate-100 text-slate-500'}`}>
                                      {sub.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => handleReorder(cat.id, sub.id, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                                        title="Move up"
                                      >▲</button>
                                      <button
                                        onClick={() => handleReorder(cat.id, sub.id, 'down')}
                                        disabled={idx === subcategories[cat.id].length - 1}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                                        title="Move down"
                                      >▼</button>
                                    </div>
                                    <button onClick={() => handleOpenSubModal(cat.id, sub)} className="p-1.5 text-slate-400 hover:text-[#1B4332]">
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteSubcategory(sub.id, cat.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{formData.id ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-lg p-2" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="accent-[#1B4332]" />
                <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50">Cancel</Button>
                <Button type="submit" disabled={uploading} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
                  {uploading ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{subFormData.id ? 'Edit Subcategory' : 'New Subcategory'}</h2>
            <form onSubmit={handleSaveSubcategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" value={subFormData.name}
                  onChange={e => setSubFormData({ ...subFormData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input required type="text" value={subFormData.slug}
                  onChange={e => setSubFormData({ ...subFormData, slug: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                <input type="number" value={subFormData.sort_order || ''}
                  onChange={e => setSubFormData({ ...subFormData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="subIsActive" checked={subFormData.is_active}
                  onChange={e => setSubFormData({ ...subFormData, is_active: e.target.checked })}
                  className="accent-[#1B4332]" />
                <label htmlFor="subIsActive" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowSubModal(false)} className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50">Cancel</Button>
                <Button type="submit" className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">Save Subcategory</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
