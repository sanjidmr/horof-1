'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Trash2, Save, MoveUp, MoveDown, Image as ImageIcon } from 'lucide-react';

export function BannerManager() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setBanners(data || []);
    setIsLoading(false);
  };

  const addBanner = () => {
    setBanners([...banners, { 
      id: crypto.randomUUID(), 
      image_url: '', 
      title: '', 
      link_url: '', 
      sort_order: banners.length,
      is_new: true 
    }]);
  };

  const removeBanner = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      if (!confirm('Are you sure you want to delete this banner from the database?')) return;
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setBanners(banners.filter(b => b.id !== id));
    toast.success('Banner removed');
  };

  const updateBanner = (id: string, field: string, value: any) => {
    setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Prepare data (remove is_new flag)
      const dataToSave = banners.map((b, idx) => {
        const { is_new, ...cleanBanner } = b;
        return {
          ...cleanBanner,
          sort_order: idx
        };
      });

      // 2. Upsert
      const { error } = await supabase.from('banners').upsert(dataToSave, { onConflict: 'id' });
      if (error) throw error;

      toast.success('Banners saved successfully');
      fetchBanners();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save banners');
    } finally {
      setIsSaving(false);
    }
  };

  const move = (idx: number, direction: 'up' | 'down') => {
    const newBanners = [...banners];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newBanners.length) return;
    
    [newBanners[idx], newBanners[targetIdx]] = [newBanners[targetIdx], newBanners[idx]];
    setBanners(newBanners);
  };

  if (isLoading) return <div className="p-10 text-center">Loading banners...</div>;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Hero Banners</CardTitle>
          <CardDescription>Manage your homepage hero slider images and links.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addBanner}>
            <Plus size={16} className="mr-2" /> Add Slide
          </Button>
          <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
            <Save size={16} className="mr-2" /> {isSaving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {banners.map((banner, idx) => (
          <div key={banner.id} className="p-6 border rounded-2xl bg-slate-50/50 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input 
                    value={banner.image_url} 
                    onChange={e => updateBanner(banner.id, 'image_url', e.target.value)} 
                    placeholder="https://..."
                  />
                  {banner.image_url && (
                    <div className="mt-2 h-20 rounded-lg overflow-hidden border bg-white">
                      <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title (Optional)</Label>
                    <Input 
                      value={banner.title} 
                      onChange={e => updateBanner(banner.id, 'title', e.target.value)} 
                      placeholder="e.g. Summer Collection"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input 
                      value={banner.link_url} 
                      onChange={e => updateBanner(banner.id, 'link_url', e.target.value)} 
                      placeholder="/products/category/slug"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(idx, 'up')} disabled={idx === 0}>
                  <MoveUp size={14} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 'down')} disabled={idx === banners.length - 1}>
                  <MoveDown size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => removeBanner(banner.id, banner.is_new)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="p-12 border-2 border-dashed rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <ImageIcon size={24} />
            </div>
            <p className="text-sm text-slate-500">No banners configured. Add your first hero slide.</p>
            <Button variant="outline" size="sm" onClick={addBanner}>Add Slide</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
