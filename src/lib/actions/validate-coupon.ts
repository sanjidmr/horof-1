'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CouponCheckResult =
  | { valid: true; discount: number; couponId: string; code: string; label: string; type: string }
  | { valid: false; message: string };

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string
): Promise<CouponCheckResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { valid: false, message: 'Service unavailable' };

  const trimmedCode = code.trim();
  if (!trimmedCode) return { valid: false, message: 'Please enter a coupon code' };

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', trimmedCode)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  if (!coupon.is_active) {
    return { valid: false, message: 'This coupon is currently inactive' };
  }

  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, message: `This coupon is not yet valid. It starts on ${new Date(coupon.starts_at).toLocaleDateString()}` };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, message: 'This coupon has expired' };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, message: 'This coupon has reached its maximum usage limit' };
  }

  if (subtotal < coupon.min_order) {
    return {
      valid: false,
      message: `Minimum order amount of ৳${Number(coupon.min_order).toLocaleString()} required for this coupon`,
    };
  }

  // Per-user and first-order checks (only when userId is available)
  if (userId) {
    // First order only
    if (coupon.first_order_only) {
      const { count } = await supabase
        .from('order_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count !== null && count > 0) {
        return { valid: false, message: 'This coupon is valid for first orders only' };
      }
    }

    // New customer only
    if (coupon.new_customer_only) {
      const { count } = await supabase
        .from('order_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count !== null && count > 0) {
        return { valid: false, message: 'This coupon is for new customers only' };
      }
    }

    // Per-user usage limit
    const { count: usageCount } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);

    if (usageCount !== null && usageCount >= (coupon.per_user_limit ?? 1)) {
      return {
        valid: false,
        message: `You have already used this coupon ${usageCount} time(s). Limit: ${coupon.per_user_limit} per customer`,
      };
    }
  }

  // Calculate discount
  let discount = 0;

  if (coupon.type === 'free_shipping') {
    // Free shipping coupons have zero discount value; shipping is handled separately
    discount = 0;
  } else if (coupon.type === 'percent') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.max_discount !== null && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    discount = coupon.value;
  }

  // Never exceed subtotal
  if (discount > subtotal) {
    discount = subtotal;
  }

  discount = Math.round(discount * 100) / 100;

  const label =
    coupon.type === 'percent'
      ? `${coupon.value}% OFF`
      : coupon.type === 'free_shipping'
        ? 'Free Shipping'
        : `৳${Number(coupon.value).toLocaleString()} OFF`;

  return {
    valid: true,
    discount,
    couponId: coupon.id,
    code: coupon.code,
    label,
    type: coupon.type,
  };
}
