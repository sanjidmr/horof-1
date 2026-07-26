'use client';

import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  TreePine,
  Layers,
  Image as ImageIcon,
  Globe,
  MessageSquare,
  ClipboardList,
  Warehouse,
  BarChart3,
  Monitor,
  Headset,
  Shield,
  UserCog,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useAdminSidebar } from '@/stores/admin-sidebar-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/context/PermissionContext';
import { useAuth } from '@/context/AuthContext';

type NavItem = {
  title: string;
  href?: string;
  icon: ElementType;
  permission?: string;
  children?: { title: string; href: string; permission?: string }[];
};

const allNav: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { title: 'Categories', href: '/admin/categories', icon: Layers, permission: 'categories.view' },
  {
    title: 'Products',
    icon: Package,
    permission: 'products.view',
    children: [
      { title: 'All Products', href: '/admin/products', permission: 'products.view' },
      { title: 'Add New Product', href: '/admin/products/new', permission: 'products.create' },
      { title: 'Bulk Upload', href: '/admin/products/bulk-upload', permission: 'products.create' },
      { title: 'Returns', href: '/admin/returns', permission: 'orders.view' },
    ],
  },
  { title: 'Orders', href: '/admin/orders', icon: ShoppingCart, permission: 'orders.view' },
  { title: 'Order Requests', href: '/admin/order-requests', icon: ClipboardList, permission: 'orders.view' },
  { title: 'Design Requests', href: '/admin/design-requests', icon: Palette, permission: 'orders.view' },
  { title: 'Warehouse', href: '/admin/warehouse/orders', icon: Warehouse, permission: 'inventory.view' },
  { title: 'Customers', href: '/admin/customers', icon: Users, permission: 'customers.view' },
  {
    title: 'Reports',
    icon: BarChart3,
    permission: 'reports.view',
    children: [
      { title: 'Dashboard', href: '/admin/reports/dashboard', permission: 'reports.view' },
      { title: 'Sales', href: '/admin/reports/sales', permission: 'reports.sales' },
      { title: 'Products', href: '/admin/reports/products', permission: 'reports.products' },
      { title: 'Customers', href: '/admin/reports/customers', permission: 'reports.customers' },
      { title: 'Profit & Loss', href: '/admin/reports/profit-loss', permission: 'reports.finance' },
      { title: 'Orders', href: '/admin/reports/orders', permission: 'reports.view' },
      { title: 'Inventory', href: '/admin/reports/inventory', permission: 'reports.inventory' },
      { title: 'Finance', href: '/admin/reports/finance', permission: 'reports.finance' },
      { title: 'Shipping', href: '/admin/reports/shipping', permission: 'reports.view' },
      { title: 'Marketing', href: '/admin/reports/marketing', permission: 'reports.marketing' },
      { title: 'Suppliers', href: '/admin/reports/suppliers', permission: 'reports.view' },
      { title: 'Team Activity', href: '/admin/reports/employees', permission: 'reports.view' },
      { title: 'Website Analytics', href: '/admin/reports/analytics', permission: 'analytics.view' },
    ]
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    permission: 'inventory.view',
    children: [
      { title: 'Dashboard', href: '/admin/inventory', permission: 'inventory.view' },
      { title: 'Products', href: '/admin/inventory/products', permission: 'inventory.view' },
      { title: 'Warehouses', href: '/admin/inventory/warehouses', permission: 'warehouse.view' },
      { title: 'Stock Transfers', href: '/admin/inventory/transfers', permission: 'inventory.transfers' },
    ]
  },
  { title: 'Messages', href: '/admin/messages', icon: MessageSquare, permission: 'contact_messages.view' },
  {
    title: 'Support',
    icon: Headset,
    permission: 'security.view',
    children: [
      { title: 'Dashboard', href: '/admin/support', permission: 'security.view' },
      { title: 'Tickets', href: '/admin/support?tab=tickets', permission: 'security.view' },
    ]
  },
  {
    title: 'Marketing',
    icon: ImageIcon,
    permission: 'marketing.coupons',
    children: [
      { title: 'Marketing Settings', href: '/admin/marketing/settings', permission: 'marketing.coupons' },
      { title: 'SEO Settings', href: '/admin/marketing/seo', permission: 'marketing.coupons' },
      { title: 'Redirects', href: '/admin/marketing/redirects', permission: 'marketing.coupons' },
      { title: 'Product Feeds', href: '/admin/marketing/feeds', permission: 'marketing.coupons' },
      { title: 'Coupons', href: '/admin/marketing/coupons', permission: 'marketing.coupons' },
      { title: 'Free Shipping', href: '/admin/marketing/free-shipping', permission: 'marketing.coupons' },
      { title: 'Popup Campaigns', href: '/admin/marketing/popup-campaigns', permission: 'marketing.popups' },
      { title: 'Flash Sale', href: '/admin/marketing/flash-sale', permission: 'marketing.flash_sale' },
      { title: 'Special Offer', href: '/admin/marketing/special-offer', permission: 'marketing.special_offer' },
      { title: 'Email Campaigns', href: '/admin/marketing/email-campaigns', permission: 'marketing.coupons' },
      { title: 'Subscribers', href: '/admin/marketing/subscribers', permission: 'marketing.coupons' },
    ]
  },
  { title: 'Users', href: '/admin/users', icon: UserCog, permission: 'users.view' },
  { title: 'Security Center', href: '/admin/security', icon: Shield, permission: 'security.view' },
  {
    title: 'Display Pages',
    icon: Monitor,
    permission: 'settings.view',
    children: [
      { title: 'Site Visuals', href: '/admin/marketing/site-images', permission: 'marketing.site_visuals' },
      { title: 'Our Services', href: '/admin/marketing/services', permission: 'marketing.services' },
      { title: 'FAQ', href: '/admin/marketing/faq', permission: 'marketing.faq' },
      { title: 'About', href: '/admin/settings/about', permission: 'settings.view' },
    ]
  },
];

export function SidebarContent({ collapsed, toggle, logout, closeMobile }: { collapsed?: boolean; toggle?: () => void; logout: () => void; closeMobile?: () => void }) {
  const pathname = usePathname();
  const { hasPermission, loading: permLoading, isSuperAdmin } = usePermissions();
  const { isWarehouseStaff } = useAuth();

  const warehouseOnlyNav: NavItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { title: 'Warehouse Orders', href: '/admin/warehouse/orders', icon: Warehouse, permission: 'inventory.view' },
    { title: 'My Products', href: '/admin/warehouse/products', icon: Package, permission: 'inventory.view' },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    allNav.forEach((n) => {
      if (n.children) init[n.title] = n.children.some((c) => pathname.startsWith(c.href.split('?')[0]));
    });
    return init;
  });

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    const fetchPending = async () => {
      const { count } = await sb
        .from('order_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(count || 0);
    };
    fetchPending();

    const channel = sb
      .channel('sidebar_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const toggleGroup = (title: string) => setOpenGroups((g) => ({ ...g, [title]: !g[title] }));

  const nav = useMemo(() => {
    if (permLoading) return allNav;

    if (isWarehouseStaff) return warehouseOnlyNav;

    if (isSuperAdmin) return allNav;

    return allNav
      .map(item => {
        if (item.permission && !hasPermission(item.permission)) return null;

        if (item.children) {
          const filteredChildren = item.children.filter(
            child => !child.permission || hasPermission(child.permission)
          );
          if (filteredChildren.length === 0 && item.permission) return null;
          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter(Boolean) as NavItem[];
  }, [permLoading, hasPermission, isWarehouseStaff, isSuperAdmin]);

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
                  {item.title === 'Order Requests' && pendingCount > 0 && !collapsed && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                  {active && !collapsed && (
                    <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white/40" />
                  )}
                </Link>
              );
            }
            const open = openGroups[item.title] ?? false;
            const visibleChildren = item.children || [];
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
                {!collapsed && open && visibleChildren.length > 0 && (
                  <div className="ml-9 flex flex-col border-l border-slate-100 pl-4 mt-2 space-y-2">
                    {visibleChildren.map((c) => {
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
