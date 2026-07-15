import { buildMeta } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = buildMeta({
  title: 'Shop All Products',
  description: 'Browse our complete collection of handcrafted wood crafts, DIY supplies, and home decor at Horof.',
  path: '/products',
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
