import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProductReviewSummary {
  rating: number;
  reviewCount: number;
}

export async function getProductReviewSummaries(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductReviewSummary>> {
  const summaries = new Map<string, ProductReviewSummary>();
  if (productIds.length === 0) return summaries;

  const { data, error } = await supabase
    .from('product_reviews')
    .select('product_id,rating')
    .in('product_id', productIds)
    .eq('is_approved', true);

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Product review summaries are unavailable because public.product_reviews is missing from the Supabase schema cache:', error);
      return summaries;
    }
    throw error;
  }

  const totals = new Map<string, { sum: number; count: number }>();
  for (const review of data ?? []) {
    const total = totals.get(review.product_id) ?? { sum: 0, count: 0 };
    total.sum += review.rating;
    total.count += 1;
    totals.set(review.product_id, total);
  }

  for (const [productId, total] of totals) {
    summaries.set(productId, {
      rating: total.sum / total.count,
      reviewCount: total.count,
    });
  }

  return summaries;
}
