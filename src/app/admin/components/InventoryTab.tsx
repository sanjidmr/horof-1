'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, ArrowDownRight, Package, Box } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const InventoryTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, category')
        .order('stock', { ascending: true });
        
      if (!error && data) {
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);
  const healthy = products.filter(p => p.stock > 5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Inventory Control</h2>
          <p className="text-[#A7F3D0] text-sm">Monitor stock levels and warehouse distribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0F241C] border border-red-500/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-red-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="h-10 w-10 bg-[#071A12] border border-red-500/30 rounded-xl flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#ECFDF5]">{outOfStock.length}</h3>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Out of Stock</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#0F241C] border border-amber-500/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="h-10 w-10 bg-[#071A12] border border-amber-500/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#ECFDF5]">{lowStock.length}</h3>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Low Stock (≤5)</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0F241C] border border-[#22C55E]/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#22C55E]/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-[#22C55E]/20 transition-all" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="h-10 w-10 bg-[#071A12] border border-[#22C55E]/30 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#ECFDF5]">{healthy.length}</h3>
              <p className="text-[10px] text-[#22C55E] font-bold uppercase tracking-widest">Healthy Stock</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#22C55E]/15">
          <h3 className="text-lg font-bold text-[#ECFDF5]">Stock Deficits</h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#071A12] text-[10px] font-bold text-[#A7F3D0] uppercase tracking-[0.2em]">
              <th className="px-8 py-5">Product</th>
              <th className="px-8 py-5">Category</th>
              <th className="px-8 py-5">Current Stock</th>
              <th className="px-8 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22C55E]/10">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-[#A7F3D0]">Loading...</td></tr>
            ) : [...outOfStock, ...lowStock].length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-[#A7F3D0]">All inventory is healthy.</td></tr>
            ) : (
              [...outOfStock, ...lowStock].map(p => (
                <tr key={p.id} className="hover:bg-[#14532D]/20 transition-colors">
                  <td className="px-8 py-4 font-bold text-[#ECFDF5]">{p.name}</td>
                  <td className="px-8 py-4 text-xs text-[#A7F3D0]">{p.category || 'Uncategorized'}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${p.stock === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {p.stock} Units
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button className="px-4 py-2 bg-[#22C55E] text-[#071A12] rounded-xl text-[10px] font-bold uppercase tracking-widest">
                      Restock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
import { XCircle } from 'lucide-react';
