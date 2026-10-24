import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbProductToCardProduct } from './map-product';
import type { Product } from '@/lib/types';
import { getProductReviewSummaries } from './review-summaries';

export async function getRelatedProducts(categoryName: string, currentProductId: string): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  // First get the category ID
  const { data: catData } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  if (!catData) return [];

  const { data: rows } = await supabase
    .from('products')
    .select('id,name,slug,description,price,offer_price,stock,specification,perfect_for,perfect_for_tags,meta_title,meta_description,product_images(url,sort_order),categories(name)')
    .eq('category_id', catData.id)
    .neq('id', currentProductId)
    .eq('is_active', true)
    .limit(4);

  if (!rows) return [];

  const reviewSummaries = await getProductReviewSummaries(supabase, rows.map((row) => row.id));
  return rows.map((row) => {
    const product = mapDbProductToCardProduct(row as never, categoryName);
    const summary = reviewSummaries.get(row.id);
    product.rating = summary?.rating ?? 0;
    product.reviewCount = summary?.reviewCount ?? 0;
    return product;
  });
}
