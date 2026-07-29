'use client';

import React, { useEffect, useState } from 'react';
import {
  User, Save, MapPin, Mail, Phone, Camera, Upload,
  CheckCircle2, Clock, X, Lock, Eye, EyeOff, Loader2,
  AlertCircle, ShieldCheck, Calendar, Edit2, Trash2, Plus,
  Star, Home, Building
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Address {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  is_default: boolean;
  type?: 'home' | 'work' | 'other';
}

export default function CustomerProfilePage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    id: '',
    name: '',
    phone: '',
    city: '',
    address: '',
    type: 'home' as 'home' | 'work' | 'other',
  });
  const [submittingAddress, setSubmittingAddress] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserAuth(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const loadedProfile = profileData || { full_name: user.email?.split('@')[0], email: user.email };
      setProfile(loadedProfile);
      setProfileForm({
        full_name: loadedProfile.full_name || '',
        phone: loadedProfile.phone || '',
        avatar_url: loadedProfile.avatar_url || '',
      });

      const { data: addressesData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (addressesData) setAddresses(addressesData);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userAuth) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userAuth.id}-${Math.floor(Math.random() * 100000)}.${fileExt}`;
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
    if (!userAuth) return;
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          avatar_url: profileForm.avatar_url,
        })
        .eq('id', userAuth.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Password Update
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
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Address CRUD
  const openAddressModal = (addr: any = null) => {
    if (addr) {
      setAddressForm({
        id: addr.id,
        name: addr.name || '',
        phone: addr.phone || '',
        city: addr.city || '',
        address: addr.address || '',
        type: addr.type || 'home',
      });
    } else {
      setAddressForm({ id: '', name: '', phone: '', city: '', address: '', type: 'home' });
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAuth) return;
    setSubmittingAddress(true);
    const payload = {
      name: addressForm.name.trim(),
      phone: addressForm.phone.trim(),
      city: addressForm.city.trim(),
      address: addressForm.address.trim(),
      type: addressForm.type,
      user_id: userAuth.id,
      is_default: addresses.length === 0,
    };
    try {
      if (addressForm.id) {
        const { error } = await supabase
          .from('addresses')
          .update(payload)
          .eq('id', addressForm.id)
          .eq('user_id', userAuth.id);
        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase.from('addresses').insert([payload]);
        if (error) throw error;
        toast.success('Address added');
      }
      setIsAddressModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address.');
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userAuth.id);
      if (error) throw error;
      toast.success('Address deleted');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to delete address.');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userAuth.id);
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', userAuth.id);
      if (error) throw error;
      toast.success('Default address updated');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to update default address.');
    }
  };

  const joinDate = profile?.created_at || userAuth?.created_at;
  const formattedJoinDate = joinDate
    ? new Date(joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-6 w-72 bg-slate-100 rounded-lg" />
        <div className="h-48 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-slate-100 rounded-3xl" />
          <div className="h-96 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-xl border border-[#1b4332]/5 bg-gradient-to-tr from-[#1B4332] via-[#24543d] to-[#2D6A4F] p-6 md:p-8 text-white"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl font-semibold shadow-2xl overflow-hidden">
              {profileForm.avatar_url ? (
                <img src={profileForm.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profileForm.full_name?.[0] || userAuth?.email?.[0] || 'U').toUpperCase()
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg cursor-pointer shadow-lg transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profileForm.full_name || 'Valued Customer'}</h1>
              <span className="flex items-center gap-1 px-3 py-0.5 bg-emerald-400/25 border border-emerald-300/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                <ShieldCheck className="w-3 h-3" /> {profile?.role || 'Customer'}
              </span>
            </div>
            <p className="text-white/80 text-sm font-medium">{profile?.email || userAuth?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white/70 text-xs bg-black/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl w-fit">
              <Calendar className="w-4 h-4 text-emerald-300" />
              <span>Member Since: <strong className="text-white">{formattedJoinDate}</strong></span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
              <p className="text-xs text-slate-400 font-medium">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  required
                  type="text"
                  value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-500">{profile?.email || userAuth?.email}</span>
                <span className="ml-auto px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">Verified</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={updatingProfile}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {updatingProfile ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Security</h2>
              <p className="text-xs text-slate-400 font-medium">Update your password</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-3 pr-10 outline-none text-sm font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl p-3 outline-none text-sm font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {updatingPassword ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
              ) : (
                <><Lock className="w-4 h-4" /> Update Password</>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Addresses Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Saved Addresses</h2>
              <p className="text-xs text-slate-400 font-medium">Manage your shipping addresses</p>
            </div>
          </div>
          <button
            onClick={() => openAddressModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>

        <div className="p-6">
          {addresses.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl">
              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-500">No saved addresses</p>
              <p className="text-xs text-slate-400 mt-1">Add a shipping address for faster checkout.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  className={`relative p-5 rounded-2xl border transition-all ${
                    addr.is_default
                      ? 'border-emerald-200 bg-emerald-50/30 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        addr.type === 'home' ? 'bg-emerald-50 text-emerald-600' :
                        addr.type === 'work' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {addr.type === 'home' ? <Home className="w-4 h-4" /> :
                         addr.type === 'work' ? <Building className="w-4 h-4" /> :
                         <MapPin className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{addr.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{addr.phone}</p>
                      </div>
                    </div>
                    {addr.is_default && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full border border-emerald-200 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-emerald-800" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">{addr.city}</strong> · {addr.address}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openAddressModal(addr)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 uppercase tracking-wider hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Address Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddressModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {addressForm.id ? 'Edit Address' : 'Add Address'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">Shipping destination details</p>
                  </div>
                </div>
                <button onClick={() => setIsAddressModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input required type="text" value={addressForm.name}
                      onChange={e => setAddressForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                    <input required type="tel" value={addressForm.phone}
                      onChange={e => setAddressForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">City / Region</label>
                  <input required type="text" value={addressForm.city}
                    onChange={e => setAddressForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="e.g. Dhaka, Chittagong"
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Street Address</label>
                  <textarea required rows={2} value={addressForm.address}
                    onChange={e => setAddressForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Apartment, building, street details"
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none text-sm font-semibold text-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address Type</label>
                  <div className="flex gap-2">
                    {(['home', 'work', 'other'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressForm(p => ({ ...p, type }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                          addressForm.type === type
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {type === 'home' ? <Home className="w-3.5 h-3.5 inline mr-1" /> :
                         type === 'work' ? <Building className="w-3.5 h-3.5 inline mr-1" /> :
                         <MapPin className="w-3.5 h-3.5 inline mr-1" />}
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddressModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingAddress}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submittingAddress ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Save Address</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}