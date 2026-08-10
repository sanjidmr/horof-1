'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, Phone, Lock, Save, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { SettingsCard } from '@/components/admin/settings/SettingsCard';
import { Field, inputCls } from '@/components/admin/settings/SettingsFields';
import {
  getWarehouseStaffProfile,
  updateWarehouseStaffProfile,
  changeWarehouseStaffPassword,
} from '@/lib/actions/warehouse-staff-settings';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  assigned_warehouse_id: string | null;
  warehouse_name: string | null;
  is_warehouse_staff: boolean;
  role: string;
  user_type: string;
  created_at: string;
}

export function WarehouseStaffSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { profile: p } = await getWarehouseStaffProfile();
      setProfile(p);
      setFullName(p.full_name || '');
      setPhone(p.phone || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await updateWarehouseStaffProfile({
        full_name: fullName,
        phone: phone,
      });
      toast.success('Profile updated');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) return toast.error('Enter your current password');
    if (!newPassword) return toast.error('Enter a new password');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword === currentPassword) return toast.error('New password must be different');

    setChangingPassword(true);
    try {
      await changeWarehouseStaffPassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D6A4F]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-slate-500">
        Could not load profile. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information and password.
        </p>
      </div>

      {/* ── Profile Info ─────────────────────────────────────────── */}
      <SettingsCard title="Personal Information" description="Your name and contact details">
        <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-[#1a4731] flex items-center justify-center text-white text-xl font-bold">
            {fullName ? fullName.charAt(0).toUpperCase() : profile.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{fullName || 'No name set'}</p>
            <p className="text-sm text-slate-500">{profile.email}</p>
            {profile.warehouse_name && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" /> {profile.warehouse_name}
              </p>
            )}
          </div>
        </div>

        <Field label="Full Name" hint="Displayed across the warehouse panel">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className={`${inputCls} pl-10`}
            />
          </div>
        </Field>

        <Field label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              className={`${inputCls} pl-10`}
            />
          </div>
        </Field>

        <Field label="Email" hint="Cannot be changed from here">
          <input
            type="email"
            value={profile.email || ''}
            disabled
            className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`}
          />
        </Field>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4731] text-white rounded-xl text-sm font-semibold hover:bg-[#143d28] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </SettingsCard>

      {/* ── Change Password ──────────────────────────────────────── */}
      <SettingsCard title="Change Password" description="Update your login password">
        <Field label="Current Password" required>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className={`${inputCls} pl-10 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <Field label="New Password" required hint="Minimum 8 characters">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className={`${inputCls} pl-10 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm New Password" required>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showNewPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`${inputCls} pl-10`}
            />
          </div>
        </Field>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}
