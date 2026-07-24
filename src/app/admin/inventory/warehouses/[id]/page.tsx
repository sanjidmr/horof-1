import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Package, MapPin, Users, Phone, Mail, Warehouse, ArrowRightLeft, Activity, AlertTriangle, DollarSign, BarChart3, Edit2 } from 'lucide-react';
import Link from 'next/link';
import WarehouseStaffManager from '@/components/admin/WarehouseStaffManager';

async function getDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: warehouse } = await supabase.from('warehouses').select('*').eq('id', id).single();
  if (!warehouse) return null;

  const { count: productCount } = await supabase
    .from('products').select('*', { count: 'exact', head: true }).eq('default_warehouse_id', id);

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, stock, stock_status, price, cost_price, min_stock_level')
    .eq('default_warehouse_id', id)
    .order('name');

  const { data: recentMovements } = await supabase
    .from('stock_movements')
    .select('*, products(name, sku)')
    .eq('warehouse_id', id)
    .order('created_at', { ascending: false })
    .limit(15);

  const { data: transfersOut } = await supabase
    .from('stock_transfers')
    .select('transfer_number, quantity, status, created_at, to_warehouse:to_warehouse_id(name)')
    .eq('from_warehouse_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: transfersIn } = await supabase
    .from('stock_transfers')
    .select('transfer_number, quantity, status, created_at, from_warehouse:from_warehouse_id(name)')
    .eq('to_warehouse_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  const totalStock = (products || []).reduce((s, p) => s + (p.stock || 0), 0);
  const totalValue = (products || []).reduce((s, p) => s + (p.cost_price || 0) * (p.stock || 0), 0);
  const lowStockCount = (products || []).filter(p => p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock').length;

  return {
    warehouse,
    stats: {
      productCount: productCount || 0,
      totalStock,
      totalValue,
      lowStockCount,
      capacityUsed: warehouse.capacity ? Math.round((totalStock / warehouse.capacity) * 100) : 0,
    },
    products: products || [],
    recentMovements: recentMovements || [],
    transfersOut: transfersOut || [],
    transfersIn: transfersIn || [],
  };
}

export default async function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDetail(id);
  if (!data) notFound();

  const { warehouse, stats, products, recentMovements, transfersOut, transfersIn } = data;

  const statCards = [
    { label: 'Products', value: stats.productCount, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Total Stock', value: stats.totalStock.toLocaleString(), icon: Warehouse, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Inventory Value', value: `৳${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-600 bg-purple-100' },
    { label: 'Low Stock Items', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
  ];

  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700', in_transit: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/inventory/warehouses" className="text-sm text-slate-400 hover:text-slate-600">Warehouses</Link>
          <span className="text-slate-300">/</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{warehouse.name}</h1>
            <p className="text-sm text-slate-500">Slug: {warehouse.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${warehouse.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {warehouse.is_active ? 'Active' : 'Inactive'}
          </span>
          <Link href={`/admin/inventory/warehouses`} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
        </div>
      </div>

      {/* Info + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#1a4731]" /> Details</h2>
          <div className="space-y-3 text-sm">
            {warehouse.location && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div><p className="font-medium text-slate-700">Location</p><p className="text-slate-500">{warehouse.location}</p></div>
              </div>
            )}
            {warehouse.manager && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div><p className="font-medium text-slate-700">Manager</p><p className="text-slate-500">{warehouse.manager}</p></div>
              </div>
            )}
            {warehouse.phone && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div><p className="font-medium text-slate-700">Phone</p><p className="text-slate-500">{warehouse.phone}</p></div>
              </div>
            )}
            {warehouse.email && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div><p className="font-medium text-slate-700">Email</p><p className="text-slate-500">{warehouse.email}</p></div>
              </div>
            )}
          </div>
          {warehouse.capacity && (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-500 font-medium">Capacity Utilization</span>
                <span className="font-bold text-slate-700">{stats.capacityUsed}% ({stats.totalStock.toLocaleString()}/{warehouse.capacity.toLocaleString()})</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stats.capacityUsed > 90 ? 'bg-red-500' : stats.capacityUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, stats.capacityUsed)}%` }}
                />
              </div>
            </div>
          )}
          <div className="pt-2">
            <p className="text-xs text-slate-400">Created: {new Date(warehouse.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900">{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Package className="w-4 h-4 text-[#1a4731]" /> Products ({products.length})</h2>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">No products assigned to this warehouse</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Product</th><th className="text-left px-4 py-3">SKU</th>
                    <th className="text-center px-4 py-3">Stock</th><th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Value</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.sku}</td>
                        <td className="px-4 py-3 text-center font-bold">{p.stock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stock_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                            p.stock_status === 'low_stock' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>{p.stock_status.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">৳{((p.cost_price || 0) * p.stock).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Management */}
      <WarehouseStaffManager warehouseId={id} warehouseName={warehouse.name} />

      {/* Transfers + Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfers Out */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#1a4731]" /> Outgoing Transfers</h2>
          {transfersOut.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No outgoing transfers</p>
          ) : (
            <div className="space-y-3">
              {transfersOut.map((t: any) => (
                <div key={t.transfer_number} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-700">{t.transfer_number}</p>
                    <p className="text-[11px] text-slate-400">To: {t.to_warehouse?.name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800">{t.quantity}</span>
                    <p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[t.status] || ''}`}>{t.status}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfers In */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#1a4731]" /> Incoming Transfers</h2>
          {transfersIn.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No incoming transfers</p>
          ) : (
            <div className="space-y-3">
              {transfersIn.map((t: any) => (
                <div key={t.transfer_number} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-700">{t.transfer_number}</p>
                    <p className="text-[11px] text-slate-400">From: {t.from_warehouse?.name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800">+{t.quantity}</span>
                    <p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[t.status] || ''}`}>{t.status}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-[#1a4731]" /> Recent Stock Movements</h2>
        {recentMovements.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No movements recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b">
                <th className="text-left py-3 px-4">Date</th><th className="text-left py-3 px-4">Product</th>
                <th className="text-left py-3 px-4">Type</th><th className="text-center py-3 px-4">Change</th>
                <th className="text-center py-3 px-4">After</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {recentMovements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 text-xs">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{m.products?.name || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.movement_type === 'purchase' ? 'bg-cyan-100 text-cyan-700' :
                        m.movement_type === 'sale' ? 'bg-blue-100 text-blue-700' :
                        m.movement_type === 'transfer_in' ? 'bg-indigo-100 text-indigo-700' :
                        m.movement_type === 'transfer_out' ? 'bg-purple-100 text-purple-700' :
                        m.movement_type === 'return' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{m.movement_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{m.quantity_change > 0 ? '+' : ''}{m.quantity_change}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{m.stock_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
