import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/checkout/', '/account/'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
