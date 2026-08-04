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
  admin_reply: string | null;
  admin_reply_at: string | null;
  variant_info: { size?: string | null; color?: string | null } | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  products: {
    id: string;
    name: string;
    slug: string;
  } | null;
  orders: {
    id: string;
    order_number: string;
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
    .select('*, profiles(full_name, avatar_url), products(id, name, slug), orders(id, order_number)')
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
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true);

  if (error) {
    console.error('[getReviewStats]', error.message);
    return { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }

  const reviews = data ?? [];
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

// ─── Get rating + review count for a single product (lightweight) ────────────
export async function getProductRating(productId: string): Promise<{ rating: number; reviewCount: number }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true);

  if (error || !data) return { rating: 0, reviewCount: 0 };

  const count = data.length;
  if (count === 0) return { rating: 0, reviewCount: 0 };

  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / count) * 10) / 10, reviewCount: count };
}

// ─── Get ratings for multiple products at once (for product cards/listings) ──
export async function getBulkProductRatings(
  productIds: string[]
): Promise<Record<string, { rating: number; reviewCount: number }>> {
  const supabase = await createSupabaseServerClient();
  const result: Record<string, { rating: number; reviewCount: number }> = {};

  if (productIds.length === 0) return result;

  const { data, error } = await supabase
    .from('product_reviews')
    .select('product_id, rating')
    .in('product_id', productIds)
    .eq('is_approved', true);

  if (error || !data) {
    for (const id of productIds) result[id] = { rating: 0, reviewCount: 0 };
    return result;
  }

  const grouped: Record<string, number[]> = {};
  for (const r of data) {
    if (!grouped[r.product_id]) grouped[r.product_id] = [];
    grouped[r.product_id].push(r.rating);
  }

  for (const id of productIds) {
    const ratings = grouped[id] ?? [];
    if (ratings.length === 0) {
      result[id] = { rating: 0, reviewCount: 0 };
    } else {
      const sum = ratings.reduce((a, b) => a + b, 0);
      result[id] = { rating: Math.round((sum / ratings.length) * 10) / 10, reviewCount: ratings.length };
    }
  }

  return result;
}

// ─── Check if a user has purchased and received the product ───────────────────
export async function getReviewableOrders(
  productId: string
): Promise<{ orderId: string; orderNumber: string; alreadyReviewed: boolean; variantInfo: { size?: string | null; color?: string | null } | null }[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Delivered orders containing this product
  const { data: orderItems, error: oiError } = await supabase
    .from('order_items')
    .select('order_id, variant_id, orders!inner(id, order_number, status, customer_id), product_variants(size, color)')
    .eq('product_id', productId);

  if (oiError || !orderItems) return [];

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
    variantInfo: item.product_variants ? { size: item.product_variants.size, color: item.product_variants.color } : null,
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
  const variantInfoRaw = formData.get('variant_info') as string;

  if (!productId || !orderId || !rating) {
    return { success: false, error: 'Missing required fields.' };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5.' };
  }

  // Verify this user actually has a delivered order containing this product
  const { data: orderItem } = await supabase
    .from('order_items')
    .select('order_id, variant_id, orders!inner(id, status, customer_id), product_variants(size, color)')
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

  // Build variant_info from the order item's variant
  let variantInfo: { size?: string | null; color?: string | null } | null = null;
  if (variantInfoRaw) {
    try { variantInfo = JSON.parse(variantInfoRaw); } catch { variantInfo = null; }
  } else if ((orderItem as any).product_variants) {
    variantInfo = {
      size: (orderItem as any).product_variants.size,
      color: (orderItem as any).product_variants.color,
    };
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id:  productId,
    customer_id: user.id,
    order_id:    orderId,
    rating,
    title,
    body,
    is_approved: false, // Pending moderation
    variant_info: variantInfo ?? {},
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You have already reviewed this product for this order.' };
    }
    console.error('[submitReview]', error.message);
    return { success: false, error: 'Failed to submit review. Please try again.' };
  }

  // Revalidate all relevant paths
  revalidatePath(`/products/${slug}`);
  revalidatePath(`/products/${productId}`);
  revalidatePath('/products');
  revalidatePath('/');
  revalidatePath('/admin/reviews');

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

  revalidatePath(`/products/${slug}`);
  revalidatePath('/products');
  revalidatePath('/');
  revalidatePath('/admin/reviews');

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN REVIEW MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export type AdminReviewFilter = {
  productId?: string;
  rating?: number;
  status?: 'all' | 'approved' | 'pending' | 'rejected';
  search?: string;
};

// ─── Admin: Get all reviews with filters ──────────────────────────────────────
export async function adminGetAllReviews(filter: AdminReviewFilter = {}): Promise<ReviewWithProfile[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return [];

  let query = supabase
    .from('product_reviews')
    .select('*, profiles(full_name, avatar_url), products(id, name, slug), orders(id, order_number)')
    .order('created_at', { ascending: false });

  if (filter.productId) {
    query = query.eq('product_id', filter.productId);
  }
  if (filter.rating) {
    query = query.eq('rating', filter.rating);
  }
  if (filter.status === 'approved') {
    query = query.eq('is_approved', true);
  } else if (filter.status === 'pending') {
    query = query.eq('is_approved', false);
  }
  if (filter.search) {
    query = query.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[adminGetAllReviews]', error.message);
    return [];
  }

  return (data ?? []) as ReviewWithProfile[];
}

// ─── Admin: Approve a review ──────────────────────────────────────────────────
export async function adminApproveReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { success: false, error: 'Admin access required.' };

  const { error } = await supabase
    .from('product_reviews')
    .update({ is_approved: true })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/reviews');
  revalidatePath('/products');
  revalidatePath('/');

  return { success: true };
}

// ─── Admin: Reject a review (unapprove) ───────────────────────────────────────
export async function adminRejectReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('reviews.reject');
  } catch (e: any) {
    return { success: false, error: e?.message || 'Permission denied.' };
  }

  const { error } = await supabase
    .from('product_reviews')
    .update({ is_approved: false })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/reviews');
  revalidatePath('/products');
  revalidatePath('/');

  return { success: true };
}

// ─── Admin: Delete a review ───────────────────────────────────────────────────
export async function adminDeleteReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('reviews.delete');
  } catch (e: any) {
    return { success: false, error: e?.message || 'Permission denied.' };
  }

  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/reviews');
  revalidatePath('/products');
  revalidatePath('/');

  return { success: true };
}

// ─── Admin: Reply to a review ─────────────────────────────────────────────────
export async function adminReplyToReview(
  reviewId: string,
  reply: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated.' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('reviews.edit');
  } catch (e: any) {
    return { success: false, error: e?.message || 'Permission denied.' };
  }

  const trimmedReply = reply.trim();
  if (!trimmedReply) return { success: false, error: 'Reply cannot be empty.' };

  const { error } = await supabase
    .from('product_reviews')
    .update({
      admin_reply: trimmedReply,
      admin_reply_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/reviews');
  revalidatePath('/products');

  return { success: true };
}

// ─── Admin: Get review stats (counts by status) ───────────────────────────────
export async function adminGetReviewCounts(): Promise<{
  total: number;
  approved: number;
  pending: number;
}> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, approved: 0, pending: 0 };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('reviews.view');
  } catch {
    return { total: 0, approved: 0, pending: 0 };
  }

  const [totalRes, approvedRes, pendingRes] = await Promise.all([
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
  ]);

  return {
    total: totalRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
  };
}