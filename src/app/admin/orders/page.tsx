'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Eye, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  PackageOpen, 
  Undo2, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag,
  TrendingDown,
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles,
  Percent
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { parseProductDetails } from '@/lib/utils/order-helpers';
import Link from 'next/link';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('id, name').eq('is_active', true).order('name');
    setWarehouses(data || []);
  };

  const handleAssignWarehouse = async (orderId: string, warehouseId: string) => {
    setAssigningOrder(orderId);
    try {
      const { assignWarehouseToOrder } = await import('@/lib/actions/admin/order-workflow');
      await assignWarehouseToOrder(orderId, warehouseId, null);
      toast.success('Order assigned to warehouse');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign warehouse');
    } finally {
      setAssigningOrder(null);
    }
  };

  // Payment status badge helper
  const getPaymentStatusBadge = (paymentStatus: string) => {
    const ps = (paymentStatus || 'pending').toLowerCase();
    switch (ps) {
      case 'paid':
      case 'completed':
      case 'full_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Full Paid
          </span>
        );
      case 'half_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
            <Percent className="h-3 w-3" /> Half Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider border border-violet-200">
            <TrendingUp className="h-3 w-3" /> Partial Paid
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-200">
            <Undo2 className="h-3 w-3" /> Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles!customer_id(full_name, email, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders: ' + error.message);
    } else {
      setOrders(data || []);
      setFilteredOrders(data || []);
    }
    setLoading(false);
  };

  // Run filtering on change of filters
  useEffect(() => {
    let result = [...orders];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((o) => {
        const { metadata } = parseProductDetails(o.product_details);
        return (
          String(o.id).toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.profiles?.full_name && o.profiles.full_name.toLowerCase().includes(q)) ||
          (o.customer_phone && o.customer_phone.includes(q)) ||
          (o.profiles?.phone && o.profiles.phone.includes(q)) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
          (o.profiles?.email && o.profiles.email.toLowerCase().includes(q)) ||
          (metadata.tracking_number && metadata.tracking_number.toLowerCase().includes(q))
        );
      });
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Courier Filter
    if (courierFilter !== 'all') {
      result = result.filter((o) => {
        const { metadata } = parseProductDetails(o.product_details);
        if (courierFilter === 'none') {
          return !metadata.courier_name;
        }
        return metadata.courier_name?.toLowerCase() === courierFilter.toLowerCase();
      });
    }

    // Payment Method Filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter((o) => o.payment_method?.toLowerCase() === paymentMethodFilter.toLowerCase());
    }

    // Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 24 * 3600 * 1000;
      const sevenDaysAgo = todayStart - 7 * 24 * 3600 * 1000;
      const thirtyDaysAgo = todayStart - 30 * 24 * 3600 * 1000;

      result = result.filter((o) => {
        const orderTime = new Date(o.created_at).getTime();
        if (dateFilter === 'today') return orderTime >= todayStart;
        if (dateFilter === 'yesterday') return orderTime >= yesterdayStart && orderTime < todayStart;
        if (dateFilter === '7days') return orderTime >= sevenDaysAgo;
        if (dateFilter === '30days') return orderTime >= thirtyDaysAgo;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, dateFilter, courierFilter, paymentMethodFilter, sortOrder, orders]);

  // Compute Stats dynamically based on unfiltered orders list to keep metrics store-wide
  const getStats = () => {
    const totalCount = orders.length;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const todayOrders = orders.filter(o => new Date(o.created_at).getTime() >= startOfToday).length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const returnedOrders = orders.filter(o => o.status === 'returned').length;

    // Revenue: sum of totals for non-cancelled and non-returned
    const revenue = orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'returned')
      .reduce((sum, o) => sum + Number(o.total_price || o.amount || 0), 0);

    // Refund Amount: sum of total_price for returned and refunded orders
    const refundAmount = orders
      .filter(o => o.status === 'returned' || o.status === 'refunded' || o.payment_status === 'refunded')
      .reduce((sum, o) => sum + Number(o.total_price || o.amount || 0), 0);

    return {
      totalCount,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      revenue,
      refundAmount
    };
  };

  const stats = getStats();

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200"><Clock className="h-3 w-3" /> Pending</span>;
      case 'confirmed': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#1B4332] text-[10px] font-black uppercase tracking-wider border border-[#B7E4C7]"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>;
      case 'processing': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200"><PackageOpen className="h-3 w-3" /> Processing</span>;
      case 'packed': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-wider border border-teal-200"><PackageOpen className="h-3 w-3" /> Packed</span>;
      case 'ready_for_pickup': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-black uppercase tracking-wider border border-violet-200"><Truck className="h-3 w-3" /> Ready Pickup</span>;
      case 'shipped': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-200"><Truck className="h-3 w-3" /> Shipped</span>;
      case 'in_transit': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider border border-indigo-200"><Truck className="h-3 w-3" /> In Transit</span>;
      case 'out_for_delivery': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200"><Truck className="h-3 w-3" /> Out Delivery</span>;
      case 'delivered': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200"><CheckCircle2 className="h-3 w-3" /> Delivered</span>;
      case 'cancelled': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider border border-red-200"><XCircle className="h-3 w-3" /> Cancelled</span>;
      case 'returned': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-300"><Undo2 className="h-3 w-3" /> Returned</span>;
      case 'refunded': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-300"><Undo2 className="h-3 w-3" /> Refunded</span>;
      default: 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider border">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Dashboard Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-[#1a4731]">Order Management</h1>
        <p className="text-slate-500 mt-1">Manage processing, packing, shipping, returns, and refunds.</p>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Row 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Orders</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.totalCount}</p>
          </div>
          <div className="p-2.5 bg-slate-50 text-slate-500 rounded-2xl"><ShoppingBag className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Orders</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.todayOrders}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl"><Clock className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pending Orders</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingOrders}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl"><Clock className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Delivered</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.deliveredOrders}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 className="h-5 w-5" /></div>
        </div>

        {/* Row 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cancelled</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelledOrders}</p>
          </div>
          <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl"><XCircle className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Returned</span>
            <p className="text-2xl font-bold text-slate-600 mt-1">{stats.returnedOrders}</p>
          </div>
          <div className="p-2.5 bg-slate-50 text-slate-500 rounded-2xl"><Undo2 className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Revenue</span>
            <p className="text-xl font-black text-emerald-800 mt-1">{formatPrice(stats.revenue)}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl"><DollarSign className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Refunded Amount</span>
            <p className="text-xl font-black text-rose-800 mt-1">{formatPrice(stats.refundAmount)}</p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl"><Undo2 className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Table & Filtering Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Filter Controls Header */}
        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1a4731] transition-colors" />
              <input 
                placeholder="Search by ID, Name, Phone, Email or Tracking #..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#1a4731] focus:ring-1 focus:ring-[#1a4731] transition-all"
              />
            </div>
            
            {/* Date, Sorting, Reset */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-black mr-2">
                <ArrowUpDown className="h-3.5 w-3.5" /> Sort
              </div>
              <button 
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="h-10 px-4 rounded-xl border text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </button>

              <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border text-xs font-bold bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>

              {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all' || courierFilter !== 'all' || paymentMethodFilter !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDateFilter('all');
                    setCourierFilter('all');
                    setPaymentMethodFilter('all');
                  }}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Quick Dropdown Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Order Status</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="shipped">Shipped</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Courier Carrier</span>
              <select 
                value={courierFilter} 
                onChange={(e) => setCourierFilter(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] outline-none cursor-pointer"
              >
                <option value="all">All Couriers</option>
                <option value="none">Unassigned</option>
                <option value="Steadfast">Steadfast</option>
                <option value="Pathao Courier">Pathao Courier</option>
                <option value="RedX">RedX</option>
                <option value="Paperfly">Paperfly</option>
                <option value="Sundarban">Sundarban</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</span>
              <select 
                value={paymentMethodFilter} 
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-100 rounded-lg px-2 text-[11px] outline-none cursor-pointer"
              >
                <option value="all">All Methods</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
          </div>

        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4 hidden md:table-cell">Products</th>
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Fulfillment Status</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4 text-right">Total Price</th>
                <th className="px-6 py-4 hidden lg:table-cell">Warehouse</th>
                <th className="px-6 py-4 text-center">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-light">
                    Querying order database...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-light">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const { items: productDetailsItems, metadata } = parseProductDetails(order.product_details);
                  const productNames = productDetailsItems
                    .map((it: any) => it.product_name || it.name)
                    .filter(Boolean)
                    .join(', ');
                  const clientName = order.customer_name || order.profiles?.full_name || 'Guest User';
                  
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* ID */}
                      <td className="px-6 py-4 font-mono text-slate-500 font-semibold">
                        #{order.id}
                      </td>
                      
                      {/* Products */}
                      <td className="px-6 py-4 hidden md:table-cell max-w-[240px]">
                        <p className="text-slate-700 font-semibold leading-snug line-clamp-2">
                          {productNames || 'No product info'}
                        </p>
                      </td>
                      
                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{clientName}</p>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5">{order.customer_phone || order.profiles?.phone || 'No phone'}</p>
                      </td>
                      
                      {/* Date */}
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      
                      {/* Payment Status */}
                      <td className="px-6 py-4">
                        {getPaymentStatusBadge(order.payment_status)}
                      </td>
                      
                      {/* Total */}
                      <td className="px-6 py-4 text-right font-black text-slate-950">
                        {formatPrice(Number(order.total_price || order.amount || 0))}
                      </td>
                      
                      {/* Warehouse */}
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {order.warehouse_id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            {warehouses.find(w => w.id === order.warehouse_id)?.name || 'Assigned'}
                          </span>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => { if (e.target.value) handleAssignWarehouse(order.id, e.target.value); }}
                            disabled={assigningOrder === order.id}
                            className="h-8 px-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-700 outline-none cursor-pointer"
                          >
                            <option value="">Assign Warehouse</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <Link 
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-50 hover:bg-[#E6F0EB] text-[#1a4731] font-bold transition-all text-[11px]"
                        >
                          <Eye className="h-3.5 w-3.5" /> Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info counts */}
        <div className="p-4 bg-slate-50/30 border-t text-[10px] font-semibold text-slate-400 text-right">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>

      </div>

    </div>
  );
}
