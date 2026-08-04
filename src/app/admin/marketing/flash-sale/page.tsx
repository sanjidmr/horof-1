'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { UploadCloud, Save, Trash2, Timer, Package, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shadcn/alert-dialog';

export default function FlashSalePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [data, setData] = useState({
    image_url: '',
    title: '',
    main_price: '',
    offer_price: '',
    end_time: '',
    product_id: ''
  });
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchData() {
      // Fetch existing flash sale
      const { data: flashData } = await supabase.from('flash_sales').select('*').limit(1).maybeSingle();
      if (flashData) {
        setExistingId(flashData.id);
        setData({
          image_url: flashData.image_url,
          title: flashData.title,
          main_price: flashData.main_price.toString(),
          offer_price: flashData.offer_price.toString(),
          end_time: flashData.end_time.split('.')[0], // Format for datetime-local
          product_id: flashData.product_id || ''
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
      const fileName = `flash-${Math.random()}.${fileExt}`;
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
        main_price: parseFloat(data.main_price),
        offer_price: parseFloat(data.offer_price),
        end_time: new Date(data.end_time).toISOString(),
        product_id: data.product_id || null
      };

      // We only ever want ONE flash sale record for now
      const { data: existing } = await supabase.from('flash_sales').select('id').limit(1).maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase.from('flash_sales').update(payload).eq('id', existing.id));
        setExistingId(existing.id);
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('flash_sales').insert([payload]).select('id').single();
        error = insertErr;
        if (inserted) setExistingId(inserted.id);
      }

      if (error) throw error;
      toast.success('Flash Sale updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('flash_sales').delete().eq('id', existingId);
      if (error) throw error;
      setExistingId(null);
      setData({
        image_url: '', title: '', main_price: '', offer_price: '', end_time: '', product_id: ''
      });
      toast.success('Flash Sale deleted');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Flash Sale data...</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Flash Sale Management</h1>
          <p className="text-slate-500">Configure the limited-time seasonal offer on the homepage.</p>
        </div>
        {existingId && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 rounded-2xl px-6 h-12 font-bold flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete Flash Sale
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Flash Sale?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the flash sale from the homepage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Campaign Image</label>
            <div className="relative aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group bg-slate-50">
              {data.image_url ? (
                <img src={data.image_url} alt="Flash Sale" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
                  <span className="text-sm">Click to upload image</span>
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
                <ImageIcon className="h-3 w-3" /> Campaign Title
              </label>
              <input
                required
                type="text"
                value={data.title}
                onChange={e => setData({...data, title: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none"
                placeholder="e.g. Winter Collection 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main Price</label>
                <input
                  required
                  type="number"
                  value={data.main_price}
                  onChange={e => setData({...data, main_price: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none"
                  placeholder="৳"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Offer Price</label>
                <input
                  required
                  type="number"
                  value={data.offer_price}
                  onChange={e => setData({...data, offer_price: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none font-bold text-forest"
                  placeholder="৳"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Timer className="h-3 w-3" /> Sale Ends At
              </label>
              <input
                required
                type="datetime-local"
                value={data.end_time}
                onChange={e => setData({...data, end_time: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none"
              />
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
              <p className="text-[10px] text-slate-400">This determines where users go when they click the Flash Sale card.</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 flex justify-end">
          <Button
            disabled={saving || !data.image_url}
            className="bg-forest hover:bg-forest/90 text-white rounded-2xl px-10 h-14 font-bold shadow-xl shadow-forest/20 flex items-center gap-3"
          >
            {saving ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Saving...' : existingId ? 'Save Flash Sale' : 'Publish Flash Sale'}
          </Button>
        </div>
      </form>
    </div>
  );
}
