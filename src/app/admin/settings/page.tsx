'use client';

import React, { useEffect, useState } from 'react';
import { Save, Camera, Store, User } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState({ id: '', full_name: '', email: '', avatar_url: '' });
  const [settings, setSettings] = useState({ id: '', store_name: '', contact_email: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          avatar_url: profileData.avatar_url || ''
        });
      }
    }

    // Get settings
    const { data: settingsData } = await supabase.from('settings').select('*').limit(1).single();
    if (settingsData) {
      setSettings(settingsData);
    }
    
    setLoading(false);
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return profile.avatar_url;
    
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile);
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const avatar_url = await uploadAvatar();
      
      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name,
        avatar_url: avatar_url
      }).eq('id', profile.id);
      
      if (error) throw error;
      
      setProfile({ ...profile, avatar_url });
      setAvatarFile(null);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      if (settings.id) {
        const { error } = await supabase.from('settings').update({
          store_name: settings.store_name,
          contact_email: settings.contact_email
        }).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('settings').insert([{
          store_name: settings.store_name,
          contact_email: settings.contact_email
        }]).select().single();
        if (error) throw error;
        setSettings(data);
      }
      toast.success('Store settings updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update store settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your profile and store configuration.</p>
      </div>

      {/* Admin Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <User className="h-5 w-5 text-[#2D6A4F]" />
          <h2 className="text-lg font-bold text-slate-900">Admin Profile</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-lg">
            <div className="flex items-center gap-6">
              <div className="relative h-20 w-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#E6F0EB] file:text-[#1B4332] hover:file:bg-[#2D6A4F] hover:file:text-white transition-colors cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" 
                value={profile.full_name} 
                onChange={e => setProfile({...profile, full_name: e.target.value})} 
                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                value={profile.email} 
                disabled
                className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 outline-none cursor-not-allowed" 
              />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed as it is linked to your Google Account.</p>
            </div>

            <Button type="submit" disabled={savingProfile} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
              {savingProfile ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
            </Button>
          </form>
        </div>
      </div>

      {/* Store Settings Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Store className="h-5 w-5 text-[#2D6A4F]" />
          <h2 className="text-lg font-bold text-slate-900">Store Settings</h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
              <input 
                type="text" 
                value={settings.store_name} 
                onChange={e => setSettings({...settings, store_name: e.target.value})} 
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Support/Contact Email</label>
              <input 
                type="email" 
                value={settings.contact_email} 
                onChange={e => setSettings({...settings, contact_email: e.target.value})} 
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F]" 
              />
            </div>

            <Button type="submit" disabled={savingSettings} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
              {savingSettings ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Store Settings</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
