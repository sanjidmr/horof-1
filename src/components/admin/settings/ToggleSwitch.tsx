'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start justify-between gap-4 rounded-xl border p-4 text-left transition-all',
        checked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 cursor-pointer'
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        {description && <p className="text-[11px] text-slate-500 leading-snug">{description}</p>}
      </div>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-[#1a4731]' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
}
