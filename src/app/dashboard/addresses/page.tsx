'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, PlusCircle, Star } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { DbAddressRow } from '../../../lib/dashboard/types';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input, TextArea } from '../../../components/ui/Input';
import { cn } from '../../../lib/utils';

type FormState = {
  name: string;
  phone: string;
  city: string;
  address: string;
};

const emptyForm: FormState = { name: '', phone: '', city: '', address: '' };

export default function DashboardAddressesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rows, setRows] = useState<DbAddressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as DbAddressRow[]);
    } catch {
      setRows([]);
      toast.error('Unable to fetch addresses.');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const persist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !user) return;

    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        user_id: user.id,
        is_default: rows.length === 0,
      };

      if (!payload.name || !payload.phone || !payload.city || !payload.address) {
        toast.error('All address fields are required.');
        setSubmitting(false);
        return;
      }

      if (editingId) {
        const { error } = await supabase.from('addresses').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Address updated');
      } else {
        const { error } = await supabase.from('addresses').insert([payload]);
        if (error) throw error;
        toast.success('Address added');
      }

      resetForm();
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save address';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (row: DbAddressRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone,
      city: row.city,
      address: row.address,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Remove this saved address permanently?')) return;

    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', user?.id ?? '');
      if (error) throw error;
      toast.success('Address removed');
      if (editingId === id) resetForm();
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const makeDefault = async (id: string) => {
    if (!supabase || !user) return;

    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', user.id);

      if (error) throw error;
      toast.success('Default shipping label updated');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not assign default address');
    }
  };

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-border-forest bg-white p-10 text-center text-sm shadow-xl shadow-accent-primary/5">
        Supabase is not configured yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[440px,minmax(0,1fr)]">
      <div className="h-fit rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
        <div className="mb-8 flex items-center gap-3 text-accent-primary">
          <PlusCircle className="h-5 w-5 text-gold" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary">
              {editingId ? 'Refine shipment node' : 'New delivery waypoint'}
            </p>
            <h1 className="font-display text-3xl font-bold">
              {editingId ? 'Edit address' : 'Add address'}
            </h1>
          </div>
        </div>

        <form className="space-y-6" onSubmit={persist}>
          <Input label="Recipient name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} required />
          <Input label="City" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} required />
          <TextArea label="Street & details" rows={4} required value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting} className="flex-1 rounded-2xl">
              {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" disabled={submitting} onClick={resetForm} className="rounded-2xl">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-border-forest bg-white p-8 shadow-xl shadow-accent-primary/5">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-primary" /> Network
              </p>
              <h2 className="font-display text-3xl font-bold text-accent-primary">
                Deliveries map
              </h2>
            </div>
          </header>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-3xl bg-bg-secondary" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-3xl bg-bg-secondary p-10 text-center text-sm font-medium text-text-secondary">
              Addresses make checkout frictionless — anchor your showroom finds with a courier-friendly stop.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((addr) => (
                <article
                  key={addr.id}
                  className={cn(
                    'rounded-3xl border border-border-forest bg-bg-secondary p-7 shadow-inner transition-all hover:border-accent-primary',
                    addr.is_default && 'border-accent-primary bg-white shadow-lg shadow-accent-primary/10'
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-semibold text-accent-primary">{addr.name}</h3>
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30">
                            <Star className="h-3 w-3" /> Default
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-text-secondary">{addr.phone}</p>
                      <p className="mt-4 text-sm text-text-secondary">
                        <span className="font-semibold text-accent-primary">{addr.city}</span>
                        {' · '} {addr.address}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl" type="button" onClick={() => startEdit(addr)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" className="rounded-xl" type="button" onClick={() => remove(addr.id)}>
                        Delete
                      </Button>
                      {!addr.is_default && (
                        <Button variant="gold" size="sm" className="rounded-xl" type="button" onClick={() => makeDefault(addr.id)}>
                          Default
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
