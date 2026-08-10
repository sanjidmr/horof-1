'use client';

import React from 'react';
import { Save, Loader2, Send, PlugZap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import { ToggleSwitch } from '@/components/admin/settings/ToggleSwitch';
import { LiveSyncBadge } from '@/components/admin/settings/LiveSyncBadge';
import { saveEmailSettings, testSmtpConnection, sendTestEmailAction } from '@/lib/actions/app-settings';
import { useRealtimeSettingsForm } from '@/hooks/useRealtimeSettingsForm';
import type { EmailSettings } from '@/lib/settings/types';

export function EmailSettingsClient({ initial }: { initial: EmailSettings }) {
  const { form, set, markSaved, dirty, loading } = useRealtimeSettingsForm<EmailSettings>(initial, 'email');
  const [saving, setSaving] = React.useState(false);
  const [testingSmtp, setTestingSmtp] = React.useState(false);
  const [testTo, setTestTo] = React.useState('');
  const [sendingTest, setSendingTest] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveEmailSettings(form);
      if (res.ok) {
        markSaved();
        toast.success('Email settings saved');
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await testSmtpConnection();
      if (res.ok) {
        toast.success(res.note || 'SMTP connection verified');
      } else {
        toast.error(res.error || 'SMTP test failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'SMTP test failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTo) {
      toast.error('Enter a recipient email first');
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendTestEmailAction(testTo);
      if (res.ok) {
        toast.success('Test email sent');
      } else {
        toast.error(res.error || 'Failed to send test email');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard title="Sender Identity" description="Who emails appear to come from. Applied to all outgoing mail.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sender Name">
            <input className={inputCls} value={form.sender_name} onChange={(e) => set('sender_name', e.target.value)} placeholder="Horof" />
          </Field>
          <Field label="Sender Email">
            <input type="email" className={inputCls} value={form.sender_email} onChange={(e) => set('sender_email', e.target.value)} placeholder="noreply@horof.com" />
          </Field>
          <Field label="Support Email" hint="Replies and support messages route here.">
            <input type="email" className={inputCls} value={form.support_email} onChange={(e) => set('support_email', e.target.value)} placeholder="studio@horof.com" />
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="SMTP / Delivery Provider" description="Configure how emails are delivered. Leave custom SMTP off to use env-based providers (Resend/Brevo/SendGrid).">
        <ToggleSwitch
          checked={form.smtp_enabled}
          onChange={(v) => set('smtp_enabled', v)}
          label="Enable Custom SMTP"
          description="Send via your own SMTP server instead of the API-based provider."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Provider">
            <select
              className={inputCls}
              value={form.smtp_provider}
              onChange={(e) => set('smtp_provider', e.target.value as EmailSettings['smtp_provider'])}
            >
              <option value="resend">Resend</option>
              <option value="brevo">Brevo (Sendinblue)</option>
              <option value="sendgrid">SendGrid</option>
              <option value="custom">Custom SMTP</option>
            </select>
          </Field>
          <Field label="SMTP Host">
            <input className={inputCls} value={form.smtp_host} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.example.com" />
          </Field>
          <Field label="SMTP Port">
            <input type="number" className={inputCls} value={form.smtp_port || ''} onChange={(e) => set('smtp_port', Number(e.target.value) || 587)} />
          </Field>
          <Field label="SMTP Username">
            <input className={inputCls} value={form.smtp_user} onChange={(e) => set('smtp_user', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="SMTP Password">
            <input type="password" className={inputCls} value={form.smtp_pass} onChange={(e) => set('smtp_pass', e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="flex items-end pb-1">
            <ToggleSwitch
              checked={form.smtp_secure}
              onChange={(v) => set('smtp_secure', v)}
              label="Use TLS/SSL"
              description="Enable for SSL (465) or TLS (587)."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleTestSmtp} disabled={testingSmtp} variant="outline" className="rounded-xl gap-2">
            {testingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            {testingSmtp ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Transactional Emails" description="Control which automatic emails are sent.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            checked={form.password_reset_enabled}
            onChange={(v) => set('password_reset_enabled', v)}
            label="Password Reset Emails"
            description="Send password reset links via Supabase Auth email."
          />
          <ToggleSwitch
            checked={form.order_email_enabled}
            onChange={(v) => set('order_email_enabled', v)}
            label="Order Status Emails"
            description="Email customers when order status changes."
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Send Test Email" description="Send a test message to verify delivery is working end-to-end.">
        <div className="flex gap-2">
          <input
            type="email"
            className={inputCls}
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="recipient@example.com"
          />
          <Button onClick={handleSendTest} disabled={sendingTest} variant="primary" className="rounded-xl gap-2 shrink-0">
            {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendingTest ? 'Sending...' : 'Send'}
          </Button>
        </div>
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          If no provider is configured, emails are logged to the server console and marked as sent.
        </p>
      </SettingsCard>

      <div className="flex items-center justify-end gap-3">
        <LiveSyncBadge live={!dirty} loading={loading} />
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Email Settings'}
        </Button>
      </div>
    </div>
  );
}
