'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, MapPin, Phone, Mail, RefreshCw, Search, Users, Building2, X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, createWarehouseWithStaff, createWarehouseStaff } from '@/lib/actions/inventory';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

type WarehouseType = { id: string; name: string; slug: string; location: string | null; manager: string | null; phone: string | null; email: string | null; capacity: number | null; is_active: boolean; };

export default function WarehousesPage() {
  const supabase = createSupabaseBrowserClient();
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WarehouseType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: '', slug: '', location: '', manager: '', phone: '', email: '', capacity: '' });
  const [addStaff, setAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    const data = await getWarehouses();
    setWarehouses(data);

    // Use the staff_count column from warehouses table (auto-maintained by trigger)
    if (data.length > 0) {
      const counts: Record<string, number> = {};
      for (const w of data) {
        if ((w as any).staff_count > 0) {
          counts[w.id] = (w as any).staff_count;
        }
      }
      setStaffCounts(counts);
    }

    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  // The staff phone number automatically becomes their login password
  useEffect(() => {
    if (staffForm.phone.trim()) {
      setStaffForm(prev => ({ ...prev, password: staffForm.phone.trim() }));
    }
  }, [staffForm.phone]);

  const resetForm = () => { setForm({ name: '', slug: '', location: '', manager: '', phone: '', email: '', capacity: '' }); setEditing(null); setAddStaff(false); setStaffForm({ name: '', email: '', password: '', phone: '' }); };

  const openEdit = (w: WarehouseType) => {
    setForm({ name: w.name, slug: w.slug, location: w.location || '', manager: w.manager || '', phone: w.phone || '', email: w.email || '', capacity: w.capacity?.toString() || '' });
    setEditing(w); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug required'); return; }
    if (addStaff && (!staffForm.name || !staffForm.email || !staffForm.phone)) { toast.error('Staff name, email and phone number required'); return; }
    if (addStaff && staffForm.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(staffForm.email.trim())) { toast.error('Please enter a valid staff email address'); return; }
    if (addStaff && staffForm.phone && !/^[0-9+()\-\s]{6,20}$/.test(staffForm.phone.trim())) { toast.error('Phone must be 6–20 digits (digits, +, -, spaces, parentheses)'); return; }
    if (addStaff && (staffForm.password || staffForm.phone).trim().length < 6) { toast.error('Phone number must be at least 6 characters to use as the staff login password'); return; }
    if (addStaff && (staffForm.password || staffForm.phone).trim().length > 72) { toast.error('Password must be at most 72 characters (bcrypt limit)'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateWarehouse(editing.id, { ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined });
        toast.success('Warehouse updated');
      } else {
        // Use atomic creation to ensure warehouse + staff are created together or rolled back
        const result = await createWarehouseWithStaff({
          warehouse: { ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined },
          staff: addStaff && staffForm.name && staffForm.email ? {
            email: staffForm.email,
            password: staffForm.password || staffForm.phone,
            full_name: staffForm.name,
            phone: staffForm.phone || undefined,
          } : undefined,
        });
        
        if (result.staffCreated) {
          toast.success('Warehouse and staff account created successfully!');
        } else {
          toast.success('Warehouse created successfully!');
        }
      }
      setShowForm(false); resetForm();
      setRefreshKey(k => k + 1);
    } catch (e: any) { 
      console.error('[WAREHOUSE_SAVE] Error:', e);
      toast.error(e?.message || e?.error || 'Failed to create warehouse. Please try again.'); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await deleteWarehouse(confirmDelete.id);
      toast.success('Warehouse deleted');
      setConfirmDelete(null);
      setRefreshKey(k => k + 1);
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(null); }
  };

  const handleToggleActive = async (w: WarehouseType) => {
    try {
      await updateWarehouse(w.id, { is_active: !w.is_active });
      toast.success(w.is_active ? 'Warehouse deactivated' : 'Warehouse activated');
      setRefreshKey(k => k + 1);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = warehouses.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.location?.toLowerCase().includes(search.toLowerCase()) ||
    w.manager?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = warehouses.filter(w => w.is_active).length;

  return (
    <div className="space-y-6 max-w-7xl pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Warehouses</h1>
          <p className="text-slate-500 mt-1">{warehouses.length} total ({activeCount} active)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] flex items-center gap-2 shadow-lg shadow-[#1a4731]/20 transition-all">
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search by name, location, manager..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800">{editing ? 'Edit' : 'New'} Warehouse</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Name *</label>
              <input placeholder="e.g. Main Warehouse" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Slug *</label>
              <input placeholder="main-warehouse" value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Location</label>
              <input placeholder="City, Address" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Manager</label>
              <input placeholder="Full name" value={form.manager}
                onChange={e => setForm({ ...form, manager: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Phone</label>
              <input placeholder="+880..." value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Email</label>
              <input type="email" placeholder="manager@warehouse.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Max Capacity (units)</label>
              <input type="number" placeholder="10000" value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
          </div>

          {!editing && (
            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={addStaff}
                  onChange={e => setAddStaff(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1a4731] focus:ring-[#1a4731]" />
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#1a4731]" />
                  <div>
                    <span className="text-sm font-bold text-slate-700">Create Warehouse Staff</span>
                    <span className="block text-[11px] text-slate-400">Add a staff member who can manage this warehouse</span>
                  </div>
                </div>
              </label>

              {addStaff && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Staff Name *</label>
                    <input placeholder="Full name" value={staffForm.name}
                      onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-blue-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Staff Email *</label>
                    <input type="email" placeholder="staff@email.com" value={staffForm.email}
                      onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-blue-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Password (auto from phone)</label>
                    <div className="relative">
                      <input type={showStaffPassword ? 'text' : 'password'} placeholder="Auto-set from phone number" value={staffForm.password}
                        onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                        className="w-full px-3 py-2.5 pr-10 border border-blue-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                      <button type="button" onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Phone * (login password)</label>
                    <input type="tel" required placeholder="01XXXXXXXXX" value={staffForm.phone}
                      onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-blue-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
                    <p className="text-[10px] text-blue-600 mt-1">This number automatically becomes the staff&apos;s login password.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="px-6 py-2.5 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <div className="h-6 w-6 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin" />
          Loading warehouses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{search ? 'No warehouses match your search' : 'No warehouses yet'}</p>
          {!search && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create First Warehouse
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(w => (
            <div key={w.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-[#1a4731]/20 transition-all group">
              <Link href={`/admin/inventory/warehouses/${w.id}`} className="block">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#f0fdf4] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6 text-[#1a4731]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-[#1a4731] transition-colors">{w.name}</h3>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {w.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 mb-4">
                  {w.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {w.location}</p>}
                  {w.manager && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 shrink-0" /> {w.manager}</p>}
                  {w.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /> {w.phone}</p>}
                  {w.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /> {w.email}</p>}
                </div>

                <div className="flex items-center gap-4 text-xs mb-3">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-medium text-slate-700">{staffCounts[w.id] || 0}</span> staff
                  </span>
                  {w.capacity && (
                    <span className="text-slate-400">{w.capacity.toLocaleString()} units max</span>
                  )}
                </div>

                {w.capacity && (
                  <div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a4731]/30 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                )}

                <div className="mt-3 text-[11px] text-[#1a4731] font-bold group-hover:underline">
                  View Details
                </div>
              </Link>

              <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                <button onClick={(e) => { e.stopPropagation(); openEdit(w); }}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(w); }}
                  className="flex-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 p-8 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 text-center">Delete Warehouse?</h3>
            <p className="text-sm text-slate-500 text-center">
              This will permanently delete <strong>{confirmDelete.name}</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={!!deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
