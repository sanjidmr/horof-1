'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Building2, MapPin, Phone, Mail, RefreshCw } from 'lucide-react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/lib/actions/inventory';
import { toast } from 'sonner';

type Supplier = { id: string; name: string; slug: string; contact_person: string | null; email: string | null; phone: string | null; address: string | null; city: string | null; country: string; payment_terms: string | null; tax_id: string | null; notes: string | null; is_active: boolean; };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', contact_person: '', email: '', phone: '', address: '', city: '', country: 'Bangladesh', payment_terms: '', tax_id: '', notes: '' });

  const fetch = async () => {
    setLoading(true);
    const data = await getSuppliers();
    setSuppliers(data);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const resetForm = () => { setForm({ name: '', slug: '', contact_person: '', email: '', phone: '', address: '', city: '', country: 'Bangladesh', payment_terms: '', tax_id: '', notes: '' }); setEditing(null); };

  const openEdit = (s: Supplier) => {
    setForm({ name: s.name, slug: s.slug, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', city: s.city || '', country: s.country, payment_terms: s.payment_terms || '', tax_id: s.tax_id || '', notes: s.notes || '' });
    setEditing(s); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug required'); return; }
    try {
      if (editing) { await updateSupplier(editing.id, form); toast.success('Supplier updated'); }
      else { await createSupplier(form); toast.success('Supplier created'); }
      setShowForm(false); resetForm(); fetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await deleteSupplier(id); toast.success('Deleted'); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-sm text-slate-500">{suppliers.length} suppliers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-bold text-slate-800">{editing ? 'Edit' : 'New'} Supplier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            <input placeholder="Slug *" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Contact Person" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Payment Terms" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Tax ID" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" rows={3} />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a]">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-slate-400 col-span-full text-center py-12">Loading...</p> :
         suppliers.length === 0 ? <p className="text-slate-400 col-span-full text-center py-12">No suppliers yet</p> :
         suppliers.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{s.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-slate-50"><Edit2 className="w-4 h-4 text-slate-400" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-slate-500">
              {s.contact_person && <p><span className="font-medium">Contact:</span> {s.contact_person}</p>}
              {s.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {s.email}</p>}
              {s.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {s.phone}</p>}
              {(s.city || s.country) && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {[s.city, s.country].filter(Boolean).join(', ')}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
