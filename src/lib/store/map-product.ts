import type { Product, Category } from '@/lib/types';

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_price?: number | string | null;
  stock: number;
  perfect_for?: string[] | null;
  is_new_arrival?: boolean;
  is_best_selling?: boolean;
  product_images?: { url: string; sort_order: number | null }[] | null;
  categories?: { name: string } | null;
  subcategories?: { name: string } | null;
  product_reviews?: { rating: number; is_approved: boolean }[] | null;
};

export function mapDbProductToCardProduct(row: DbProduct, categoryName?: string): Product {
  const images =
    (row.product_images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.url)
      .filter(Boolean) || [];
  const price = typeof row.price === 'string' ? parseFloat(row.price) : Number(row.price);
  const offer = row.compare_price != null ? (typeof row.compare_price === 'string' ? parseFloat(row.compare_price) : Number(row.compare_price)) : undefined;

  const reviews = (row.product_reviews ?? []).filter(r => r.is_approved);
  const reviewCount = reviews.length;
  const rating = reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    price,
    discountPrice: offer && offer < price ? offer : undefined,
    images: images.length ? images : ['/images/about.jpg'],
    category: categoryName ?? row.categories?.name ?? 'General',
    subcategory: row.subcategories?.name ?? undefined,
    rating,
    reviewCount,
    stock: row.stock,
    tags: row.perfect_for ?? [],
    isNew: row.is_new_arrival ?? false,
    isFeatured: row.is_best_selling ?? false,
  };
}

export function mapDbCategory(row: { id: string; name: string; slug: string; image_url: string | null }, count = 0): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image_url ?? '/images/c1.jpg',
    productCount: count,
  };
}
