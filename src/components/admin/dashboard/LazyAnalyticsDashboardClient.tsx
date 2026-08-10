'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/admin/reports/Skeletons';

export const LazyAnalyticsDashboardClient = dynamic(
  () => import('./AnalyticsDashboardClient').then((m) => ({ default: m.AnalyticsDashboardClient })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <ChartSkeleton height={300} />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height={240} />
          <ChartSkeleton height={240} />
        </div>
      </div>
    ),
  },
);
