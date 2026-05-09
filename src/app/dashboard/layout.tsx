'use client';

import React, { Suspense } from 'react';
import { DashboardGate } from './DashboardGate';
import { DashboardChrome } from '../../components/dashboard/DashboardChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-secondary px-6">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
        </div>
      }
    >
      <DashboardGate>
        <DashboardChrome>{children}</DashboardChrome>
      </DashboardGate>
    </Suspense>
  );
}
