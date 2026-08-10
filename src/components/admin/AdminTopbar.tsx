'use client';

import { useTheme } from 'next-themes';
import { Bell, Menu, Moon, Search, Sun, User, LogOut, ShoppingBag, UserPlus, Package, AlertCircle, Clock, Palette } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useEffect, useState } from 'react';
import { useAdminSidebar } from '@/stores/admin-sidebar-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'customer' | 'stock' | 'product' | 'design';
  is_read: boolean;
  created_at: string;
}

export function AdminTopbar({ email, avatarUrl }: { email: string | null; avatarUrl: string | null }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const toggleMobile = useAdminSidebar((s) => s.toggleMobile);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!supabase) return;

    // Initial fetch — scope by warehouse for warehouse staff
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_warehouse_staff, assigned_warehouse_id')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Warehouse staff sees only their warehouse's notifications
      if (profile?.is_warehouse_staff && profile?.assigned_warehouse_id) {
        query = query.eq('warehouse_id', profile.assigned_warehouse_id);
      }

      const { data } = await query;
      if (data) setNotifications(data as Notification[]);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
          toast.info(`New Notification: ${payload.new.title}`, {
            description: payload.new.message,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => 
            prev.map((n) => n.id === payload.new.id ? payload.new as Notification : n)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    if (!supabase) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const logout = async () => {
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingBag className="h-4 w-4 text-blue-500" />;
      case 'customer': return <UserPlus className="h-4 w-4 text-emerald-500" />;
      case 'stock': return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'product': return <Package className="h-4 w-4 text-amber-500" />;
      case 'design': return <Palette className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <header className="flex h-24 items-center gap-4 bg-white px-8 sticky top-0 z-30 w-full text-slate-800 border-b border-slate-50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-slate-500 hover:text-[#1a4731] hover:bg-slate-50 lg:hidden"
        onClick={toggleMobile}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="relative hidden max-w-md flex-1 md:block group">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-[#1a4731]" />
        <Input 
          placeholder="Search everything..." 
          className="h-12 w-80 bg-slate-50 border-transparent rounded-[1rem] pl-12 pr-4 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#1a4731]/10 focus-visible:border-[#1a4731] transition-all placeholder:text-slate-400" 
          readOnly 
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="relative text-slate-400 hover:text-[#1a4731] hover:bg-slate-50 rounded-xl transition-all" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[9px] font-extrabold text-white shadow-lg shadow-red-500/30">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2 bg-white border-slate-100 text-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <DropdownMenuLabel className="p-0 text-xs font-bold text-slate-400 uppercase tracking-widest">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator className="bg-slate-50" />
            <div className="max-h-[400px] overflow-y-auto py-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      "flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors mb-1 last:mb-0",
                      n.is_read ? "opacity-60 grayscale-[0.5]" : "bg-slate-50/50 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                      n.is_read ? "bg-slate-100" : "bg-white shadow-sm"
                    )}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-xs font-bold leading-none", n.is_read ? "text-slate-600" : "text-slate-900")}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(n.created_at)}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {mounted && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-[#1a4731] hover:bg-slate-50 rounded-xl transition-all"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-14 gap-4 rounded-2xl hover:bg-slate-50 py-1 pl-1 pr-4 transition-all">
              <div className="flex h-11 w-11 items-center justify-center rounded-[0.85rem] bg-[#1a4731] text-xs font-bold text-white shadow-xl shadow-forest-900/20">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full rounded-[0.85rem] object-cover" />
                ) : (
                  (email?.[0] ?? '?').toUpperCase()
                )}
              </div>
              <div className="hidden flex-col items-start sm:flex">
                <span className="max-w-[140px] truncate text-xs font-bold text-slate-900 leading-tight">{email}</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Admin</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 bg-white border-slate-100 text-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50">
            <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-50" />
            <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors">
              <User className="h-4 w-4 text-[#1a4731]" />
              <span className="text-sm font-medium">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-50" />
            <DropdownMenuItem onClick={logout} className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50 cursor-pointer transition-colors">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-bold">Logout Session</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
