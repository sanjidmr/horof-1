'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, ShoppingBag, LogOut, Home, ArrowLeft, HelpCircle, Bell, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

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
  const supabase = createSupabaseBrowserClient();

  const logout = async () => {
    await supabase?.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
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
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel(`customer-notif-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  const navItems = [
    { name: 'Dashboard', href: '/customer/dashboard', icon: Home },
    { name: 'My Profile', href: '/customer/profile', icon: User },
    { name: 'My Orders', href: '/customer/orders', icon: ShoppingBag },
    { name: 'Support', href: '/customer/support', icon: HelpCircle },
  ];

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-center md:justify-start">
          <Link href="/" className="text-xl font-display font-bold text-[#1B4332]">
            Horof
          </Link>
        </div>
        
        <div className="p-6 text-center md:text-left border-b border-slate-100">
          <div className="h-16 w-16 mx-auto md:mx-0 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center text-xl font-bold mb-3 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.full_name?.[0] || 'U').toUpperCase()
            )}
          </div>
          <p className="font-bold text-slate-900">{profile?.full_name || 'Customer'}</p>
          <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
        </div>

        {/* Notification Bell */}
        <div className="px-4 pt-4 relative">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            Notifications
          </button>

          {showNotifPanel && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-bold text-[#1B4332] hover:underline flex items-center gap-1">
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto max-h-64">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center">No notifications yet</p>
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
                        "w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors",
                        !n.is_read && "bg-[#E6F0EB]/30"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#1B4332] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-bold text-slate-800 truncate", !n.is_read && "text-[#1B4332]")}>{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{formatTime(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-[#1B4332] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" /> Back to Store
          </Link>
           <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}
