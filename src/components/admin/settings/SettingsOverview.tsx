'use client';

import Link from 'next/link';
import {
  Store,
  Truck,
  Bell,
  Mail,
  Share2,
  ShieldCheck,
  FileText,
  ArrowRight,
  Database,
  RefreshCcw,
  CheckCircle2,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';

const modules: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    href: '/admin/settings/general',
    title: 'General',
    description: 'Website name, business address, phone, support email, logos and favicon.',
    icon: Store,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    href: '/admin/settings/shipping',
    title: 'Shipping',
    description: 'Delivery charges, free shipping threshold and estimated delivery time.',
    icon: Truck,
    accent: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  {
    href: '/admin/settings/notifications',
    title: 'Notifications',
    description: 'Enable or disable email, admin, customer, browser and warehouse notifications.',
    icon: Bell,
    accent: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  {
    href: '/admin/settings/email',
    title: 'Email',
    description: 'Sender identity, SMTP provider, password reset emails and test delivery.',
    icon: Mail,
    accent: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  {
    href: '/admin/settings/social',
    title: 'Social',
    description: 'Facebook, Instagram and WhatsApp links that update across the whole site.',
    icon: Share2,
    accent: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  {
    href: '/admin/settings/security',
    title: 'Super Admin Security',
    description: 'Change your password with verification, strong-password rules and audit logging.',
    icon: ShieldCheck,
    accent: 'bg-red-50 text-red-700 border-red-100',
  },
  {
    href: '/admin/settings/legal-pages',
    title: 'Legal Pages',
    description: 'Edit Terms & Conditions and Privacy Policy with a rich text editor.',
    icon: FileText,
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
];

function moduleStatus(href: string, s: ReturnType<typeof useAppSettings>['settings']): string {
  if (!s) return 'Loading…';
  switch (href) {
    case '/admin/settings/general':
      return s.general.website_name || 'No name set';
    case '/admin/settings/shipping': {
      const inside = s.shipping.inside_mymensingh_charge;
      const outside = s.shipping.outside_mymensingh_charge;
      return `Inside ৳${inside} · Outside ৳${outside}`;
    }
    case '/admin/settings/notifications': {
      const enabled = Object.values(s.notifications).filter(Boolean).length;
      return `${enabled} of ${Object.keys(s.notifications).length} channels on`;
    }
    case '/admin/settings/email':
      return s.email.smtp_enabled ? `Custom SMTP · ${s.email.smtp_provider}` : `Provider · ${s.email.smtp_provider}`;
    case '/admin/settings/social': {
      const count = Object.values(s.social).filter(Boolean).length;
      return `${count} of ${Object.keys(s.social).length} links configured`;
    }
    case '/admin/settings/security':
      return 'Password, sessions & audit';
    case '/admin/settings/legal-pages':
      return 'Terms & Privacy Policy';
    default:
      return '';
  }
}

export function SettingsOverview() {
  const { settings, loading } = useAppSettings();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#1a4731] text-white flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">Database-backed</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading || !settings
                ? 'Reading site_settings…'
                : '5 modules stored in site_settings — every value survives reloads.'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#1a4731] text-white flex items-center justify-center shrink-0">
            {loading || !settings ? (
              <RefreshCcw className="h-5 w-5 animate-spin" />
            ) : (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">Real-time sync</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading || !settings
                ? 'Connecting to Supabase realtime…'
                : 'Live — changes propagate across open admin tabs and the storefront instantly.'}
            </p>
          </div>
        </div>
        <Link
          href="/admin/security?tab=audit-logs"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4 hover:shadow-md hover:border-[#1a4731]/30 transition-all group"
        >
          <div className="h-10 w-10 rounded-xl bg-[#1a4731] text-white flex items-center justify-center shrink-0">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Validated & audited
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#1a4731] group-hover:translate-x-0.5 transition-all" />
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              zod validation on every input; each save writes an audit log entry.
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1a4731]">
              <ShieldAlert className="h-3 w-3" />
              Super Admin only
            </span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-[#1a4731]/30 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${m.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 flex items-center gap-2">
                {m.title}
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#1a4731] group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{m.description}</p>
              <p className="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-400 truncate">
                {moduleStatus(m.href, settings)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
