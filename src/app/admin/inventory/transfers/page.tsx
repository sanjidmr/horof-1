'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, ArrowRightLeft, CheckCircle, XCircle, Truck } from 'lucide-react';
import { getStockTransfers, createStockTransfer, completeStockTransfer, updateTransferStatus, getWarehouses } from '@/lib/actions/inventory';
import { toast } from 'sonner';

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', variant_id: '', quantity: 1, from_warehouse_id: '', to_warehouse_id: '', notes: '' });

  const fetch = async () => {
    setLoading(true);
    const [tData, wData] = await Promise.all([getStockTransfers(), getWarehouses()]);
    setTransfers(tData as any);
    setWarehouses(wData);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!form.product_id || !form.from_warehouse_id || !form.to_warehouse_id) { toast.error('Fill required fields'); return; }
    try {
      await createStockTransfer(form);
      toast.success('Transfer created');
      setShowForm(false);
      setForm({ product_id: '', variant_id: '', quantity: 1, from_warehouse_id: '', to_warehouse_id: '', notes: '' });
      fetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleComplete = async (id: string) => {
    try { await completeStockTransfer(id); toast.success('Transfer completed, stock updated'); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleStatus = async (id: string, status: string) => {
    try { await updateTransferStatus(id, status); toast.success(`Status: ${status}`); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_transit: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Transfers</h1>
          <p className="text-sm text-slate-500">Move stock between warehouses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Transfer
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-bold text-slate-800">New Stock Transfer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Product ID *" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input placeholder="Variant ID (optional)" value={form.variant_id} onChange={e => setForm({ ...form, variant_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <input type="number" placeholder="Quantity *" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
            <select value={form.from_warehouse_id} onChange={e => setForm({ ...form, from_warehouse_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
              <option value="">From Warehouse *</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select value={form.to_warehouse_id} onChange={e => setForm({ ...form, to_warehouse_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
              <option value="">To Warehouse *</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a]">Create Transfer</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Transfer #</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Product</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Qty</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">From</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">To</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr> :
               transfers.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No transfers</td></tr> :
               transfers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">{t.transfer_number}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800 text-xs">{t.products?.name || 'Unknown'}</p>
                    {t.products?.sku && <p className="text-[10px] text-slate-400">{t.products.sku}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800">{t.quantity}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.from_warehouse?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{t.to_warehouse?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyles[t.status] || ''}`}>{t.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {t.status === 'pending' && (
                        <button onClick={() => handleStatus(t.id, 'in_transit')} className="p-1.5 rounded-lg hover:bg-blue-50" title="Mark in transit">
                          <Truck className="w-4 h-4 text-blue-500" />
                        </button>
                      )}
                      {t.status === 'in_transit' && (
                        <button onClick={() => handleComplete(t.id)} className="p-1.5 rounded-lg hover:bg-emerald-50" title="Complete">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}
                      {['pending', 'in_transit'].includes(t.status) && (
                        <button onClick={() => handleStatus(t.id, 'cancelled')} className="p-1.5 rounded-lg hover:bg-red-50" title="Cancel">
                          <XCircle className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
