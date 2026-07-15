'use client';

import { useEffect, useState } from 'react';
import { Plus, Eye, RefreshCw, Package, Building2, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { getPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder, getSuppliers, getWarehouses } from '@/lib/actions/inventory';
import { toast } from 'sonner';
import Link from 'next/link';

type PO = { id: string; po_number: string; supplier_id: string; warehouse_id: string | null; status: string; order_date: string; expected_date: string | null; received_date: string | null; invoice_number: string | null; subtotal: number; total_cost: number; suppliers?: { name: string } | null; warehouses?: { name: string } | null; };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', warehouse_id: '', expected_date: '', invoice_number: '', notes: '' });
  const [items, setItems] = useState([{ product_id: '', variant_id: '', quantity: 1, unit_cost: 0 }]);

  const fetch = async () => {
    setLoading(true);
    const [poData, supData, whData] = await Promise.all([getPurchaseOrders(), getSuppliers(), getWarehouses()]);
    setOrders(poData as any);
    setSuppliers(supData);
    setWarehouses(whData);
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const addItem = () => setItems([...items, { product_id: '', variant_id: '', quantity: 1, unit_cost: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const copy = [...items];
    (copy[i] as any)[field] = value;
    setItems(copy);
  };

  const handleCreate = async () => {
    if (!form.supplier_id || !items.length) { toast.error('Supplier and at least one item required'); return; }
    try {
      await createPurchaseOrder({
        supplier_id: form.supplier_id,
        warehouse_id: form.warehouse_id || undefined,
        expected_date: form.expected_date || undefined,
        invoice_number: form.invoice_number || undefined,
        notes: form.notes || undefined,
        items: items.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id || undefined,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
        })),
      });
      toast.success('Purchase order created');
      setShowForm(false);
      setItems([{ product_id: '', variant_id: '', quantity: 1, unit_cost: 0 }]);
      setForm({ supplier_id: '', warehouse_id: '', expected_date: '', invoice_number: '', notes: '' });
      fetch();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReceive = async (id: string) => {
    try { await receivePurchaseOrder(id); toast.success('PO received, stock updated'); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleStatus = async (id: string, status: string) => {
    try { await updatePurchaseOrderStatus(id, status); toast.success(`Status: ${status}`); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase order?')) return;
    try { await deletePurchaseOrder(id); toast.success('Deleted'); fetch(); }
    catch (e: any) { toast.error(e.message); }
  };

  const statusStyles: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700', shipped: 'bg-purple-100 text-purple-700',
    received: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-500">{orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] flex items-center gap-2">
            <Plus className="w-4 h-4" /> New PO
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-bold text-slate-800">New Purchase Order</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
              <option value="">Select Supplier *</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="Expected date" />
            <input placeholder="Invoice #" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" rows={2} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Items</span>
              <button onClick={addItem} className="text-xs font-bold text-[#1a4731] hover:underline">+ Add Item</button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <input placeholder="Product ID" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)} className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                <input placeholder="Variant ID (opt)" value={item.variant_id} onChange={e => updateItem(idx, 'variant_id', e.target.value)} className="w-32 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                <input type="number" placeholder="Unit cost" value={item.unit_cost} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} className="w-28 px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
                {items.length > 1 && <button onClick={() => removeItem(idx)} className="p-2.5 text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a]">Create PO</button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">PO #</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Supplier</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Warehouse</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Total</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr> :
               orders.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No purchase orders</td></tr> :
               orders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">{po.po_number}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{po.suppliers?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{po.warehouses?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyles[po.status] || 'bg-slate-100 text-slate-600'}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">৳{po.total_cost.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-400">{new Date(po.order_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {po.status === 'approved' && (
                        <button onClick={() => handleStatus(po.id, 'shipped')} className="p-1.5 rounded-lg hover:bg-purple-50" title="Mark shipped">
                          <Package className="w-4 h-4 text-purple-500" />
                        </button>
                      )}
                      {po.status === 'shipped' && (
                        <button onClick={() => handleReceive(po.id)} className="p-1.5 rounded-lg hover:bg-emerald-50" title="Receive">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}
                      {['draft', 'pending'].includes(po.status) && (
                        <button onClick={() => handleStatus(po.id, 'approved')} className="p-1.5 rounded-lg hover:bg-blue-50" title="Approve">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        </button>
                      )}
                      {['draft', 'pending'].includes(po.status) && (
                        <button onClick={() => handleStatus(po.id, 'cancelled')} className="p-1.5 rounded-lg hover:bg-red-50" title="Cancel">
                          <XCircle className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                      {['draft', 'pending', 'cancelled'].includes(po.status) && (
                        <button onClick={() => handleDelete(po.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                          <XCircle className="w-4 h-4 text-slate-400" />
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
