import React from 'react';
import Link from 'next/link';
import { ChevronRight, Shield } from 'lucide-react';

type Section = {
  id: string;
  title: string;
  content: string;
  order: number;
};

type LegalPageData = {
  title: string;
  subtitle: string;
  content: Section[];
  contact_info: string;
  last_updated: string;
  meta_title: string;
  meta_description: string;
};

export function LegalPageContent({ data }: { data: LegalPageData }) {
  const sorted = [...(data.content || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-svh bg-white">
      <div className="bg-gradient-to-b from-emerald-50/50 to-white border-b border-emerald-100/50">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600/70">
              Legal
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight mb-4">
            {data.title}
          </h1>
          {data.subtitle && (
            <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
              {data.subtitle}
            </p>
          )}
          {data.last_updated && (
            <p className="text-sm text-slate-400 mt-4 font-medium">
              Last updated: {new Date(data.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          {sorted.map((section, i) => (
            <section key={section.id} id={section.id}>
              <div className="flex items-start gap-4">
                <div className="hidden md:flex h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-emerald-700">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 leading-tight">
                    {section.title}
                  </h2>
                  <div
                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-emerald-700 prose-a:font-medium hover:prose-a:text-emerald-800 prose-strong:text-slate-800"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>
              </div>
            </section>
          ))}
        </div>

        {data.contact_info && (
          <div className="mt-16 p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Questions?</h3>
            <div
              className="prose prose-slate max-w-none prose-p:text-slate-600"
              dangerouslySetInnerHTML={{ __html: data.contact_info }}
            />
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors group"
            >
              Contact Us
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
