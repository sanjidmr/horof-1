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
  keywords,
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  noIndex?: boolean;
  keywords?: string[];
  type?: 'website' | 'article';
}): Metadata {
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  const ogImages = images?.length ? images : [{ url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630 }];

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    keywords: keywords?.join(', '),
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type,
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

export function generateSeoSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
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
  url?: string; rating?: number; reviewCount?: number; condition?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.image || undefined,
    sku: product.sku || undefined,
    url: product.url ? `${SITE_URL}${product.url}` : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: product.category || undefined,
    condition: product.condition || 'https://schema.org/NewCondition',
    aggregateRating: product.rating && product.reviewCount ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BDT',
      availability: product.availability || 'https://schema.org/InStock',
      url: product.url ? `${SITE_URL}${product.url}` : undefined,
    },
  };
}

export function organizationJsonLd(settings?: {
  name?: string; url?: string; logo?: string; description?: string;
  address?: string; phone?: string; email?: string; socialLinks?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.name || 'Horof',
    url: settings?.url || SITE_URL,
    logo: settings?.logo || `${SITE_URL}/logo.png`,
    description: settings?.description || SITE_DESCRIPTION,
    address: settings?.address ? {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
    } : undefined,
    contactPoint: settings?.phone ? {
      '@type': 'ContactPoint',
      telephone: settings.phone,
      contactType: 'customer service',
    } : undefined,
    sameAs: settings?.socialLinks || [],
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function localBusinessJsonLd(settings?: {
  name?: string; description?: string; address?: string;
  phone?: string; email?: string; priceRange?: string;
  openingHours?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings?.name || 'Horof',
    description: settings?.description || SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: settings?.phone,
    email: settings?.email,
    priceRange: settings?.priceRange || '$$',
    address: settings?.address ? {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
    } : undefined,
    openingHours: settings?.openingHours,
  };
}
