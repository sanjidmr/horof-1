import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Package, AlertTriangle, DollarSign, TrendingUp, ArrowUpDown, Warehouse, ShoppingCart, BarChart3 } from 'lucide-react';
import Link from 'next/link';

async function getStats() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const [total, active, lowStock, outOfStock, stockData, recentMovements, warehouseData] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'low_stock'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'out_of_stock'),
    supabase.from('products').select('stock, reserved_stock, incoming_stock, cost_price, price'),
    supabase.from('stock_movements').select('*, products(name,sku)').order('created_at', { ascending: false }).limit(10),
    supabase.from('warehouses').select('id, name, capacity, is_active').eq('is_active', true).order('name'),
  ]);

  let totalStock = 0, reservedStock = 0, incomingStock = 0, inventoryValue = 0;
  stockData.data?.forEach(p => {
    totalStock += p.stock || 0;
    reservedStock += p.reserved_stock || 0;
    incomingStock += p.incoming_stock || 0;
    inventoryValue += (p.cost_price || 0) * (p.stock || 0);
  });

  return {
    total_products: total.count || 0,
    active_products: active.count || 0,
    total_stock: totalStock,
    reserved_stock: reservedStock,
    incoming_stock: incomingStock,
    low_stock_count: lowStock.count || 0,
    out_of_stock_count: outOfStock.count || 0,
    total_inventory_value: inventoryValue,
    recent_movements: recentMovements.data || [],
    warehouses: warehouseData.data || [],
  };
}

export default async function InventoryDashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: 'Total Products', value: stats?.total_products ?? 0, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Products', value: stats?.active_products ?? 0, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Total Stock', value: stats?.total_stock.toLocaleString() ?? 0, icon: Warehouse, color: 'text-purple-600 bg-purple-100' },
    { label: 'Reserved Stock', value: stats?.reserved_stock.toLocaleString() ?? 0, icon: ShoppingCart, color: 'text-amber-600 bg-amber-100' },
    { label: 'Incoming Stock', value: stats?.incoming_stock.toLocaleString() ?? 0, icon: ArrowUpDown, color: 'text-cyan-600 bg-cyan-100' },
    { label: 'Low Stock Items', value: stats?.low_stock_count ?? 0, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
    { label: 'Out of Stock', value: stats?.out_of_stock_count ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
    { label: 'Inventory Value', value: `৳${(stats?.total_inventory_value ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600 bg-green-100' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time overview of your entire inventory</p>
        </div>
        <Link
          href="/admin/inventory/products"
          className="px-5 py-2.5 bg-[#1a4731] text-white text-sm font-bold rounded-xl hover:bg-[#14402a] transition-all"
        >
          Manage Inventory
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Warehouse Capacity Overview */}
      {stats?.warehouses && stats.warehouses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-[#1a4731]" />
            Warehouse Capacity Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stats.warehouses.map((w: any) => (
              <Link key={w.id} href={`/admin/inventory/warehouses/${w.id}`} className="p-4 rounded-xl border border-slate-100 hover:border-[#1a4731]/30 hover:bg-[#f0fdf4]/10 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-[#1a4731]">{w.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {w.capacity && (
                  <>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Capacity: {w.capacity.toLocaleString()} units</p>
                  </>
                )}
              </Link>
            ))}
          </div>
          <Link href="/admin/inventory/warehouses" className="mt-4 inline-block text-sm font-bold text-[#1a4731] hover:underline">
            Manage Warehouses →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1a4731]" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Products', href: '/admin/inventory/products', desc: 'View & manage product stock' },
              { label: 'Warehouses', href: '/admin/inventory/warehouses', desc: 'Manage warehouse locations' },
              { label: 'Suppliers', href: '/admin/inventory/suppliers', desc: 'Manage supplier information' },
              { label: 'Purchase Orders', href: '/admin/inventory/purchase-orders', desc: 'Create & receive purchase orders' },
              { label: 'Stock Transfers', href: '/admin/inventory/transfers', desc: 'Transfer stock between warehouses' },
              { label: 'Stock Movements', href: '/admin/inventory/stock-movements', desc: 'View inventory activity log' },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="p-4 rounded-xl border border-slate-100 hover:border-[#1a4731]/30 hover:bg-[#f0fdf4]/20 transition-all group">
                <p className="text-sm font-bold text-slate-800 group-hover:text-[#1a4731]">{action.label}</p>
                <p className="text-xs text-slate-400 mt-1">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-[#1a4731]" />
            Recent Stock Movements
          </h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {stats?.recent_movements?.length ? (
              stats.recent_movements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.products?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">
                      {m.movement_type.replace(/_/g, ' ')} • Qty: {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      m.quantity_change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No stock movements yet</p>
            )}
          </div>
          <Link href="/admin/inventory/stock-movements" className="mt-4 block text-center text-sm font-bold text-[#1a4731] hover:underline">
            View All Movements
          </Link>
        </div>
      </div>
    </div>
  );
}
