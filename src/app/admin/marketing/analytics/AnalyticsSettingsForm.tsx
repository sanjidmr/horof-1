'use client';

import { useState } from 'react';
import { saveSiteSetting } from '@/lib/actions/site-settings';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export function AnalyticsSettingsForm({ initialValue }: { initialValue: string }) {
  const [measurementId, setMeasurementId] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveSiteSetting('google_analytics', measurementId.trim() || '');
    setSaving(false);
    if (result.ok) {
      toast.success('Measurement ID saved');
    } else {
      toast.error(result.message || 'Failed to save');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">GA4 Measurement ID</label>
          <p className="text-xs text-slate-500">Paste your Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX). Leave empty to disable.</p>
          <input
            value={measurementId}
            onChange={(e) => setMeasurementId(e.target.value)}
            placeholder="G-XXXXXXXXXX"
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
