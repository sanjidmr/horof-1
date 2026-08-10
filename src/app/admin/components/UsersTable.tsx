'use client';

import React, { useState } from 'react';
import { Search, MoreVertical, Shield, User, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface UsersTableProps {
  users: any[];
  onRefresh: () => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createSupabaseBrowserClient();

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      onRefresh();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0B3D2E]/20"
    >
      <div className="p-8 border-b border-[#22C55E]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#071A12]/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A7F3D0]" />
          <input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-[#071A12] border border-[#22C55E]/20 rounded-2xl pl-12 pr-4 text-sm text-[#ECFDF5] outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/50 transition-all placeholder:text-[#A7F3D0]/50"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#14532D]/50 rounded-xl border border-[#22C55E]/20">
          <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-[10px] text-[#A7F3D0] font-bold uppercase tracking-widest">
            {filteredUsers.length} Users Active
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#071A12] text-[10px] font-bold text-[#A7F3D0] uppercase tracking-[0.2em]">
              <th className="px-8 py-6">User</th>
              <th className="px-8 py-6">Role</th>
              <th className="px-8 py-6">Joined Date</th>
              <th className="px-8 py-6">Status</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22C55E]/10">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-[#14532D]/20 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-[#0B3D2E] border border-[#22C55E]/20 flex items-center justify-center font-bold text-xs text-[#22C55E] shadow-inner">
                      {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#ECFDF5] group-hover:text-[#22C55E] transition-colors">{u.full_name || 'No Name'}</p>
                      <p className="text-xs text-[#A7F3D0]/70 font-light">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    u.role === 'admin' 
                      ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20" 
                      : "bg-[#071A12] text-[#A7F3D0] border-[#A7F3D0]/20"
                  )}>
                    {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-6 text-xs text-[#A7F3D0]">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-[#A7F3D0]/50" />
                    {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/5 border border-[#22C55E]/10 w-fit">
                    <CheckCircle className="h-3 w-3 text-[#22C55E]" />
                    <span className="text-[10px] font-bold text-[#ECFDF5] uppercase tracking-widest">Active</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={() => handleRoleToggle(u.id, u.role)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                        u.role === 'admin' 
                          ? "border-red-500/30 text-red-400 hover:bg-red-500/10" 
                          : "border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/10"
                      )}
                    >
                      {u.role === 'admin' ? 'Demote' : 'Promote'}
                    </button>
                    <button className="h-10 w-10 rounded-xl hover:bg-[#14532D] hover:text-[#ECFDF5] text-[#A7F3D0] border border-transparent hover:border-[#22C55E]/20 flex items-center justify-center transition-all shadow-sm">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
