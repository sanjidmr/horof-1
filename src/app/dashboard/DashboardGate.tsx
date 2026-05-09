'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/dashboard';
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const qs = searchParams?.toString();
      const nextTarget = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/login?next=${encodeURIComponent(nextTarget)}`);
    }
  }, [isLoading, pathname, router, searchParams, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-secondary px-6">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-secondary">Loading your dashboard…</p>
      </div>
    );
  }

  return <>{children}</>;
}
