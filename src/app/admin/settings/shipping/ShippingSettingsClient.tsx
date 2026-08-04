'use client';

import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import { ToggleSwitch } from '@/components/admin/settings/ToggleSwitch';
import { LiveSyncBadge } from '@/components/admin/settings/LiveSyncBadge';
import { saveShippingSettings } from '@/lib/actions/app-settings';
import { useRealtimeSettingsForm } from '@/hooks/useRealtimeSettingsForm';
import type { ShippingSettings } from '@/lib/settings/types';

export function ShippingSettingsClient({ initial }: { initial: ShippingSettings }) {
  const { form, set, markSaved, dirty, loading } = useRealtimeSettingsForm<ShippingSettings>(initial, 'shipping');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveShippingSettings(form);
      if (res.ok) {
        markSaved();
        toast.success('Shipping settings saved');
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
      <SettingsCard title="Delivery Charges" description="Applied automatically at checkout based on the delivery area.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Inside Mymensingh (BDT)">
            <input type="number" min={0} className={inputCls} value={form.inside_mymensingh_charge || ''}
              onChange={(e) => set('inside_mymensingh_charge', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Outside Mymensingh (BDT)">
            <input type="number" min={0} className={inputCls} value={form.outside_mymensingh_charge || ''}
              onChange={(e) => set('outside_mymensingh_charge', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Office Pickup (BDT)">
            <input type="number" min={0} className={inputCls} value={form.office_charge || ''}
              onChange={(e) => set('office_charge', Number(e.target.value) || 0)} />
          </Field>
        </div>
        <Field label="Estimated Delivery Time" hint="Shown to customers at checkout.">
          <input className={inputCls} value={form.estimated_delivery} onChange={(e) => set('estimated_delivery', e.target.value)} placeholder="2-3 days" />
        </Field>
      </SettingsCard>

      <SettingsCard title="Free Shipping" description="Offer free delivery on orders above a threshold.">
        <ToggleSwitch
          checked={form.free_shipping_enabled}
          onChange={(v) => set('free_shipping_enabled', v)}
          label="Enable Free Shipping"
          description="When enabled, orders above the threshold get free delivery."
        />
        <Field label="Free Shipping Threshold (BDT)" hint="Orders equal to or above this amount ship free.">
          <input type="number" min={0} className={inputCls} value={form.free_shipping_threshold || ''}
            onChange={(e) => set('free_shipping_threshold', Number(e.target.value) || 0)} />
        </Field>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        <LiveSyncBadge live={!dirty} loading={loading} />
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Shipping Settings'}
        </Button>
      </div>
    </div>
  );
}
