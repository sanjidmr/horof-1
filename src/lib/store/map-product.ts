import type { Product, Category } from '@/lib/types';

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  offer_price: number | string | null;
  stock: number;
  perfect_for?: string[] | null;
  section?: string | null;
  product_images?: { image_url: string; sort_order: number | null }[] | null;
  categories?: { name: string } | null;
};

export function mapDbProductToCardProduct(row: DbProduct, categoryName?: string): Product {
  const images =
    (row.product_images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.image_url)
      .filter(Boolean) || [];
  const price = typeof row.price === 'string' ? parseFloat(row.price) : Number(row.price);
  const offer = row.offer_price != null ? (typeof row.offer_price === 'string' ? parseFloat(row.offer_price) : Number(row.offer_price)) : undefined;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    price,
    discountPrice: offer && offer < price ? offer : undefined,
    images: images.length ? images : ['/images/about.jpg'],
    category: categoryName ?? row.categories?.name ?? 'General',
    rating: 0,
    reviewCount: 0,
    stock: row.stock,
    tags: row.perfect_for ?? [],
    isNew: row.section === 'new_arrival',
    isFeatured: row.section === 'best_selling',
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
