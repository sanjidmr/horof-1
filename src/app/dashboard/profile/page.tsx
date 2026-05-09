'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { fetchProfileForUser } from '../../../lib/dashboard/fetchProfile';
import type { DbProfileRow } from '../../../lib/dashboard/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export default function DashboardProfilePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<DbProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const p = await fetchProfileForUser(supabase, user.id);
      setProfile(p);

      const metaFirst = String((user.user_metadata as Record<string, unknown>)?.first_name ?? '');
      const metaLast = String((user.user_metadata as Record<string, unknown>)?.last_name ?? '');

      setFirstName((p?.first_name ?? metaFirst)?.trim?.() ?? '');
      setLastName((p?.last_name ?? metaLast)?.trim?.() ?? '');
      setPhone((p?.phone ?? '').trim());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfileContact = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase || !user) return;

    try {
      setSavingProfile(true);

      const payload = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
      };

      if (profile) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('profiles').insert({
          id: user.id,
          user_id: user.id,
          ...payload,
        });
        if (error) throw error;
      }

      toast.success('Profile refreshed');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Profile update blocked');
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase || !user) return;

    if (!newPassword || newPassword.length < 8) {
      toast.error('Use at least eight characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords must match.');
      return;
    }

    try {
      setPasswordBusy(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success('Password rotated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to rotate password yet');
    } finally {
      setPasswordBusy(false);
    }
  };

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata as Record<string, unknown>)?.avatar_url;

  const onAvatarChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file || !supabase || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      setAvatarUploading(true);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
      });
      if (ue) throw ue;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const up = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select('id');

      if (up.error) throw up.error;

      const updated = (up.data ?? []).length > 0;

      if (!updated) {
        const ins = await supabase.from('profiles').insert({
          id: user.id,
          user_id: user.id,
          avatar_url: publicUrl,
        });
        if (ins.error) throw ins.error;
      }

      toast.success('Avatar refreshed');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Storage upload unsuccessful');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-10 text-center text-sm shadow-xl shadow-accent-primary/5">
        Supabase is required before profile polish can sync.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-secondary flex items-center gap-2">
          <UserRound className="h-5 w-5 text-accent-primary" />
          Presence · Stewardship
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-accent-primary">Profile</h1>
        <p className="mt-4 max-w-2xl text-sm text-text-secondary">
          Mirrors your storefront identity everywhere — initials for artisans, initials for concierge.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[360px,minmax(0,1fr)]">
        <div className="flex flex-col rounded-3xl border border-border-forest bg-white p-10 text-center shadow-xl shadow-accent-primary/5">
          <div className="mx-auto mb-8 h-44 w-44 overflow-hidden rounded-[2rem] bg-bg-secondary shadow-inner shadow-accent-primary/5">
            {typeof avatarUrl === 'string' && avatarUrl ? (
              <img src={avatarUrl} alt="Portrait" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col justify-center px-8 text-accent-primary font-display text-6xl italic">
                {(firstName || user?.email)?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={avatarUploading || loading}
            onChange={onAvatarChosen}
          />
          <Button
            type="button"
            variant="outline"
            disabled={avatarUploading || loading}
            className="rounded-2xl"
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUploading ? 'Uploading…' : 'Upload avatar'}
          </Button>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary">
            Supabase storage bucket{' '}
            <span className="text-accent-primary">avatars</span> · public CDN
          </p>
        </div>

        <div className="space-y-8">
          <form
            className="space-y-6 rounded-3xl border border-border-forest bg-white p-10 shadow-xl shadow-accent-primary/5"
            onSubmit={saveProfileContact}
          >
            <h2 className="font-display text-3xl font-bold text-accent-primary">Contact shell</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <Input
                label="Phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input label="Email" type="email" value={user?.email ?? ''} disabled />
            </div>
            <p className="text-xs text-text-secondary">
              Email changes still route through Supabase Auth — contact support for assisted transfers.
            </p>
            <Button type="submit" disabled={savingProfile || loading} className="rounded-2xl">
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </form>

          <form
            className="space-y-6 rounded-3xl border border-border-forest bg-white p-10 shadow-xl shadow-accent-primary/5"
            onSubmit={submitPasswordChange}
          >
            <h2 className="font-display text-3xl font-bold text-accent-primary">Security lattice</h2>
            <Input
              type="password"
              label="New password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              label="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" variant="gold" disabled={passwordBusy} className="rounded-2xl">
              {passwordBusy ? 'Updating…' : 'Change password'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
