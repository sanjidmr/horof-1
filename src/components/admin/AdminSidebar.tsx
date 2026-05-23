'use client';

import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  TreePine,
  Layers,
  Image as ImageIcon,
  Globe,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useAdminSidebar } from '@/stores/admin-sidebar-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';

type NavItem = {
  title: string;
  href?: string;
  icon: ElementType;
  children?: { title: string; href: string }[];
};

const nav: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Categories', href: '/admin/categories', icon: Layers },
  { title: 'Products', href: '/admin/products', icon: Package },
  { title: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { title: 'Customers', href: '/admin/customers', icon: Users },
  { title: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { 
    title: 'Marketing', 
    icon: ImageIcon,
    children: [
      { title: 'Site Visuals', href: '/admin/marketing/site-images' },
      { title: 'Flash Sale', href: '/admin/marketing/flash-sale' },
      { title: 'Special Offer', href: '/admin/marketing/special-offer' },
      { title: 'FAQ', href: '/admin/marketing/faq' }
    ]
  },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

export function SidebarContent({ collapsed, toggle, logout, closeMobile }: { collapsed?: boolean; toggle?: () => void; logout: () => void; closeMobile?: () => void }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    nav.forEach((n) => {
      if (n.children) init[n.title] = n.children.some((c) => pathname.startsWith(c.href.split('?')[0]));
    });
    return init;
  });

  const toggleGroup = (title: string) => setOpenGroups((g) => ({ ...g, [title]: !g[title] }));

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 border-r border-slate-100">
      <div className="flex h-24 items-center justify-between gap-2 px-6">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center gap-3 group" onClick={closeMobile}>
            <div className="bg-[#1a4731] p-2.5 rounded-2xl shadow-lg shadow-forest-900/10 group-hover:scale-105 transition-transform">
              <TreePine className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-bold tracking-tight text-[#1a4731]">
                Horof<span className="text-emerald-600 font-sans text-[10px] ml-1 uppercase tracking-widest font-black">Admin</span>
              </span>
            </div>
          </Link>
        )}
        {toggle && (
          <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-50 hover:text-[#1a4731]" onClick={toggle}>
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 py-6">
        <nav className="flex flex-col gap-2 px-4">
          {nav.map((item) => {
            const Icon = item.icon;
            if (item.href) {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={closeMobile}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-[1.25rem] px-4 py-3.5 text-sm font-bold transition-all group relative',
                    active 
                      ? 'bg-[#1a4731] text-white shadow-xl shadow-forest-900/20' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#1a4731]',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-[#1a4731]")} />
                  {!collapsed && <span className="tracking-wide">{item.title}</span>}
                  {active && !collapsed && (
                    <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                  )}
                </Link>
              );
            }
            const open = openGroups[item.title] ?? false;
            return (
              <div key={item.title} className="space-y-1">
                <button
                  type="button"
                  title={collapsed ? item.title : undefined}
                  onClick={() => !collapsed && toggleGroup(item.title)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3.5 text-left text-sm font-bold transition-all group',
                    open ? 'text-[#1a4731] bg-slate-50' : 'text-slate-500 hover:bg-slate-50 hover:text-[#1a4731]',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", open ? "text-[#1a4731]" : "text-slate-400 group-hover:text-[#1a4731]")} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 tracking-wide">{item.title}</span>
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </button>
                {!collapsed && open && item.children && (
                  <div className="ml-9 flex flex-col border-l border-slate-100 pl-4 mt-2 space-y-2">
                    {item.children.map((c) => {
                      const base = c.href.split('?')[0];
                      const active = pathname === base || pathname.startsWith(base + '/');
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={closeMobile}
                          className={cn(
                            'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                            active ? 'text-[#1a4731] font-bold' : 'text-slate-500 hover:text-[#1a4731]'
                          )}
                        >
                          {c.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-6 mt-auto flex flex-col gap-2.5">
        <Link href="/" onClick={closeMobile} className="block w-full">
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full flex items-center gap-3 rounded-2xl py-7 text-sm font-bold text-[#1a4731] border-[#1a4731]/20 hover:bg-[#1a4731]/5 hover:text-[#1a4731] hover:border-[#1a4731]/40 transition-all tracking-wide shadow-sm',
              collapsed && 'justify-center px-0'
            )}
          >
            <Globe className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Visit Website</span>}
          </Button>
        </Link>

        <Button
          type="button"
          variant="ghost"
          className={cn(
            'w-full flex items-center gap-3 rounded-2xl py-7 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all tracking-wide border border-transparent hover:border-red-100',
            collapsed && 'justify-center px-0'
          )}
          onClick={logout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const collapsed = useAdminSidebar((s) => s.collapsed);
  const toggle = useAdminSidebar((s) => s.toggle);
  const router = useRouter();

  const logout = async () => {
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={cn(
        'hidden h-svh flex-col border-r border-slate-100 bg-white transition-[width] duration-300 lg:flex',
        collapsed ? 'w-[100px]' : 'w-80'
      )}
    >
      <SidebarContent collapsed={collapsed} toggle={toggle} logout={logout} />
    </aside>
  );
}
