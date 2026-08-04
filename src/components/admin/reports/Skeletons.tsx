'use client';

import { Skeleton } from '@/components/shadcn/skeleton';

export function StatCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20 rounded-full bg-slate-100" />
          <Skeleton className="h-7 w-28 rounded-lg bg-slate-100" />
          <Skeleton className="h-3 w-16 rounded-full bg-slate-100" />
        </div>
        <Skeleton className="h-11 w-11 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32 rounded-full bg-slate-100" />
        <Skeleton className="h-4 w-20 rounded-full bg-slate-100" />
      </div>
      <Skeleton className="w-full rounded-2xl bg-slate-100" style={{ height }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-36 rounded-full bg-slate-100" />
        <Skeleton className="h-8 w-24 rounded-xl bg-slate-100" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function ReportGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
