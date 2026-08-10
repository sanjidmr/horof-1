'use client';

import { RefreshCw, Cloud, CloudOff } from 'lucide-react';

export function LiveSyncBadge({ live, loading }: { live: boolean; loading?: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Syncing…
      </span>
    );
  }
  return live ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold">
      <Cloud className="h-3 w-3" />
      Live sync
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold">
      <CloudOff className="h-3 w-3" />
      Unsaved changes
    </span>
  );
}
