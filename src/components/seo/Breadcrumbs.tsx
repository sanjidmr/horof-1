import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com' },
      ...items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.name,
        ...(item.href ? { item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com'}${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-8 md:mb-12 ${className}`}>
        <Link href="/" className="hover:text-[#2D6A4F] transition-colors flex items-center gap-1">
          <Home className="w-3 h-3" />
          <span className="sr-only">Home</span>
        </Link>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
            {item.href ? (
              <Link href={item.href} className="hover:text-[#2D6A4F] transition-colors truncate max-w-[150px]">
                {item.name}
              </Link>
            ) : (
              <span className="text-slate-950 truncate max-w-[200px]">{item.name}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </>
  );
}
