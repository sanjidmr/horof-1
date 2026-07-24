'use client';

import { type ElementType } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ElementType;
  trend?: { value: number; positive: boolean };
  color?: string;
}

export function KPICard({ label, value, subtitle, icon: Icon, trend, color }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color || 'bg-slate-50')}>
            <Icon className={cn("w-5 h-5", color ? 'text-white' : 'text-slate-600')} />
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <span className={cn("text-xs font-bold", trend.positive ? 'text-emerald-600' : 'text-red-500')}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-[10px] text-slate-400">vs prev period</span>
        </div>
      )}
    </div>
  );
}
