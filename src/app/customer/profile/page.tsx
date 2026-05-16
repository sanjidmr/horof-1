'use client';

import React, { useEffect, useState } from 'react';
import { User, Save, MapPin } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState({ id: '', full_name: '', email: '', phone: '', avatar_url: '' });
  const [address, setAddress] = useState({ street: '', city: '', state: '', postal_code: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      setProfile({
        id: data.id,
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || ''
      });
      if (data.address) {
        setAddress(data.address);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const avatar_url = await uploadAvatar();
      
      const { error } = await supabase.from('profiles').update({
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: avatar_url,
        address: address
      }).eq('id', profile.id);
      
      if (error) throw error;
      
      setProfile(prev => ({ ...prev, avatar_url }));
      setAvatarFile(null);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500">Manage your personal information and address.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <User className="h-5 w-5 text-[#2D6A4F]" />
            <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
          </div>
          <div className="p-6 space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input disabled type="email" value={profile.email} className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#2D6A4F]" />
            <h2 className="text-lg font-bold text-slate-900">Shipping Address</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
              <input type="text" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State / Province</label>
                <input type="text" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                <input type="text" value={address.postal_code} onChange={e => setAddress({...address, postal_code: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <input type="text" value={address.country} onChange={e => setAddress({...address, country: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#2D6A4F]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-[#1B4332] text-white hover:bg-[#2D6A4F] h-12 px-8">
            {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
