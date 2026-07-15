'use client';

import { useState } from 'react';
import { saveSiteSetting } from '@/lib/actions/site-settings';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export function PixelSettingsForm({ initialValue }: { initialValue: string }) {
  const [pixelId, setPixelId] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveSiteSetting('meta_pixel', pixelId.trim() || '');
    setSaving(false);
    if (result.ok) {
      toast.success('Pixel ID saved');
    } else {
      toast.error(result.message || 'Failed to save');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Meta Pixel ID</label>
          <p className="text-xs text-slate-500">Paste your Facebook Pixel ID (e.g., 1234567890). Leave empty to disable.</p>
          <input
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="Enter Pixel ID"
            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-[#2D6A4F] outline-none transition-all"
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
