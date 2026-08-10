'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Edit3, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn, formatPrice } from '@/lib/utils';
import { extractProductImages } from '@/lib/store/extract-images';

export const ProductsTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(url,sort_order)')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setProducts(data.map((p: any) => ({
          ...p,
          images: extractProductImages(p.product_images),
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-[#ECFDF5]">Inventory Catalog</h2>
          <p className="text-[#A7F3D0] text-sm">Manage products, pricing, and stock levels</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 rounded-xl bg-[#22C55E] text-[#071A12] font-bold text-xs uppercase tracking-widest hover:bg-[#22C55E]/90 transition-colors shadow-lg shadow-[#22C55E]/20 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-[#0F241C] border border-[#22C55E]/15 rounded-[2rem] overflow-hidden shadow-2xl shadow-[#0B3D2E]/20 p-8">
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A7F3D0]" />
          <input
            placeholder="Search catalog..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-[#071A12] border border-[#22C55E]/20 rounded-2xl pl-12 pr-4 text-sm text-[#ECFDF5] outline-none focus:border-[#22C55E] transition-all placeholder:text-[#A7F3D0]/50"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#A7F3D0]">Loading catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[#A7F3D0]">No products found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-[#071A12] border border-[#22C55E]/10 rounded-2xl overflow-hidden group hover:border-[#22C55E]/30 transition-all shadow-lg">
                <div className="aspect-square bg-[#0F241C] relative flex items-center justify-center overflow-hidden">
                  {p.images && p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-[#14532D]" />
                  )}
                  {p.stock <= 5 && (
                    <div className="absolute top-4 left-4 bg-red-500/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                      <AlertTriangle className="h-3 w-3" />
                      Low Stock: {p.stock}
                    </div>
                  )}
                  
                  <div className="absolute inset-x-4 bottom-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    <button className="flex-1 bg-[#22C55E] text-[#071A12] py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-1">
                      <Edit3 className="h-3 w-3" /> Edit
                    </button>
                    <button className="w-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-[#ECFDF5] truncate">{p.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="font-display font-bold text-[#22C55E] text-lg">{formatPrice(p.price)}</p>
                    <span className="text-[10px] text-[#A7F3D0] uppercase tracking-widest">Stock: {p.stock || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
