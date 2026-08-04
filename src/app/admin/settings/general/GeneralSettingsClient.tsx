'use client';

import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import { ImageUploadField } from '@/components/admin/settings/ImageUploadField';
import { LiveSyncBadge } from '@/components/admin/settings/LiveSyncBadge';
import { saveGeneralSettings } from '@/lib/actions/app-settings';
import { useRealtimeSettingsForm } from '@/hooks/useRealtimeSettingsForm';
import type { GeneralSettings } from '@/lib/settings/types';

export function GeneralSettingsClient({ initial }: { initial: GeneralSettings }) {
  const { form, set, markSaved, dirty, loading } = useRealtimeSettingsForm<GeneralSettings>(initial, 'general');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveGeneralSettings(form);
      if (res.ok) {
        markSaved();
        toast.success('General settings saved');
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
        title="Business Identity"
        description="Your store name and contact details. These appear across the website, emails, and invoices."
      >
        <Field label="Website Name" required hint="Used in the navbar, footer, metadata, and emails.">
          <input className={inputCls} value={form.website_name} onChange={(e) => set('website_name', e.target.value)} placeholder="Horof" />
        </Field>
        <Field label="Business Address" hint="Displayed in the footer and on invoices.">
          <input className={inputCls} value={form.business_address} onChange={(e) => set('business_address', e.target.value)} placeholder="Mymensingh, Dhaka" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone Number">
            <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+880 1234 567890" />
          </Field>
          <Field label="Support Email">
            <input type="email" className={inputCls} value={form.support_email} onChange={(e) => set('support_email', e.target.value)} placeholder="studio@horof.com" />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Branding Assets" description="Upload or paste URLs for your logo and favicon. Changes apply sitewide immediately.">
        <ImageUploadField label="Company Logo" value={form.company_logo} onChange={(v) => set('company_logo', v)} folder="general" hint="Used in the storefront navbar and footer." />
        <ImageUploadField label="Admin Logo" value={form.admin_logo} onChange={(v) => set('admin_logo', v)} folder="general" hint="Used in the admin dashboard." />
        <ImageUploadField label="Favicon" value={form.favicon} onChange={(v) => set('favicon', v)} folder="general" hint="Browser tab icon. Use a .ico, .png, or .svg." />
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        <LiveSyncBadge live={!dirty} loading={loading} />
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save General Settings'}
        </Button>
      </div>
    </div>
  );
}
