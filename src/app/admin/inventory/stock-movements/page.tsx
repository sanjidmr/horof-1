'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Package, ArrowUpDown, Search } from 'lucide-react';
import { getStockMovements } from '@/lib/actions/inventory';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = async (productId?: string) => {
    setLoading(true);
    const data = await getStockMovements({ product_id: productId || undefined, limit: 100 });
    setMovements(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const movementColors: Record<string, string> = {
    stock_added: 'bg-emerald-100 text-emerald-700',
    stock_removed: 'bg-red-100 text-red-700',
    sale: 'bg-blue-100 text-blue-700',
    return: 'bg-green-100 text-green-700',
    adjustment: 'bg-amber-100 text-amber-700',
    damage: 'bg-red-100 text-red-700',
    lost: 'bg-slate-100 text-slate-700',
    transfer_out: 'bg-purple-100 text-purple-700',
    transfer_in: 'bg-indigo-100 text-indigo-700',
    purchase: 'bg-cyan-100 text-cyan-700',
    manual_update: 'bg-slate-100 text-slate-700',
  };

  const filtered = search
    ? movements.filter(m =>
        m.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.products?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        m.movement_type?.toLowerCase().includes(search.toLowerCase())
      )
    : movements;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movements</h1>
          <p className="text-sm text-slate-500">Complete inventory activity log</p>
        </div>
        <button onClick={() => fetch()} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by product, SKU, type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Date & Time</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Product</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Change</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Before</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">After</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No movements recorded</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-800 text-xs line-clamp-1">{m.products?.name || 'Unknown'}</p>
                        {m.products?.sku && <p className="text-[10px] text-slate-400 font-mono">{m.products.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${movementColors[m.movement_type] || 'bg-slate-100 text-slate-600'}`}>
                      {m.movement_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`font-bold text-sm ${m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{m.stock_before}</td>
                  <td className="px-4 py-3.5 text-center font-medium text-slate-800">{m.stock_after}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {m.reference_type ? `${m.reference_type}:${m.reference_id ? m.reference_id.substring(0, 8) : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 max-w-[200px] truncate">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
