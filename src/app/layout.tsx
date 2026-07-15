import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '../index.css';
import { ClientLayout } from './ClientLayout';
import { buildMeta } from '@/lib/seo';
import TrackingProvider from '@/components/seo/TrackingProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = buildMeta({
  title: 'Horof - Premium Wood Crafts',
  description: 'An elegant e-commerce platform for handcrafted wood goods and art supplies.',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <Suspense fallback={null}>
          <TrackingProvider />
        </Suspense>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
