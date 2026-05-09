'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/Button';

export default function DashboardSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const raw = Boolean((user?.user_metadata as Record<string, unknown> | undefined)?.marketing_emails);
    setMarketing(raw);
  }, [user]);

  const persistMarketing = async () => {
    if (!supabase) return;
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { marketing_emails: marketing },
      });
      if (error) throw error;
      toast.success('Communication preferences synced');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Preference failed to persist');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      setSigningOut(true);
      await logout();
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-12 text-center text-sm shadow-xl shadow-accent-primary/5">
        Supabase is offline — revisit once environment keys load.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-border-forest bg-white p-10 shadow-xl shadow-accent-primary/5">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-secondary flex items-center gap-2">
          <Shield className="h-5 w-5 text-gold" /> Concierge safeguards
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-accent-primary">Settings</h1>
        <p className="mt-4 max-w-2xl text-sm text-text-secondary">
          Controls live inside Supabase Auth metadata — mirrored whenever you revisit this cockpit.
        </p>
      </header>

      <section className="rounded-3xl border border-border-forest bg-white p-10 shadow-xl shadow-accent-primary/5">
        <h2 className="font-display text-2xl font-bold text-accent-primary">Letters & luminaries</h2>
        <p className="mt-4 text-sm text-text-secondary">
          Allow handwritten marketing notes about limited drops — always revocable instantly.
        </p>

        <label className="mt-10 flex cursor-pointer flex-col rounded-3xl border border-border-forest bg-bg-secondary p-6 shadow-inner">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-accent-primary">Seasonal postcards</p>
              <p className="mt-3 text-xs text-text-secondary">
                Product stories, artisans Q&amp;A and early access previews.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-6 w-6 rounded-xl border-border-forest accent-accent-primary"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              aria-label="Toggle marketing consent"
            />
          </div>
        </label>

        <Button className="mt-8 rounded-2xl" type="button" disabled={saving} onClick={persistMarketing}>
          {saving ? 'Syncing…' : 'Save communication rules'}
        </Button>
      </section>

      <section className="rounded-3xl border border-red-300 bg-white p-10 shadow-xl shadow-accent-primary/5">
        <h2 className="font-display text-2xl font-bold text-accent-primary">Session closure</h2>
        <p className="mt-4 text-sm text-text-secondary">
          Signs this device out of Horof. Other tabs stay warm until refreshed.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button variant="danger" type="button" disabled={signingOut} onClick={() => handleLogout()}>
            {signingOut ? 'Signing out…' : 'Log out everywhere on this browser'}
          </Button>
          <Link href="/">
            <Button variant="outline" type="button" className="rounded-2xl">
              Return storefront
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
