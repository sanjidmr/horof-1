'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, XCircle, Loader2, Mail, Phone, Trash2, Search, User, Eye, EyeOff, Shield } from 'lucide-react';
import { getWarehouseStaff, getUnassignedStaff, assignStaffToWarehouse, removeStaffFromWarehouse, createWarehouseStaff } from '@/lib/actions/inventory';
import toast from 'react-hot-toast';

type StaffMember = { id: string; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; created_at: string };
type UnassignedUser = { id: string; full_name: string | null; email: string | null; phone: string | null };

export default function WarehouseStaffManager({ warehouseId, warehouseName }: { warehouseId: string; warehouseName: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, unassignedData] = await Promise.all([
        getWarehouseStaff(warehouseId),
        getUnassignedStaff(),
      ]);
      setStaff(staffData);
      setUnassigned(unassignedData);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // The staff phone number automatically becomes their login password
  useEffect(() => {
    if (newPhone.trim()) {
      setNewPassword(newPhone.trim());
    }
  }, [newPhone]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) {
      toast.error('Please fill in the staff name, email and phone number');
      return;
    }
    const autoPassword = newPhone.trim();
    if (autoPassword.length < 6) {
      toast.error('Phone number must be at least 6 characters to use as password');
      return;
    }

    setCreating(true);
    try {
      await createWarehouseStaff({
        email: newEmail.trim(),
        password: autoPassword,
        full_name: newName.trim(),
        phone: autoPassword,
        warehouseId,
      });
      toast.success(`Staff account created! ${newEmail.trim()} can now log in using their phone number (${autoPassword}) as the password.`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setShowCreate(false);
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigning(userId);
    try {
      await assignStaffToWarehouse(userId, warehouseId);
      toast.success('Staff assigned');
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAssigning(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await removeStaffFromWarehouse(userId);
      toast.success('Staff removed');
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemoving(null);
    }
  };

  const filteredUnassigned = unassigned.filter(u =>
    !search || (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1a4731]" /> Assigned Staff ({staff.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCreate(!showCreate); setShowAdd(false); setSearch(''); }}
            className="px-4 py-2 bg-[#2D6A4F] text-white text-xs font-bold rounded-xl hover:bg-[#1B4332] flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Create Staff Account
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowCreate(false); setSearch(''); }}
            className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <User className="w-3.5 h-3.5" /> Assign Existing User
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="px-6 py-5 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#1a4731] rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Create New Warehouse Staff</h3>
              <p className="text-[11px] text-slate-500">This will create a login account. They can only access the warehouse dashboard.</p>
            </div>
          </div>
          <form onSubmit={handleCreateStaff} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Full Name *</label>
                <input
                  type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Rahim Uddin"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                <input
                  type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="Auto-set from phone number"
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">Automatically set from the phone number below. You can change it if needed.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone *</label>
                <input
                  type="tel" required value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
                />
                <p className="text-[10px] text-slate-400 mt-1">This number will be the staff&apos;s login password.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit" disabled={creating}
                className="px-5 py-2 bg-[#1a4731] text-white text-xs font-bold rounded-lg hover:bg-[#14402a] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {creating ? 'Creating...' : 'Create & Assign'}
              </button>
              <button
                type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showAdd && (
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search users to assign..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
            />
          </div>
          {filteredUnassigned.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No unassigned users available</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredUnassigned.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {(u.full_name || u.email || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || 'Unnamed'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(u.id)}
                    disabled={assigning === u.id}
                    className="px-3 py-1.5 bg-[#1a4731] text-white text-xs font-bold rounded-lg hover:bg-[#14402a] disabled:opacity-50 flex items-center gap-1 shrink-0 ml-3"
                  >
                    {assigning === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading staff...
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            <p className="text-sm text-slate-400">No staff assigned to this warehouse yet</p>
            <p className="text-xs text-slate-300 mt-1">Click &quot;Create Staff Account&quot; to add a new team member</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1a4731]/10 flex items-center justify-center text-sm font-bold text-[#1a4731] shrink-0">
                    {(s.full_name || s.email || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.full_name || 'Unnamed'}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(s.id)}
                  disabled={removing === s.id}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0 ml-3"
                  title="Remove from warehouse"
                >
                  {removing === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
