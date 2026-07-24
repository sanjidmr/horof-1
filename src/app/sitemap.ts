import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  const supabase = await createSupabaseServerClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/products`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  const { data: categories } = await supabase?.from('categories').select('slug, updated_at').eq('is_active', true);
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${siteUrl}/category/${c.slug}`,
    lastModified: new Date(c.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const { data: products } = await supabase?.from('products').select('slug, updated_at').eq('is_active', true);
  const productPages: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${siteUrl}/product/${p.slug}`,
    lastModified: new Date(p.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
