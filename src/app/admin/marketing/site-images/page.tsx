'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, Save, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function SiteImagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<{ [key: string]: string }>({
    'hero': '',
    'decor-1': '',
    'decor-2': '',
    'decor-3': ''
  });
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchImages() {
      const { data, error } = await supabase.from('site_images').select('*');
      if (data) {
        const imgMap: { [key: string]: string } = {};
        data.forEach(item => {
          imgMap[item.section] = item.image_url;
        });
        setImages(prev => ({ ...prev, ...imgMap }));
      }
      setLoading(false);
    }
    fetchImages();
  }, [supabase]);

  const handleUpload = async (section: string, file: File) => {
    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${section}-${Math.random()}.${fileExt}`;
      const filePath = `site-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      // Upsert the image URL in the site_images table
      const { error: dbError } = await supabase
        .from('site_images')
        .upsert({ 
          section, 
          image_url: publicUrl 
        }, { onConflict: 'section' });

      if (dbError) throw dbError;

      setImages(prev => ({ ...prev, [section]: publicUrl }));
      toast.success(`${section} image updated successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading site assets...</div>;

  return (
    <div className="space-y-10 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Site Visuals</h1>
        <p className="text-slate-500">Manage high-impact imagery across your storefront.</p>
      </div>

      {/* Hero Section */}
      <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-forest/10 rounded-xl flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-forest" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hero Background</h2>
            <p className="text-sm text-slate-500">The primary atmospheric image on the home page.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group">
            {images['hero'] ? (
              <img src={images['hero']} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                <span className="text-xs">No image set</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <label className="bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-bold cursor-pointer hover:scale-105 transition-transform">
                Replace Image
                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload('hero', e.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Best Practices
              </h4>
              <ul className="text-xs text-slate-500 space-y-1 ml-6 list-disc">
                <li>Resolution: 1920x1080px or higher</li>
                <li>Size: Under 2MB for performance</li>
                <li>Aspect Ratio: 16:9</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Decor Showcase Section */}
      <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <UploadCloud className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Decor Showcase</h2>
            <p className="text-sm text-slate-500">Curated gallery images for the showcase section.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map(num => (
            <div key={num} className="space-y-3">
              <div className="relative aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group">
                {images[`decor-${num}`] ? (
                  <img src={images[`decor-${num}`]} alt={`Decor ${num}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                    <span className="text-xs">Decor {num}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer hover:scale-105 transition-transform">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(`decor-${num}`, e.target.files[0])} />
                  </label>
                </div>
              </div>
              <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">Image {num}</p>
            </div>
          ))}
        </div>
      </section>

      {saving && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold">Syncing Assets...</span>
        </div>
      )}
    </div>
  );
}
