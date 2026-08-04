'use client';

import React, { useState } from 'react';
import { Save, Loader2, KeyRound, Lock, Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import { changeSuperAdminPassword } from '@/lib/actions/app-settings';
import { cn } from '@/lib/utils';

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-500'];

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < score ? colors[score] : 'bg-slate-200')} />
        ))}
      </div>
      <p className="text-[11px] font-bold text-slate-500">
        {password ? labels[score] : 'Password strength'}
      </p>
      <ul className="text-[11px] text-slate-400 space-y-0.5">
        <li>8+ characters with a mix of uppercase, lowercase, and numbers</li>
      </ul>
    </div>
  );
}

export function SuperAdminSecurityClient({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await changeSuperAdminPassword({ currentPassword, newPassword, confirmPassword });
      if (res.ok) {
        toast.success('Password updated successfully. Other sessions were signed out.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.error || 'Failed to update password');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Change Super Admin Password"
        description="Update the password for your administrator account."
      >
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{email || 'Admin account'}</p>
            <p className="text-[11px] text-slate-500">You will be asked to confirm your current password.</p>
          </div>
        </div>

        <Field label="Current Password" required>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              className={`${inputCls} pl-10 pr-10`}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="New Password" required>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                className={`${inputCls} pl-10 pr-10`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
          </Field>
          <Field label="Confirm New Password" required>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                className={cn(inputCls, 'pl-10 pr-10', confirmPassword && newPassword && confirmPassword !== newPassword && 'border-red-400 focus:border-red-400 focus:ring-red-200')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-500 font-bold">Passwords do not match</p>
            )}
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title="Session Security" description="Manage how your sessions behave.">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex gap-3">
            <LogOut className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              For security, changing your password signs out all other sessions across devices. Your current session stays active.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          All password changes are recorded in the audit log with the admin&apos;s identity and timestamp.
        </p>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} variant="primary" className="rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Updating...' : 'Update Password'}
        </Button>
      </div>
    </div>
  );
}
