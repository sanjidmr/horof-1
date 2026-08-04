'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Package, Users, BarChart3, ShoppingCart, Boxes, Wallet, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Dashboard', href: '/admin/reports/dashboard', icon: LayoutDashboard },
  { label: 'Sales', href: '/admin/reports/sales', icon: TrendingUp },
  { label: 'Products', href: '/admin/reports/products', icon: Package },
  { label: 'Customers', href: '/admin/reports/customers', icon: Users },
  { label: 'P&L', href: '/admin/reports/profit-loss', icon: BarChart3 },
  { label: 'Orders', href: '/admin/reports/orders', icon: ShoppingCart },
  { label: 'Inventory', href: '/admin/reports/inventory', icon: Boxes },
  { label: 'Expenses', href: '/admin/reports/expenses', icon: ReceiptText },
  { label: 'Payments', href: '/admin/reports/payments', icon: Wallet },
];

export function ReportNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
              active
                ? 'bg-[#1a4731] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
