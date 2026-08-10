'use client';

import React from 'react';
import { Save, Loader2, Facebook, Instagram, Youtube, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import { LiveSyncBadge } from '@/components/admin/settings/LiveSyncBadge';
import { saveSocialSettings } from '@/lib/actions/app-settings';
import { useRealtimeSettingsForm } from '@/hooks/useRealtimeSettingsForm';
import type { SocialSettings } from '@/lib/settings/types';

const SOCIAL_FIELDS: { key: keyof SocialSettings; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string; hint: string }[] = [
  { key: 'facebook', label: 'Facebook Page URL', icon: Facebook, placeholder: 'https://facebook.com/horof', hint: 'Shown in the website footer.' },
  { key: 'instagram', label: 'Instagram URL', icon: Instagram, placeholder: 'https://instagram.com/horof', hint: 'Shown in the website footer.' },
  { key: 'whatsapp', label: 'WhatsApp Number / Link', icon: MessageCircle, placeholder: 'https://wa.me/8801XXXXXXXXX', hint: 'Used for the WhatsApp button in the navbar and mobile menu.' },
  { key: 'youtube', label: 'YouTube Channel URL', icon: Youtube, placeholder: 'https://youtube.com/@horof', hint: 'Shown in the website footer.' },
];

export function SocialSettingsClient({ initial }: { initial: SocialSettings }) {
  const { form, set, markSaved, dirty, loading } = useRealtimeSettingsForm<SocialSettings>(initial, 'social');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveSocialSettings(form);
      if (res.ok) {
        markSaved();
        toast.success('Social settings saved — updated across the website');
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Social Links"
        description="Edit your social profiles once here — they update automatically in the footer, navbar, and mobile menu."
      >
        <div className="grid grid-cols-1 gap-5">
          {SOCIAL_FIELDS.map((f) => {
            const Icon = f.icon;
            return (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputCls} pl-10`}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              </Field>
            );
          })}
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        <LiveSyncBadge live={!dirty} loading={loading} />
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Social Settings'}
        </Button>
      </div>
    </div>
  );
}
