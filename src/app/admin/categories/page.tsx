'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', slug: '', is_active: true });
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*, products(count)');
    if (error) {
      toast.error('Failed to load categories');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
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

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('category-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrl = undefined;
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
    if (!confirm('Are you sure you want to delete this category?')) return;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500">Manage your product categories</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-xs font-bold text-slate-500 uppercase">
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
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No categories found.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
                <Button className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]" type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
                  {uploading ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
