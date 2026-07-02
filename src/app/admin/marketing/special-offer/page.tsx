'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { UploadCloud, Save, Tag, Package, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function SpecialOfferPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [data, setData] = useState({
    image_url: '',
    title: '',
    discount_percent: '',
    product_id: ''
  });
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchData() {
      // Fetch existing special offer
      const { data: offerData } = await supabase.from('special_offers').select('*').limit(1).maybeSingle();
      if (offerData) {
        setData({
          image_url: offerData.image_url,
          title: offerData.title,
          discount_percent: offerData.discount_percent.toString(),
          product_id: offerData.product_id || ''
        });
      }

      // Fetch products for dropdown
      const { data: prodData } = await supabase.from('products').select('id, name').eq('is_active', true);
      if (prodData) setProducts(prodData);
      
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const handleUpload = async (file: File) => {
    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `offer-${Math.random()}.${fileExt}`;
      const filePath = `marketing/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(filePath);
      setData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        image_url: data.image_url,
        discount_percent: parseInt(data.discount_percent),
        product_id: data.product_id || null
      };

      // We only ever want ONE special offer record for now
      const { data: existing } = await supabase.from('special_offers').select('id').limit(1).maybeSingle();
      
      let error;
      if (existing) {
        ({ error } = await supabase.from('special_offers').update(payload).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('special_offers').insert([payload]));
      }

      if (error) throw error;
      toast.success('Special Offer updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Special Offer data...</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Special Offer Management</h1>
        <p className="text-slate-500">Configure the highlighted discount banner on the homepage.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Offer Banner Image</label>
            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group bg-slate-50">
              {data.image_url ? (
                <img src={data.image_url} alt="Special Offer" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
                  <span className="text-sm">Click to upload banner</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="bg-white text-slate-900 px-6 py-2 rounded-full text-sm font-bold cursor-pointer hover:scale-105 transition-transform">
                  Change Image
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Tag className="h-3 w-3" /> Offer Heading
              </label>
              <input 
                required 
                type="text" 
                value={data.title} 
                onChange={e => setData({...data, title: e.target.value})} 
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none" 
                placeholder="e.g. Handmade Wood Vases"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Discount Percentage (%)</label>
              <div className="relative">
                <input 
                  required 
                  type="number" 
                  value={data.discount_percent} 
                  onChange={e => setData({...data, discount_percent: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none font-bold text-forest" 
                  placeholder="e.g. 25"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">% OFF</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Package className="h-3 w-3" /> Link to Product
              </label>
              <select 
                value={data.product_id} 
                onChange={e => setData({...data, product_id: e.target.value})} 
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none"
              >
                <option value="">Select a product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 flex justify-end">
          <Button 
            disabled={saving || !data.image_url} 
            className="bg-forest hover:bg-forest/90 text-gray-800 rounded-2xl px-10 h-14 font-bold shadow-xl shadow-forest/20 flex items-center gap-3"
          >
            {saving ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : 'Save Special Offer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
