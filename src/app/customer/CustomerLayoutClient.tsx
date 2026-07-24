'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, ShoppingBag, LogOut, Home, ArrowLeft, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

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

  const logout = async () => {
    const sb = createSupabaseBrowserClient();
    await sb?.auth.signOut();
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/customer/dashboard', icon: Home },
    { name: 'My Profile', href: '/customer/profile', icon: User },
    { name: 'My Orders', href: '/customer/orders', icon: ShoppingBag },
    { name: 'Support', href: '/customer/support', icon: HelpCircle },
  ];

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
