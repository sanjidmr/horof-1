'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

const ACCENTS: Record<string, { chip: string; icon: string }> = {
  green: { chip: 'bg-emerald-50 text-emerald-600', icon: 'text-emerald-600' },
  blue: { chip: 'bg-blue-50 text-blue-600', icon: 'text-blue-600' },
  amber: { chip: 'bg-amber-50 text-amber-600', icon: 'text-amber-600' },
  red: { chip: 'bg-red-50 text-red-600', icon: 'text-red-600' },
  violet: { chip: 'bg-violet-50 text-violet-600', icon: 'text-violet-600' },
  slate: { chip: 'bg-slate-100 text-slate-600', icon: 'text-slate-600' },
};

export interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: keyof typeof ACCENTS | string;
  trend?: { value: string; up: boolean } | null;
  hint?: string;
}

export function StatCard({ label, value, sub, icon, accent = 'green', trend, hint }: StatCardProps) {
  const a = ACCENTS[accent] ?? ACCENTS.green;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 truncate">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</p>
          {(sub || hint) && <p className="mt-1 text-xs text-slate-400 truncate">{sub || hint}</p>}
        </div>
        {icon && <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', a.chip)}>{icon}</div>}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            trend.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}
        >
          {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.value}
        </div>
      )}
    </div>
  );
}
