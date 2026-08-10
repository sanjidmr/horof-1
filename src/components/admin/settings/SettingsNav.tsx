import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type SettingsSection = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function SettingsNav({ sections }: { sections: SettingsSection[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 w-full">
      {sections.map((s) => {
        const active = pathname === s.href || pathname.startsWith(s.href + '/');
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              'group flex items-start gap-3 rounded-xl px-4 py-3 transition-all',
              active
                ? 'bg-[#1a4731] text-white shadow-lg shadow-[#1a4731]/20'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', active ? 'text-emerald-200' : 'text-[#1a4731]')} />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">{s.title}</p>
              <p className={cn('text-[11px] leading-snug mt-0.5', active ? 'text-emerald-100/80' : 'text-slate-400')}>
                {s.description}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
