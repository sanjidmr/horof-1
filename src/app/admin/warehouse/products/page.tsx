'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, Package, RefreshCw, Warehouse, CheckCircle2, AlertTriangle,
  XCircle, ChevronDown, Save, X, Edit3, ArrowUpDown, Eye, EyeOff
} from 'lucide-react';
import {
  getWarehouseProducts, warehouseUpdateStock, warehouseAssignProduct,
  warehouseUpdateProduct, getAllActiveWarehouses
} from '@/lib/actions/inventory';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useWarehouseProductsRealtime } from '@/hooks/useWarehouseRealtime';

type Product = {
  id: string; name: string; sku: string; slug: string;
  price: number; stock: number; reserved_stock: number | null;
  min_stock_level: number | null; stock_status: string;
  is_active: boolean; default_warehouse_id: string | null;
  image: string | null; cost_price: number | null;
  categories?: { name: string }[] | { name: string } | null;
  brands?: { name: string }[] | { name: string } | null;
};

type WarehouseOption = { id: string; name: string };

export default function WarehouseProductsPage() {
  const { user, isWarehouseStaff, isAdmin, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editWarehouse, setEditWarehouse] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchProfile = useCallback(async () => {
    const sb = createSupabaseBrowserClient();
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) return;
    const { data: profile } = await sb
      .from('profiles')
      .select('assigned_warehouse_id, role')
      .eq('id', u.id).single();
    if (profile?.assigned_warehouse_id) {
      setWarehouseId(profile.assigned_warehouse_id);
      return;
    }
    // Admins without an assigned warehouse: default to the first active warehouse
    const adminRole = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'manager' || profile?.role === 'staff';
    if (adminRole) {
      const whs = await getAllActiveWarehouses();
      setWarehouses(whs as WarehouseOption[]);
      if (whs && whs.length > 0) setWarehouseId(whs[0].id);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const [prods, whs] = await Promise.all([
        getWarehouseProducts(warehouseId),
        getAllActiveWarehouses(),
      ]);
      setProducts(prods as unknown as Product[]);
      setWarehouses(whs as WarehouseOption[]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (warehouseId) fetchProducts(); }, [warehouseId, fetchProducts]);

  useWarehouseProductsRealtime(createSupabaseBrowserClient(), warehouseId, fetchProducts);

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditStock(p.stock);
    setEditPrice(p.price);
    setEditWarehouse(p.default_warehouse_id || '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (p: Product) => {
    setSaving(true);
    try {
      if (editStock !== p.stock) {
        await warehouseUpdateStock(p.id, editStock, `Stock updated by warehouse staff`);
      }
      if (editPrice !== p.price || editWarehouse !== (p.default_warehouse_id || '')) {
        const updates: any = {};
        if (editPrice !== p.price) updates.price = editPrice;
        if (editWarehouse !== (p.default_warehouse_id || '')) {
          await warehouseAssignProduct(p.id, editWarehouse || null);
        }
        if (Object.keys(updates).length > 0) {
          await warehouseUpdateProduct(p.id, updates);
        }
      }
      toast.success('Product updated');
      setEditingId(null);
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await warehouseUpdateProduct(p.id, { is_active: !p.is_active });
      toast.success(p.is_active ? 'Product deactivated' : 'Product activated');
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const filtered = products
    .filter(p => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.sku || '').toLowerCase().includes(q)) return false;
      }
      if (stockFilter === 'in_stock' && p.stock <= (p.min_stock_level || 0)) return false;
      if (stockFilter === 'low_stock' && p.stock > (p.min_stock_level || 0)) return false;
      if (stockFilter === 'out_of_stock' && p.stock > 0) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'stock') return dir * ((a.stock || 0) - (b.stock || 0));
      if (sortBy === 'price') return dir * ((a.price || 0) - (b.price || 0));
      return 0;
    });

  const stats = {
    total: products.length,
    assigned: products.filter(p => p.default_warehouse_id === warehouseId).length,
    lowStock: products.filter(p => p.stock <= (p.min_stock_level || 0) && p.stock > 0).length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

  if (!warehouseId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Warehouse className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-bold text-slate-600">No Warehouse Assigned</p>
        <p className="text-sm mt-1">Contact an admin to assign you to a warehouse</p>
      </div>
    );
  }

  if (!warehouseId && isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Warehouse className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-bold text-slate-600">No Warehouses Found</p>
        <p className="text-sm mt-1">Create a warehouse before managing products</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Warehouse Products</h1>
          <p className="text-sm text-slate-500">Manage products assigned to your warehouse</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select
              value={warehouseId || ''}
              onChange={(e) => setWarehouseId(e.target.value || null)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
            >
              {warehouses.length === 0 && <option value="">Loading…</option>}
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#1a4731] border border-[#1a4731]/20 rounded-xl hover:bg-[#f0fdf4] transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: stats.total, icon: Package, color: 'text-slate-600' },
          { label: 'Assigned', value: stats.assigned, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: XCircle, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        >
          <option value="">All Products</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700" onClick={() => { setSortBy('stock'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                  <span className="inline-flex items-center gap-1">Stock <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700" onClick={() => { setSortBy('price'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                  <span className="inline-flex items-center gap-1">Price <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Warehouse</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Active</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No products found</td></tr>
              ) : filtered.map(p => {
                const isEditing = editingId === p.id;
                const isAssignedHere = p.default_warehouse_id === warehouseId;
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${!isAssignedHere ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 text-xs">{p.name}</p>
                          <p className="text-[11px] text-slate-400">{Array.isArray(p.categories) ? p.categories[0]?.name : (p.categories as any)?.name || 'No category'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.sku || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input type="number" value={editStock || ''} onChange={e => setEditStock(Number(e.target.value))}
                          className="w-20 text-center px-2 py-1 border border-[#1a4731]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
                      ) : (
                        <span className={`text-xs font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= (p.min_stock_level || 0) ? 'text-orange-600' : 'text-slate-700'}`}>
                          {p.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.stock_status === 'in_stock' ? 'bg-emerald-50 text-emerald-700' :
                        p.stock_status === 'low_stock' ? 'bg-orange-50 text-orange-700' :
                        p.stock_status === 'out_of_stock' ? 'bg-red-50 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {(p.stock_status || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <input type="number" value={editPrice || ''} onChange={e => setEditPrice(Number(e.target.value))}
                          className="w-24 text-right px-2 py-1 border border-[#1a4731]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">৳{p.price.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select value={editWarehouse} onChange={e => setEditWarehouse(e.target.value)}
                          className="px-2 py-1 border border-[#1a4731]/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 max-w-[150px]">
                          <option value="">Unassigned</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs ${isAssignedHere ? 'text-emerald-600 font-medium' : p.default_warehouse_id ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                          {isAssignedHere ? 'This Warehouse' : p.default_warehouse_id ? warehouses.find(w => w.id === p.default_warehouse_id)?.name || 'Assigned' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)} className={`p-1 rounded-lg transition-colors ${p.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                        {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveEdit(p)} disabled={saving}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-[#1a4731] hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
