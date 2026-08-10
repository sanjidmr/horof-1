import type { Product } from '../types';
import type { DbProductRow } from './types';
import { extractProductImages } from '../store/extract-images';

export function mapDbProductToProduct(row: DbProductRow): Product {
  const priceRaw = row.price;
  const priceNum = typeof priceRaw === 'string' ? parseFloat(priceRaw) : Number(priceRaw);

  return {
    id: row.id,
    name: row.name,
    description: '',
    price: Number.isFinite(priceNum) ? priceNum : 0,
    images: extractProductImages(row.product_images),
    category: 'Curated',
    rating: 0,
    reviewCount: 0,
    stock: 99,
    tags: [],
    isNew: false,
    isFeatured: false,
  };
}
