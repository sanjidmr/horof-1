import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '../index.css';
import { ClientLayout } from './ClientLayout';
import { buildMeta } from '@/lib/seo';
// TrackingProvider removed from server rendering for debugging (may block SSR if it performs DB reads)
// import TrackingLoader from '@/components/seo/TrackingLoader';
import { getPublicSettings } from '@/lib/actions/app-settings';
import { DEFAULT_GENERAL } from '@/lib/settings/types';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
});

export async function generateMetadata(): Promise<Metadata> {
  let siteName = 'Horof';
  let description = 'An elegant e-commerce platform for handcrafted wood goods and art supplies.';
  try {
    const pub = await getPublicSettings();
    if (pub.general.website_name) siteName = pub.general.website_name;
  } catch (err) {
    // keep defaults
  }
  return buildMeta({
    title: `${siteName} - Premium Wood Crafts`,
    description,
  });
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let favicon = DEFAULT_GENERAL.favicon;
  try {
    const pub = await getPublicSettings();
    if (pub.general.favicon) favicon = pub.general.favicon;
  } catch (err) {
    // keep default
  }

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href={favicon} />
      </head>
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
