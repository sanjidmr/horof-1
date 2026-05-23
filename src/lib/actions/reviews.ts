'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ReviewWithProfile = {
  id: string;
  product_id: string;
  customer_id: string;
  order_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type ReviewStats = {
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

// ─── Fetch all approved reviews for a product ────────────────────────────────
export async function getProductReviews(productId: string): Promise<ReviewWithProfile[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getProductReviews]', error.message);
    return [];
  }

  return (data ?? []) as ReviewWithProfile[];
}

// ─── Compute rating stats ─────────────────────────────────────────────────────
export async function getReviewStats(productId: string): Promise<ReviewStats> {
  const reviews = await getProductReviews(productId);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const star = r.rating as 1 | 2 | 3 | 4 | 5;
    distribution[star] = (distribution[star] ?? 0) + 1;
    sum += r.rating;
  }

  return {
    average: reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : 0,
    total: reviews.length,
    distribution,
  };
}

// ─── Check if a user has purchased and received the product ───────────────────
export async function getReviewableOrders(
  productId: string
): Promise<{ orderId: string; orderNumber: string; alreadyReviewed: boolean }[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Delivered orders containing this product
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, orders!inner(id, order_number, status, customer_id)')
    .eq('product_id', productId);

  if (!orderItems) return [];

  // Filter to only delivered orders owned by this user
  const deliveredItems = orderItems.filter((item: any) => {
    const order = item.orders;
    return order && order.status === 'delivered' && order.customer_id === user.id;
  });

  // Check which orders already have a review
  const { data: existingReviews } = await supabase
    .from('product_reviews')
    .select('order_id')
    .eq('product_id', productId)
    .eq('customer_id', user.id);

  const reviewedOrderIds = new Set((existingReviews ?? []).map((r: any) => r.order_id));

  return deliveredItems.map((item: any) => ({
    orderId: item.orders.id,
    orderNumber: item.orders.order_number,
    alreadyReviewed: reviewedOrderIds.has(item.orders.id),
  }));
}

// ─── Submit a review ──────────────────────────────────────────────────────────
export async function submitReview(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to leave a review.' };
  }

  const productId = formData.get('product_id') as string;
  const orderId   = formData.get('order_id')   as string;
  const rating    = Number(formData.get('rating'));
  const title     = (formData.get('title') as string)?.trim() || null;
  const body      = (formData.get('body')  as string)?.trim() || null;
  const slug      = formData.get('slug')    as string;

  if (!productId || !orderId || !rating) {
    return { success: false, error: 'Missing required fields.' };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5.' };
  }

  // Verify this user actually has a delivered order containing this product
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('order_id, orders!inner(id, status, customer_id)')
    .eq('product_id', productId)
    .eq('order_id', orderId)
    .single();

  if (!orderItem) {
    return { success: false, error: 'Order not found.' };
  }

  const order = (orderItem as any).orders;
  if (!order || order.customer_id !== user.id) {
    return { success: false, error: 'You are not authorised to review this order.' };
  }
  if (order.status !== 'delivered') {
    return { success: false, error: 'You can only review products from delivered orders.' };
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id:  productId,
    customer_id: user.id,
    order_id:    orderId,
    rating,
    title,
    body,
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You have already reviewed this product for this order.' };
    }
    console.error('[submitReview]', error.message);
    return { success: false, error: 'Failed to submit review. Please try again.' };
  }

  revalidatePath(`/product/${slug}`);
  return { success: true };
}

// ─── Delete own review ────────────────────────────────────────────────────────
export async function deleteReview(
  reviewId: string,
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('customer_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/product/${slug}`);
  return { success: true };
}
