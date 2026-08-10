'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, ChevronDown, Package, AlertTriangle, RefreshCw, Download, Upload, SlidersHorizontal } from 'lucide-react';
import { getProductInventory } from '@/lib/actions/inventory';
import Link from 'next/link';

type ProductRow = {
  id: string; name: string; sku: string; barcode: string | null;
  stock: number; min_stock_level: number; stock_status: string;
  price: number; cost_price: number | null; is_active: boolean;
  categories?: { name: string } | null; brands?: { name: string } | null;
};

export default function ProductInventoryPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductInventory({ search, stock_status: stockFilter, page, page_size: pageSize });
      setProducts(res.products as any);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, stockFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Inventory</h1>
          <p className="text-sm text-slate-500">{total} products</p>
        </div>
        <Link href="/admin/inventory" className="px-4 py-2 text-sm font-bold text-[#1a4731] border border-[#1a4731]/20 rounded-xl hover:bg-[#f0fdf4]/30 transition-all">
          Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731]"
          />
        </div>
        <select
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        >
          <option value="">All Stock Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="pre_order">Pre Order</option>
          <option value="discontinued">Discontinued</option>
        </select>
        <button onClick={fetchProducts} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Min Level</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No products found</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 line-clamp-1">{p.name}</p>
                        {p.categories && <p className="text-[11px] text-slate-400">{p.categories.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`font-bold ${p.stock <= p.min_stock_level ? 'text-red-600' : 'text-slate-800'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{p.min_stock_level}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      p.stock_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                      p.stock_status === 'low_stock' ? 'bg-orange-100 text-orange-700' :
                      p.stock_status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {p.stock_status === 'low_stock' && <AlertTriangle className="w-3 h-3" />}
                      {p.stock_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-800">৳{p.price.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-slate-500">{p.cost_price ? `৳${p.cost_price.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
