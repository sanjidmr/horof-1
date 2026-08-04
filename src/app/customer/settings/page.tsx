'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  Lock, Bell, Shield, Eye, EyeOff, Smartphone, Globe, User,
  CheckCircle2, AlertTriangle, Save, Key, LogOut, Upload
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const supabase = createSupabaseBrowserClient();
  const [activeTab, setActiveTab] = useState<'account' | 'password' | 'notifications' | 'security' | 'sessions' | 'privacy'>('account');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Account form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    order_updates: true,
    promotions: false,
    support_replies: true,
    account_alerts: true
  });
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      setProfileForm({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || '',
        avatar_url: profileData?.avatar_url || '',
      });

      // Load notification preferences from profile or defaults
      if (profileData?.notification_preferences) {
        setNotifPrefs(prev => ({ ...prev, ...profileData.notification_preferences }));
      }

      // Load sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      if (sessionsData) setSessions(sessionsData);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.floor(Math.random() * 100000)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setProfileForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success('Avatar uploaded! Click Save Changes to apply.');
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          avatar_url: profileForm.avatar_url,
        })
        .eq('id', profile.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSaveNotifPrefs = async () => {
    if (!profile?.id) return;
    setSavingNotifPrefs(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: notifPrefs })
        .eq('id', profile.id);
      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
      toast.success('Session revoked');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke session');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'password', label: 'Change Password', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Login Sessions', icon: Smartphone },
    { id: 'privacy', label: 'Privacy', icon: Globe },
  ] as const;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-6 w-72 bg-slate-100 rounded-lg" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-emerald-700 border border-b-white border-slate-200 -mb-px shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100">
                <User className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Account Settings</h2>
                <p className="text-xs text-slate-500">Keep your profile details up to date</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Avatar upload workflow */}
              <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="relative h-16 w-16 rounded-xl bg-white overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center text-slate-300">
                  {profileForm.avatar_url ? (
                    <img src={profileForm.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Avatar</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingAvatar}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 border border-slate-200 hover:bg-white bg-white text-slate-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Avatar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    value={profileForm.full_name}
                    onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-sm font-semibold text-slate-500">{profile?.email || ''}</span>
                  <span className="ml-auto px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">Verified</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {updatingProfile ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Change Password */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                <p className="text-xs text-slate-500">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 pr-10 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPasswords ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 pr-10 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                <input
                  required
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {updatingPassword ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                ) : (
                  <><Save className="w-4 h-4" /> Update Password</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Notification Preferences */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Notification Preferences</h2>
                <p className="text-xs text-slate-500">Choose what notifications you receive</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'order_updates', label: 'Order Updates', desc: 'Order confirmed, shipped, delivered status changes' },
                { key: 'support_replies', label: 'Support Replies', desc: 'When support team responds to your tickets' },
                { key: 'account_alerts', label: 'Account Alerts', desc: 'Security alerts and account changes' },
                { key: 'promotions', label: 'Promotions & Offers', desc: 'Special deals, discounts and new arrivals' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (notifPrefs as any)[item.key] ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      (notifPrefs as any)[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveNotifPrefs}
              disabled={savingNotifPrefs}
              className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {savingNotifPrefs ? 'Saving...' : <><Save className="w-4 h-4" /> Save Preferences</>}
            </button>
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Security Settings</h2>
                <p className="text-xs text-slate-500">Enhance your account security</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Email Verified</p>
                      <p className="text-xs text-slate-400">{profile?.email || 'No email'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">Verified</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Smartphone className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-400">Add an extra layer of security</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Sessions */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                <Smartphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Login Sessions</h2>
                <p className="text-xs text-slate-500">Manage your active sessions</p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                <Smartphone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No active sessions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{session.device_name || 'Unknown Device'}</p>
                        <p className="text-xs text-slate-400">
                          {session.ip_address} · {new Date(session.last_active_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke session"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy */}
        {activeTab === 'privacy' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100">
                <Globe className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Privacy Settings</h2>
                <p className="text-xs text-slate-500">Control your privacy preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Profile Visibility', desc: 'Make your profile visible to others', enabled: true },
                { label: 'Order History Privacy', desc: 'Keep your order history private', enabled: true },
                { label: 'Data Collection', desc: 'Allow anonymous usage data collection', enabled: false },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      item.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      item.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Data Deletion</p>
                <p className="text-xs text-amber-600 mt-0.5">You can request deletion of your account and associated data. This action is irreversible.</p>
                <button className="mt-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors">
                  Request Deletion
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}