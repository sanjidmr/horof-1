'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CouponCheckResult =
  | { valid: true; discount: number; couponId: string; code: string; label: string }
  | { valid: false; message: string };

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string
): Promise<CouponCheckResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { valid: false, message: 'Service unavailable' };

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code.trim())
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  if (!coupon.is_active) {
    return { valid: false, message: 'This coupon is no longer active' };
  }

  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, message: 'This coupon is not yet valid' };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, message: 'This coupon has expired' };
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }

  if (subtotal < coupon.min_order) {
    return {
      valid: false,
      message: `Minimum order amount of ৳${Number(coupon.min_order).toLocaleString()} required`,
    };
  }

  if (userId) {
    const { data: userOrders } = await supabase
      .from('order_requests')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (coupon.first_order_only && userOrders && userOrders.length > 0) {
      return { valid: false, message: 'This coupon is valid for first order only' };
    }

    const { count: usageCount } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId);

    if (usageCount !== null && usageCount >= coupon.per_user_limit) {
      return {
        valid: false,
        message: `You have already used this coupon ${usageCount} time(s). Limit: ${coupon.per_user_limit}`,
      };
    }
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.max_discount !== null && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    discount = coupon.value;
  }

  if (discount > subtotal) {
    discount = subtotal;
  }

  const label =
    coupon.type === 'percent'
      ? `${coupon.value}% OFF`
      : `৳${Number(coupon.value).toLocaleString()} OFF`;

  return {
    valid: true,
    discount: Math.round(discount * 100) / 100,
    couponId: coupon.id,
    code: coupon.code,
    label,
  };
}
