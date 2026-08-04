'use client';

import { Inbox, type LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data available',
  message,
}: {
  icon?: LucideIcon;
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
        <Icon className="h-6 w-6 text-slate-300" />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs text-slate-400">{message}</p>}
    </div>
  );
}
