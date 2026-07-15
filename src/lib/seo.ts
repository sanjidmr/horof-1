import type { Metadata } from 'next';

const SITE_NAME = 'Horof';
const SITE_DESCRIPTION = 'Premium handcrafted wood crafts, DIY supplies, and home decor from Bangladesh.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';

export function buildMeta({
  title,
  description,
  path,
  images,
  noIndex,
}: {
  title: string;
  description: string;
  path?: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  noIndex?: boolean;
}): Metadata {
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  const ogImages = images?.length ? images : [{ url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630 }];

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_US',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: ogImages.map((i) => i.url),
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

export function generateCategorySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function productJsonLd(product: {
  name: string; description: string | null; price: number; image?: string;
  sku?: string; brand?: string; category?: string; availability?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.image || undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category || undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BDT',
      availability: product.availability || 'https://schema.org/InStock',
    },
  };
}
