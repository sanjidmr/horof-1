'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, User, ShoppingBag, HeadphonesIcon, Settings,
  ArrowLeft, LogOut, Bell, Search, Menu, X,
  Package, CheckCircle2, Clock, AlertCircle, Truck, RotateCcw,
  CreditCard, ShieldCheck, MessageSquare, ChevronDown, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerLayoutClient({
  children,
  user,
  profile,
}: {
  children: ReactNode;
  user: any;
  profile: any;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await supabase?.auth.signOut();
      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to sign out');
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel(`customer-notif-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setShowMobileSidebar(false);
  }, [pathname]);

  const navItems = [
    { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', href: '/customer/profile', icon: User },
    { name: 'My Orders', href: '/customer/orders', icon: ShoppingBag },
    { name: 'Support Center', href: '/customer/support', icon: HeadphonesIcon },
    { name: 'Settings', href: '/customer/settings', icon: Settings },
  ];

  const sidebarItems = [
    ...navItems,
    { name: 'Back to Store', href: '/', icon: ArrowLeft },
  ];

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getNotifIcon = (type?: string) => {
    switch (type) {
      case 'order_confirmed': return <Package className="w-4 h-4" />;
      case 'order_processing': return <Clock className="w-4 h-4" />;
      case 'order_shipped': return <Truck className="w-4 h-4" />;
      case 'order_delivered': return <CheckCircle2 className="w-4 h-4" />;
      case 'order_cancelled': return <AlertCircle className="w-4 h-4" />;
      case 'return_approved': return <RotateCcw className="w-4 h-4" />;
      case 'return_rejected': return <AlertCircle className="w-4 h-4" />;
      case 'refund_completed': return <CreditCard className="w-4 h-4" />;
      case 'support_reply': return <MessageSquare className="w-4 h-4" />;
      case 'account': return <ShieldCheck className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getNotifColor = (type?: string) => {
    switch (type) {
      case 'order_confirmed': return 'bg-blue-500';
      case 'order_processing': return 'bg-amber-500';
      case 'order_shipped': return 'bg-indigo-500';
      case 'order_delivered': return 'bg-emerald-500';
      case 'order_cancelled': return 'bg-red-500';
      case 'return_approved': return 'bg-emerald-500';
      case 'return_rejected': return 'bg-red-500';
      case 'refund_completed': return 'bg-purple-500';
      case 'support_reply': return 'bg-sky-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== MOBILE SIDEBAR ===== */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl lg:hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-[#0F172A] tracking-tight">
                <span className="text-emerald-600">H</span>orof
              </Link>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'Customer'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{profile?.email || user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {sidebarItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                      active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      active ? "bg-emerald-100 text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => { setShowMobileSidebar(false); setShowLogoutModal(true); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
              >
                <div className="p-1.5 rounded-lg bg-red-50 text-red-500">
                  <LogOut className="w-4 h-4" />
                </div>
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== TOP HEADER ===== */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Left: Logo + Mobile Menu */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="text-lg font-bold text-[#0F172A] hidden sm:block">Horof</span>
              </Link>
            </div>

            {/* Center: Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders, products..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search (Mobile) */}
              <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors md:hidden">
                <Search className="w-5 h-5 text-slate-500" />
              </button>

              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifPanel && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[380px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-bold text-slate-800">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">{unreadCount} new</span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto max-h-[360px]">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-400">No notifications yet</p>
                            <p className="text-xs text-slate-300 mt-1">We'll notify you when something arrives</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <button
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.action_url) {
                                  setShowNotifPanel(false);
                                  router.push(n.action_url);
                                }
                              }}
                              className={cn(
                                "w-full text-left px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors group",
                                !n.is_read && "bg-emerald-50/30"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0",
                                  getNotifColor(n.type)
                                )}>
                                  {getNotifIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                    <p className={cn("text-xs font-bold text-slate-800 truncate", !n.is_read && "text-emerald-800")}>{n.title}</p>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{formatTime(n.created_at)}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Account Menu */}
              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                    {profile?.full_name || 'Account'}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", showAccountMenu && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showAccountMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800 truncate">{profile?.full_name || 'Customer'}</p>
                        <p className="text-[11px] text-slate-500 truncate">{profile?.email || user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          href="/customer/profile"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <Link
                          href="/customer/orders"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          My Orders
                        </Link>
                        <Link
                          href="/customer/settings"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </div>
                      <div className="p-1.5 border-t border-slate-100">
                        <button
                          onClick={() => { setShowAccountMenu(false); setShowLogoutModal(true); }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN LAYOUT: Sidebar + Content ===== */}
      <div className="flex">
        {/* ===== DESKTOP SIDEBAR ===== */}
        <aside className="hidden lg:flex flex-col w-[240px] xl:w-[260px] h-[calc(100vh-72px)] sticky top-[72px] bg-white border-r border-slate-200/60 overflow-y-auto">
          {/* Profile Card */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || 'Customer'}</p>
                <p className="text-[11px] text-slate-500 truncate">{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-emerald-500"
                    />
                  )}
                  <div className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    active ? "bg-emerald-100 text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-slate-100 space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 group"
            >
              <div className="p-1.5 rounded-lg text-slate-400 group-hover:text-slate-600 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
              Back to Store
            </Link>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 group w-full"
            >
              <div className="p-1.5 rounded-lg bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              Sign Out
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-h-[calc(100vh-72px)] overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ===== LOGOUT CONFIRMATION MODAL ===== */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                  <LogOut className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Sign Out</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to sign out?</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loggingOut ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing out...</>
                  ) : (
                    'Sign Out'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}