'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, Package, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';
import { formatPrice, cn } from '@/lib/utils';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('Failed to load products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
      fetchProducts();
    }
  };

  const toggleStatus = async (product: any) => {
    const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(product.is_active ? 'Product deactivated' : 'Product activated');
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Products Catalog</h1>
          <p className="text-slate-500">Manage your inventory and stock levels.</p>
        </div>
        <Button asChild className="bg-[#1B4332] text-white hover:bg-[#2D6A4F]">
          <Link href="/admin/products/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2D6A4F]" />
            <input 
              placeholder="Search by name or category..." 
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading catalog...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No products found.</td></tr>
              ) : (
                products.map((p) => {
                  const cat = p.categories?.name ?? 'Uncategorized';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {p.images && p.images.length > 0 ? (
                              <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cat}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{formatPrice(Number(p.price))}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                          p.stock <= 5 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {p.stock} Units
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleStatus(p)} className="flex items-center gap-1">
                          {p.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E6F0EB] text-[#1B4332] text-xs font-bold"><CheckCircle className="h-3 w-3" /> Active</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-bold"><XCircle className="h-3 w-3" /> Inactive</span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-slate-100" title="Manage Pricing & Options">
                            <Link href={`/admin/products/${p.id}/pricing`}>
                              <DollarSign className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[#2D6A4F] hover:bg-slate-100" title="Edit Product">
                            <Link href={`/admin/products/${p.id}/edit`}>
                              <Edit3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" title="Delete Product">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
