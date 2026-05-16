import type { ReactNode } from 'react';
import { AccountSidebar } from '@/components/account/AccountSidebar';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-display font-medium text-slate-900">My Account</h1>
          <p className="text-slate-500 text-sm mt-2">Manage your profile, orders, and addresses.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          <AccountSidebar />
          <div className="flex-1">
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 min-h-[500px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

