'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, Save, Image as ImageIcon, CheckCircle2, Type, Eye } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

const DEFAULT_SUBTITLE_NORMAL =
  'Crafted with passion, inspired by timeless artistry — Horof brings warmth, creativity, and elegance into every corner of your home.';
const DEFAULT_SUBTITLE_BOLD = 'DIY • HANDMADE • DECOR';

export default function SiteImagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingText, setSavingText] = useState(false);

  // Image state
  const [images, setImages] = useState<{ [key: string]: string }>({
    'hero': '',
    'decor-1': '',
    'decor-2': '',
    'decor-3': ''
  });

  // Hero text state
  const [subtitleNormal, setSubtitleNormal] = useState(DEFAULT_SUBTITLE_NORMAL);
  const [subtitleBold, setSubtitleBold] = useState(DEFAULT_SUBTITLE_BOLD);
  const [heroContentId, setHeroContentId] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchAll() {
      const [imagesRes, heroContentRes] = await Promise.all([
        supabase.from('site_images').select('*'),
        supabase.from('hero_content').select('*').limit(1).maybeSingle(),
      ]);

      if (imagesRes.data) {
        const imgMap: { [key: string]: string } = {};
        imagesRes.data.forEach(item => {
          imgMap[item.section] = item.image_url;
        });
        setImages(prev => ({ ...prev, ...imgMap }));
      }

      if (heroContentRes.data) {
        setSubtitleNormal(heroContentRes.data.subtitle_normal || DEFAULT_SUBTITLE_NORMAL);
        setSubtitleBold(heroContentRes.data.subtitle_bold || DEFAULT_SUBTITLE_BOLD);
        setHeroContentId(heroContentRes.data.id || null);
      }

      setLoading(false);
    }
    fetchAll();
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

  const handleSaveHeroText = async () => {
    try {
      setSavingText(true);

      let error;
      if (heroContentId) {
        // Update existing row
        ({ error } = await supabase
          .from('hero_content')
          .update({ subtitle_normal: subtitleNormal, subtitle_bold: subtitleBold })
          .eq('id', heroContentId));
      } else {
        // Insert first row
        const { data, error: insertError } = await supabase
          .from('hero_content')
          .insert({ subtitle_normal: subtitleNormal, subtitle_bold: subtitleBold })
          .select('id')
          .single();
        error = insertError;
        if (data?.id) setHeroContentId(data.id);
      }

      if (error) throw error;
      toast.success('Hero text updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save hero text');
    } finally {
      setSavingText(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading site assets...</div>;

  return (
    <div className="space-y-10 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Site Visuals</h1>
        <p className="text-slate-500">Manage high-impact imagery and hero text across your storefront.</p>
      </div>

      {/* ─── Hero Text Editor ─── */}
      <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Type className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hero Subtitle Text</h2>
            <p className="text-sm text-slate-500">Edit the two lines of text that appear below the main "Horof" heading.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Line 1 — Normal Weight
              </label>
              <textarea
                value={subtitleNormal}
                onChange={e => setSubtitleNormal(e.target.value)}
                rows={4}
                placeholder="Enter the normal-weight subtitle line..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none transition"
              />
              <p className="mt-1 text-xs text-slate-400">Appears as lighter/regular weight text</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Line 2 — Bold Weight
              </label>
              <input
                type="text"
                value={subtitleBold}
                onChange={e => setSubtitleBold(e.target.value)}
                placeholder="e.g. DIY • HANDMADE • DECOR"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              />
              <p className="mt-1 text-xs text-slate-400">Appears as bold white text on a new line</p>
            </div>

            <button
              onClick={handleSaveHeroText}
              disabled={savingText}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-purple-200"
            >
              {savingText ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Hero Text
                </>
              )}
            </button>
          </div>

          {/* Live Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <Eye className="h-4 w-4" />
              Live Preview
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center">
              {/* Background image */}
              {images['hero'] && (
                <img
                  src={images['hero']}
                  alt="Hero bg preview"
                  className="absolute inset-0 w-full h-full object-cover object-top opacity-60"
                />
              )}
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

              {/* Text preview */}
              <div className="relative z-10 text-center px-6 space-y-2 w-full">
                <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-bold">
                  Artisan Collection • Heritage Edition
                </p>
                <h3 className="text-white font-bold text-3xl sm:text-4xl tracking-tighter leading-none">
                  Horof
                </h3>
                <div className="text-white/60 text-[11px] leading-relaxed max-w-xs mx-auto">
                  <span className="font-light">{subtitleNormal || <span className="italic opacity-40">Normal text here…</span>}</span>
                  <br />
                  <span className="text-white font-bold">{subtitleBold || <span className="italic opacity-40">Bold text here…</span>}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              This is an approximate preview. Visit the homepage to see the exact result.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Hero Image ─── */}
      <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-forest/10 rounded-xl flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-forest" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hero Background Image</h2>
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

      {/* ─── Decor Showcase ─── */}
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
          <span className="text-sm font-bold">Syncing Assets…</span>
        </div>
      )}
    </div>
  );
}
