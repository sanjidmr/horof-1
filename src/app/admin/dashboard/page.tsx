'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Layers,
  CreditCard, Settings, Search, Bell, BarChart3, TrendingUp,
  ArrowUpRight, ArrowDownRight, TreePine, LogOut, Plus, Filter,
  MoreVertical, Edit3, Trash2, CheckCircle, Clock, XCircle,
  ChevronRight, ArrowLeft, Download, Eye
} from 'lucide-react';
import { orders, products, customers } from '../../../lib/mockData';
import { formatPrice, cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell
} from 'recharts';

const chartData = [
  { name: 'Jan', revenue: 450000, orders: 240 },
  { name: 'Feb', revenue: 350000, orders: 198 },
  { name: 'Mar', revenue: 220000, orders: 150 },
  { name: 'Apr', revenue: 310000, orders: 190 },
  { name: 'May', revenue: 210000, orders: 120 },
  { name: 'Jun', revenue: 280000, orders: 170 },
  { name: 'Jul', revenue: 390000, orders: 250 },
];

const stats = [
  { label: 'Total Revenue', value: '৳৫২,০৭,২০০', change: '+12.5%', icon: BarChart3, color: 'text-gold' },
  { label: 'Total Orders', value: '১,২৪০', change: '+8.2%', icon: ShoppingBag, color: 'text-accent-primary' },
  { label: 'Total Products', value: '২৫৪', change: '+2.1%', icon: Package, color: 'text-accent-primary' },
  { label: 'Total Customers', value: '৮৯০', change: '+15.4%', icon: Users, color: 'text-accent-primary' },
];

type DashboardTab = 'Overview' | 'Products' | 'Orders' | 'Customers' | 'Settings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const navItems = [
    { id: 'Overview', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'Products', name: 'Products', icon: Package },
    { id: 'Orders', name: 'Orders', icon: ShoppingBag },
    { id: 'Customers', name: 'Customers', icon: Users },
    { id: 'Settings', name: 'Settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <>
      <div className="px-8 mb-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-accent-primary p-2.5 rounded-2xl shadow-lg shadow-accent-primary/20">
            <TreePine className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-display font-bold text-accent-primary tracking-tight leading-none italic">
              Horof<span className="text-gold font-sans not-italic text-sm ml-1 uppercase tracking-widest">Admin</span>
            </span>
          </div>
        </Link>
        <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden p-2 text-accent-primary">
          <XCircle className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as DashboardTab);
              setIsMobileSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[11px] font-bold transition-all uppercase tracking-widest",
              activeTab === item.id
                ? "bg-accent-primary text-white shadow-xl shadow-accent-primary/20"
                : "text-text-secondary hover:text-accent-primary hover:bg-white"
            )}
          >
            <div className="flex items-center gap-4">
              <item.icon className="h-5 w-5" />
              {item.name}
            </div>
            {activeTab === item.id && (
              <motion.div layoutId="activeTrack" className="h-1.5 w-1.5 rounded-full bg-gold" />
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 mt-8 pt-8 border-t border-border-forest">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-bold text-error hover:bg-error/5 transition-all uppercase tracking-widest"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-white flex text-accent-primary overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-accent-primary/40 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isMobileSidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 w-72 bg-bg-secondary border-r border-border-forest z-[70] flex flex-col pt-10 pb-6 lg:hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-border-forest flex flex-col pt-10 pb-6 shrink-0 bg-bg-secondary hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="h-20 lg:h-24 px-6 lg:px-10 border-b border-border-forest flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 bg-bg-secondary rounded-xl text-accent-primary"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl lg:text-3xl font-display font-bold text-accent-primary leading-none">{activeTab}</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1 lg:mt-2 hidden sm:block">Horof Enterprise Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="relative group hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted transition-colors group-focus-within:text-gold" />
              <input
                placeholder="Find orders, customers..."
                className="h-12 w-80 bg-bg-secondary border border-border-forest rounded-2xl pl-12 pr-4 text-sm outline-none focus:border-gold transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <button className="h-12 w-12 flex items-center justify-center bg-bg-secondary border border-border-forest rounded-2xl text-accent-primary hover:text-gold transition-all relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-3.5 right-3.5 h-2 w-2 bg-gold rounded-full border-2 border-white" />
              </button>

              <div className="h-12 border-l border-border-forest mx-2" />

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-accent-primary">Admin User</p>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em]">Super User</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-accent-primary text-white flex items-center justify-center font-display font-bold text-lg shadow-xl shadow-accent-primary/20">
                  AU
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'Overview' && <OverviewTab />}
            {activeTab === 'Products' && <ProductsTab />}
            {activeTab === 'Orders' && <OrdersTab />}
            {activeTab === 'Customers' && <CustomersTab />}
            {activeTab === 'Settings' && <SettingsTab />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// --- View Sub-Components ---

const OverviewTab = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-12"
  >
    {/* Stats Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white border border-border-forest p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] space-y-4 lg:space-y-6 shadow-sm hover:shadow-xl hover:shadow-accent-primary/5 transition-all">
          <div className="flex items-center justify-between">
            <div className={cn("h-12 w-12 lg:h-14 lg:w-14 rounded-2xl bg-bg-secondary flex items-center justify-center", stat.color)}>
              <stat.icon className="h-6 w-6 lg:h-7 lg:w-7" />
            </div>
            <div className="flex items-center gap-1.5 text-[8px] lg:text-[10px] font-bold text-success uppercase tracking-widest bg-success/10 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full border border-success/20">
              <TrendingUp className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
              {stat.change}
            </div>
          </div>
          <div>
            <p className="text-[8px] lg:text-[10px] text-text-muted font-bold uppercase tracking-[0.3em] mb-1 lg:mb-2">{stat.label}</p>
            <h3 className="text-3xl lg:text-4xl font-display font-bold text-accent-primary">{stat.value}</h3>
          </div>
        </div>
      ))}
    </div>

    {/* Charts Row */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10">
      <div className="xl:col-span-2 bg-accent-primary p-8 lg:p-12 rounded-[2.5rem] lg:rounded-[4rem] text-white space-y-8 lg:space-y-10 shadow-2xl shadow-accent-primary/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full -mr-32 -mt-32" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h3 className="text-2xl lg:text-3xl font-display font-medium">Revenue Analysis</h3>
            <p className="text-accent-light/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest">Monthly performance tracking</p>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none bg-white/10 border-white/10 text-white hover:bg-white/20 h-10 px-6">Month</Button>
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none bg-transparent border-white/5 text-white/50 h-10 px-6">Year</Button>
          </div>
        </div>

        <div className="h-[250px] lg:h-[350px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A853" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} dy={15} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A3320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                itemStyle={{ color: '#F0F4F0' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#D4A853" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-border-forest rounded-[2.5rem] lg:rounded-[4rem] p-8 lg:p-12 space-y-8 lg:space-y-10 shadow-sm">
        <div className="space-y-2">
          <h3 className="text-2xl lg:text-3xl font-display font-medium text-accent-primary">New Orders</h3>
          <p className="text-text-muted text-[10px] lg:text-xs font-bold uppercase tracking-widest">Growth by volume</p>
        </div>

        <div className="h-[200px] lg:h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="orders" fill="#2D6A4F" radius={[10, 10, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 4 ? '#D4A853' : '#2D6A4F'} />
                ))}
              </Bar>
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#A8C5A0" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between p-6 bg-bg-secondary rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gold/10 rounded-xl flex items-center justify-center"><ChevronRight className="h-5 w-5 text-gold" /></div>
              <p className="text-sm font-bold">Pending Approval</p>
            </div>
            <p className="text-xl font-display font-bold">12</p>
          </div>
          <div className="flex items-center justify-between p-6 bg-bg-secondary rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-accent-primary/10 rounded-xl flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-accent-primary" /></div>
              <p className="text-sm font-bold">In Production</p>
            </div>
            <p className="text-xl font-display font-bold">45</p>
          </div>
        </div>
      </div>
    </div>

    {/* Recent Activities Section */}
    <div className="bg-white border border-border-forest rounded-[2.5rem] lg:rounded-[4rem] overflow-hidden shadow-sm">
      <div className="px-6 lg:px-12 py-8 lg:py-10 border-b border-border-forest flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl lg:text-2xl font-display font-bold text-accent-primary">Operational Log</h3>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Latest transactions & updates</p>
        </div>
        <Button variant="outline" className="h-10 lg:h-12 px-6 lg:px-8 rounded-full text-[10px] uppercase font-bold tracking-widest">Report Archive</Button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-bg-secondary/30 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
              <th className="px-12 py-6">Transaction ID</th>
              <th className="px-12 py-6">Identity</th>
              <th className="px-12 py-6">Status</th>
              <th className="px-12 py-6">Value</th>
              <th className="px-12 py-6">Chronology</th>
              <th className="px-12 py-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-forest">
            {orders.slice(0, 5).map((order) => (
              <tr key={order.id} className="hover:bg-bg-secondary/20 transition-colors group">
                <td className="px-12 py-8 font-mono text-xs text-gold">#{order.id.split('-')[0].toUpperCase()}</td>
                <td className="px-12 py-8">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent-primary/10 flex items-center justify-center font-bold text-xs">
                      {order.customerName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="text-sm font-bold text-accent-primary">{order.customerName}</p>
                  </div>
                </td>
                <td className="px-12 py-8">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    order.status === 'delivered' ? "bg-success/10 text-success border border-success/20" : "bg-gold/10 text-gold border border-gold/20"
                  )}>
                    {order.status === 'delivered' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {order.status}
                  </div>
                </td>
                <td className="px-12 py-8 font-display font-bold text-xl">{formatPrice(order.total)}</td>
                <td className="px-12 py-8 text-xs text-text-muted font-bold uppercase">{order.date}</td>
                <td className="px-12 py-8 text-right">
                  <button className="h-10 w-10 rounded-full hover:bg-white hover:shadow-lg flex items-center justify-center transition-all">
                    <MoreVertical className="h-4 w-4 text-text-muted" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
);

const ProductsTab = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-10"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <h3 className="text-4xl font-display font-bold text-accent-primary">Collection Inventory</h3>
        <p className="text-text-secondary">Manage your curated range of woodcraft masterpieces</p>
      </div>
      <Button variant="primary" className="h-14 px-10 rounded-full group">
        <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform" />
        New Product
      </Button>
    </div>

    <div className="bg-bg-secondary rounded-[3rem] p-4 flex gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <input
          placeholder="Search entire collection..."
          className="w-full h-16 bg-white border border-border-forest rounded-[2rem] pl-16 pr-6 text-sm focus:border-gold outline-none shadow-sm"
        />
      </div>
      <Button variant="secondary" className="h-16 px-8 rounded-[2rem] border-border-forest bg-white">
        <Filter className="h-5 w-5 mr-2" />
        Filter Collection
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
      {products.map((product) => (
        <div key={product.id} className="bg-white border border-border-forest rounded-[2.5rem] overflow-hidden group shadow-sm hover:shadow-2xl hover:shadow-accent-primary/10 transition-all border-b-4 border-b-transparent hover:border-b-gold">
          <div className="aspect-square relative overflow-hidden">
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              <Badge variant="gold" className="rounded-full px-4 py-1.5 backdrop-blur-md bg-gold/80 border-none shadow-lg shadow-gold/20">
                {product.category}
              </Badge>
              <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-accent-primary border border-white/50 uppercase tracking-widest shadow-lg">
                Inventory: {product.stock}
              </div>
            </div>

            {/* Edit/Trash Actions overlay */}
            <div className="absolute inset-x-6 bottom-6 flex gap-3 translate-y-20 group-hover:translate-y-0 transition-transform">
              <button className="flex-1 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-accent-primary hover:text-gold transition-colors font-bold text-xs gap-2">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
              <button className="w-12 h-12 bg-error/10 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-error hover:bg-error hover:text-white transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-8 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xl font-display font-medium text-accent-primary truncate">{product.name}</h4>
              <div className="flex items-center gap-2">
                <Star className="h-3 w-3 text-gold fill-gold" />
                <span className="text-[10px] font-bold text-text-muted">{product.rating} (12 reviews)</span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-display font-bold text-gold">{formatPrice(product.price)}</p>
              <button className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] hover:text-accent-primary transition-colors flex items-center gap-1 group/link">
                Insights <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const OrdersTab = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    className="space-y-10"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <h3 className="text-4xl font-display font-bold text-accent-primary">Orders Manifest</h3>
        <p className="text-text-secondary">Tracking the journey of every handcrafted piece</p>
      </div>
      <div className="flex gap-4">
        <Button variant="secondary" className="h-14 px-8 rounded-full border-border-forest">
          <Download className="h-5 w-5 mr-3" />
          Export CSV
        </Button>
        <Button variant="primary" className="h-14 px-8 rounded-full">
          Print Labels
        </Button>
      </div>
    </div>

    <div className="bg-white border border-border-forest rounded-[3rem] overflow-hidden">
      <div className="grid grid-cols-4 divide-x divide-border-forest bg-bg-secondary/20">
        <div className="p-8 space-y-2">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Processing</p>
          <p className="text-3xl font-display font-bold">42</p>
        </div>
        <div className="p-8 space-y-2">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">In Transit</p>
          <p className="text-3xl font-display font-bold">18</p>
        </div>
        <div className="p-8 space-y-2">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Delivered</p>
          <p className="text-3xl font-display font-bold">156</p>
        </div>
        <div className="p-8 space-y-2">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Canceled</p>
          <p className="text-3xl font-display font-bold text-error">3</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-secondary/30 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
              <th className="px-12 py-6">ID / Manifest</th>
              <th className="px-12 py-6">Consignee</th>
              <th className="px-12 py-6">Status Trace</th>
              <th className="px-12 py-6">Composition</th>
              <th className="px-12 py-6 text-right">Valuation</th>
              <th className="px-12 py-6 text-right">Logistics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-forest">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-bg-secondary/10 transition-colors">
                <td className="px-12 py-8">
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-bold text-gold">#{order.id.toUpperCase()}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest">{order.date}</p>
                  </div>
                </td>
                <td className="px-12 py-8">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-accent-primary">{order.customerName}</p>
                    <p className="text-[10px] text-text-muted uppercase">{order.email || 'artisan.client@email.com'}</p>
                  </div>
                </td>
                <td className="px-12 py-8">
                  <Badge variant={order.status === 'delivered' ? 'success' : 'gold'} className="rounded-full px-4 py-1.5 uppercase font-bold tracking-[0.2em] text-[8px] border-none shadow-sm capitalize">
                    {order.status}
                  </Badge>
                </td>
                <td className="px-12 py-8">
                  <div className="flex -space-x-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 w-10 rounded-xl border-2 border-white bg-bg-secondary overflow-hidden shadow-lg">
                        <img src={`https://picsum.photos/seed/wood-${i}/50/50`} alt="asset" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    <div className="h-10 w-10 rounded-xl border-2 border-white bg-accent-primary flex items-center justify-center text-[10px] text-white font-bold relative z-10">
                      +2
                    </div>
                  </div>
                </td>
                <td className="px-12 py-8 text-right font-display font-bold text-2xl">
                  {formatPrice(order.total)}
                </td>
                <td className="px-12 py-8 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="h-10 px-6 rounded-2xl bg-bg-secondary border border-border-forest text-[10px] font-bold uppercase tracking-widest hover:border-gold transition-all">
                      Track
                    </button>
                    <button className="h-10 w-10 rounded-2xl bg-white border border-border-forest flex items-center justify-center hover:bg-gold hover:border-gold hover:text-white transition-all shadow-sm">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </motion.div>
);

const CustomersTab = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-10"
  >
    <div className="space-y-2">
      <h3 className="text-4xl font-display font-bold text-accent-primary">Patron Database</h3>
      <p className="text-text-secondary">Explore the community of Horof art collectors</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {customers.map((customer) => (
        <div key={customer.id} className="bg-white border border-border-forest p-10 rounded-[3rem] space-y-8 shadow-sm group hover:shadow-2xl hover:shadow-accent-primary/5 transition-all">
          <div className="flex items-center justify-between">
            <div className="h-20 w-20 rounded-[2rem] bg-accent-primary/10 flex items-center justify-center font-display font-bold text-3xl text-accent-primary group-hover:scale-110 transition-transform">
              {customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Total Spend</p>
              <p className="text-2xl font-display font-bold text-gold">{formatPrice(Math.random() * 5000 + 1000)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xl font-bold text-accent-primary">{customer.name}</h4>
            <p className="text-sm text-text-muted">{customer.email}</p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border-forest">
            <div className="space-y-1">
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest italic">Member Since</p>
              <p className="text-xs font-bold font-mono">OCT 2025</p>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full px-6 bg-bg-secondary">View Profile</Button>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const SettingsTab = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="max-w-4xl space-y-12"
  >
    <div className="space-y-2">
      <h3 className="text-4xl font-display font-bold text-accent-primary">Portal Configuration</h3>
      <p className="text-text-secondary">Fine-tune the Horof Enterprise Management controls</p>
    </div>

    <div className="space-y-8">
      <section className="bg-white border border-border-forest rounded-[3rem] p-12 space-y-8">
        <h4 className="text-2xl font-display font-bold text-accent-primary">General Integrity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Store Branding</label>
            <input className="w-full h-14 bg-bg-secondary rounded-2xl border-none px-6 outline-none focus:ring-2 ring-gold/20" defaultValue="Horof" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Support Email</label>
            <input className="w-full h-14 bg-bg-secondary rounded-2xl border-none px-6 outline-none focus:ring-2 ring-gold/20" defaultValue="concierge@horof.art" />
          </div>
        </div>
      </section>

      <section className="bg-white border border-border-forest rounded-[3rem] p-12 space-y-8">
        <h4 className="text-2xl font-display font-bold text-accent-primary">Marketplace Controls</h4>
        <div className="flex items-center justify-between p-8 bg-bg-secondary rounded-3xl">
          <div>
            <p className="font-bold text-accent-primary">Maintenance Mode</p>
            <p className="text-xs text-text-muted">Immediately suspend public storefront access</p>
          </div>
          <div className="h-8 w-14 bg-accent-primary/10 rounded-full relative p-1 cursor-pointer">
            <div className="h-6 w-6 bg-white rounded-full shadow-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between p-8 bg-gold/5 rounded-3xl border border-gold/10">
          <div>
            <p className="font-bold text-gold">Premium Gold Aesthetic</p>
            <p className="text-xs text-text-muted">Toggle luxury styling across the platform</p>
          </div>
          <div className="h-8 w-14 bg-gold rounded-full relative p-1 cursor-pointer">
            <div className="h-6 w-6 bg-white rounded-full shadow-lg ml-auto" />
          </div>
        </div>
      </section>
    </div>

    <div className="flex justify-end gap-6 pt-10">
      <Button variant="outline" className="h-14 px-12 rounded-full">Discard Changes</Button>
      <Button variant="primary" className="h-14 px-12 rounded-full">Apply Configuration</Button>
    </div>
  </motion.div>
);

const Star = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);
