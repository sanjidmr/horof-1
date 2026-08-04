'use client';

import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { ToggleSwitch } from '@/components/admin/settings/ToggleSwitch';
import { LiveSyncBadge } from '@/components/admin/settings/LiveSyncBadge';
import { saveNotificationSettings } from '@/lib/actions/app-settings';
import { useRealtimeSettingsForm } from '@/hooks/useRealtimeSettingsForm';
import type { NotificationSettings } from '@/lib/settings/types';

const TOGGLES: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: 'email_enabled', label: 'Email Notifications', description: 'Send transactional and marketing emails (orders, password reset, contact).' },
  { key: 'admin_enabled', label: 'Admin Notifications', description: 'In-app notifications for new orders, contacts, and design requests.' },
  { key: 'customer_enabled', label: 'Customer Notifications', description: 'Notifications sent to customers about their orders and requests.' },
  { key: 'browser_enabled', label: 'Browser Notifications', description: 'Real-time browser notifications in the admin dashboard.' },
  { key: 'warehouse_enabled', label: 'Warehouse Notifications', description: 'Notifications pushed to warehouse staff for packing and fulfillment.' },
  { key: 'low_stock_enabled', label: 'Low Stock Alerts', description: 'Warn when products fall below stock thresholds.' },
  { key: 'order_update_enabled', label: 'Order Update Emails', description: 'Email customers when their order status changes.' },
  { key: 'design_request_enabled', label: 'Design Request Notifications', description: 'Notify admins and customers about design request updates.' },
];

export function NotificationSettingsClient({ initial }: { initial: NotificationSettings }) {
  const { form, set, markSaved, dirty, loading } = useRealtimeSettingsForm<NotificationSettings>(initial, 'notifications');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveNotificationSettings(form);
      if (res.ok) {
        markSaved();
        toast.success('Notification settings saved');
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
        title="Notification Channels"
        description="Globally enable or disable each notification channel. These controls are wired to the real notification system."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOGGLES.map((t) => (
            <ToggleSwitch
              key={t.key}
              checked={form[t.key]}
              onChange={(v) => set(t.key, v)}
              label={t.label}
              description={t.description}
            />
          ))}
        </div>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        <LiveSyncBadge live={!dirty} loading={loading} />
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </div>
    </div>
  );
}
