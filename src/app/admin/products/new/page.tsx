'use client';

import React, { useEffect, useState } from 'react';
import { Save, ArrowLeft, UploadCloud, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AddProductPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_price: '',
    stock: '0',
    category_id: '',
    is_active: true,
    is_best_selling: false,
    is_new_arrival: false,
    is_product_of_the_day: false,
    specification: '',
    perfect_for: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const imageUrls = await uploadImages();
      
      // If this is set as Product of the Day, unset any existing ones
      if (formData.is_product_of_the_day) {
        await supabase
          .from('products')
          .update({ is_product_of_the_day: false })
          .eq('is_product_of_the_day', true);
      }

      const payload = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: formData.description,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        stock: parseInt(formData.stock),
        category_id: formData.category_id || null,
        images: imageUrls,
        is_active: formData.is_active,
        is_best_selling: formData.is_best_selling,
        is_new_arrival: formData.is_new_arrival,
        is_product_of_the_day: formData.is_product_of_the_day,
        specification: formData.specification,
        perfect_for: formData.perfect_for
      };

      const { error } = await supabase.from('products').insert([payload]);
      if (error) throw error;
      
      toast.success('Product created successfully');
      router.push('/admin/products');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0">
          <Link href="/admin/products"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Add New Product</h1>
          <p className="text-slate-500">Create a new item in your catalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (General)</label>
              <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Specification (Technical Specs)</label>
              <textarea rows={4} value={formData.specification} onChange={e => setFormData({...formData, specification: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" placeholder="e.g. Material: Walnut Wood, Weight: 2kg..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perfect For (Who it's for)</label>
              <textarea rows={4} value={formData.perfect_for} onChange={e => setFormData({...formData, perfect_for: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" placeholder="e.g. Ideal for living room decor, minimalist homes..." />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Media</h2>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">Click or drag images here to upload</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 5MB</p>
            </div>
            
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {images.map((file, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Pricing & Inventory</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (৳)</label>
              <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compare at Price (Optional)</label>
              <input type="number" step="0.01" value={formData.compare_price} onChange={e => setFormData({...formData, compare_price: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
              <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Organization & Visibility</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]">
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="accent-[#1B4332] h-4 w-4" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active (Visible in Shop)</label>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Home Page Sections</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isBestSelling" checked={formData.is_best_selling} onChange={e => setFormData({...formData, is_best_selling: e.target.checked})} className="accent-[#1B4332] h-4 w-4" />
                    <label htmlFor="isBestSelling" className="text-sm text-slate-700">Best Selling</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isNewArrival" checked={formData.is_new_arrival} onChange={e => setFormData({...formData, is_new_arrival: e.target.checked})} className="accent-[#1B4332] h-4 w-4" />
                    <label htmlFor="isNewArrival" className="text-sm text-slate-700">New Arrival</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isProductDay" checked={formData.is_product_of_the_day} onChange={e => setFormData({...formData, is_product_of_the_day: e.target.checked})} className="accent-[#1B4332] h-4 w-4" />
                    <label htmlFor="isProductDay" className="text-sm text-slate-700">Product of the Day (Limit 1)</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full h-12 bg-[#1B4332] text-white hover:bg-[#2D6A4F] text-sm font-bold shadow-lg shadow-[#1B4332]/20">
            {saving ? 'Creating Product...' : <><Save className="h-4 w-4 mr-2" /> Save Product</>}
          </Button>
        </div>

      </form>
    </div>
  );
}
