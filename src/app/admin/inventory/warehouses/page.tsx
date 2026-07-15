'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Warehouse, MapPin, Phone, Mail, RefreshCw, Search, Package, Users, BarChart3, Building2 } from 'lucide-react';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/lib/actions/inventory';
import { toast } from 'sonner';
import Link from 'next/link';

type Warehouse = { id: string; name: string; slug: string; location: string | null; manager: string | null; phone: string | null; email: string | null; capacity: number | null; is_active: boolean; };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', location: '', manager: '', phone: '', email: '', capacity: '' });

  const fetch = async () => {
    setLoading(true);
    const data = await getWarehouses();
    setWarehouses(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => { setForm({ name: '', slug: '', location: '', manager: '', phone: '', email: '', capacity: '' }); setEditing(null); };

  const openEdit = (w: Warehouse) => {
    setForm({ name: w.name, slug: w.slug, location: w.location || '', manager: w.manager || '', phone: w.phone || '', email: w.email || '', capacity: w.capacity?.toString() || '' });
    setEditing(w); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug required'); return; }
    try {
      if (editing) {
        await updateWarehouse(editing.id, { ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined });
        toast.success('Warehouse updated');
      } else {
        await createWarehouse({ ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined });
        toast.success('Warehouse created');
      }
      setShowForm(false); resetForm(); fetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    try { await deleteWarehouse(id); toast.success('Deleted'); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const filtered = warehouses.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.location?.toLowerCase().includes(search.toLowerCase()) ||
    w.manager?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = warehouses.filter(w => w.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouses</h1>
          <p className="text-sm text-slate-500">{warehouses.length} total ({activeCount} active)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text" placeholder="Search by name, location, manager..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-lg">
          <h3 className="font-bold text-lg text-slate-800">{editing ? 'Edit' : 'New'} Warehouse</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Name *</label>
              <input placeholder="e.g. Main Warehouse" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Slug *</label>
              <input placeholder="main-warehouse" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Location</label>
              <input placeholder="City, Address" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Manager</label>
              <input placeholder="Full name" value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Phone</label>
              <input placeholder="+880..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Email</label>
              <input type="email" placeholder="manager@warehouse.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Max Capacity (units)</label>
              <input type="number" placeholder="10000" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="px-6 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a]">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2.5 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Warehouse Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Warehouse className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          {search ? 'No warehouses match your search' : 'No warehouses yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(w => (
            <Link key={w.id} href={`/admin/inventory/warehouses/${w.id}`} className="block bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-[#1a4731]/20 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#f0fdf4] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6 text-[#1a4731]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-[#1a4731]">{w.name}</h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.preventDefault()}>
                  <button onClick={e => { e.stopPropagation(); openEdit(w); }} className="p-2 rounded-lg hover:bg-slate-50"><Edit2 className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={e => { if (confirm('Delete this warehouse?')) { e.stopPropagation(); handleDelete(w.id); } }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 mb-4">
                {w.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {w.location}</p>}
                {w.manager && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" /> {w.manager}</p>}
                {w.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /> {w.phone}</p>}
                {w.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /> {w.email}</p>}
              </div>

              {w.capacity && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Capacity</span>
                    <span className="font-medium text-slate-600">{w.capacity.toLocaleString()} units max</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1a4731]/30 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
              )}

              <div className="mt-3 text-[11px] text-[#1a4731] font-bold group-hover:underline">
                View Details →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
