'use client';

import { useState } from 'react';
import { saveSiteSetting } from '@/lib/actions/site-settings';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export function SeoSettingsForm({ defaultTitle, defaultDescription }: { defaultTitle: string; defaultDescription: string }) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const [r1, r2] = await Promise.all([
      saveSiteSetting('seo_default_title', title.trim()),
      saveSiteSetting('seo_default_description', description.trim()),
    ]);
    setSaving(false);
    if (r1.ok && r2.ok) {
      toast.success('SEO settings saved');
    } else {
      toast.error(r1.message || r2.message || 'Failed to save');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Meta Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Horof - Premium Wood Crafts"
            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-[#2D6A4F] outline-none transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Default Meta Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Discover premium handcrafted wood crafts..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#2D6A4F] outline-none transition-all resize-none"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
