'use server';

/**
 * Coupon Server Actions — All CRUD with admin authorization.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(permissionCode: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Database connection not available');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Authentication error: ${userError.message}`);
  if (!user) throw new Error('Unauthorized - Please login first');
  
  const { requirePermission } = await import('./security');
  await requirePermission(permissionCode);
  
  return { supabase, user };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouponData {
  code: string;
  name?: string | null;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  description?: string | null;
  min_order?: number;
  max_discount?: number | null;
  max_uses?: number | null;
  per_user_limit?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  first_order_only?: boolean;
  new_customer_only?: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
  excluded_products?: string[];
  excluded_categories?: string[];
  is_active?: boolean;
}

export type CouponRow = {
  id: string;
  code: string;
  name: string | null;
  type: string;
  value: number;
  description: string | null;
  min_order: number;
  max_discount: number | null;
  max_uses: number | null;
  per_user_limit: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  first_order_only: boolean;
  new_customer_only: boolean;
  applicable_products: string[];
  applicable_categories: string[];
  excluded_products: string[];
  excluded_categories: string[];
  is_active: boolean;
  created_at?: string;
  updated_at: string;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<CouponRow[]> {
const { supabase } = await requireAdmin('offer_campaign.view');
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CouponRow[];
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCoupon(data: CouponData): Promise<CouponRow> {
const { supabase } = await requireAdmin('offer_campaign.edit');

  const code = data.code.toUpperCase().trim();
  if (!code) throw new Error('Coupon code is required');
  if (data.type !== 'free_shipping' && data.value <= 0) throw new Error('Discount value must be greater than 0');
  if (data.type === 'percent' && data.value > 100) throw new Error('Percentage discount cannot exceed 100%');

  const payload: Record<string, unknown> = {
    code,
    type: data.type,
    value: data.type === 'free_shipping' ? 0 : data.value,
    description: data.description || null,
    min_order: data.min_order || 0,
    max_discount: data.max_discount && data.max_discount > 0 ? data.max_discount : null,
    max_uses: data.max_uses && data.max_uses > 0 ? data.max_uses : null,
    per_user_limit: data.per_user_limit || 1,
    starts_at: data.starts_at || null,
    expires_at: data.expires_at || null,
    first_order_only: data.first_order_only || false,
    new_customer_only: data.new_customer_only || false,
    applicable_products: data.applicable_products || [],
    applicable_categories: data.applicable_categories || [],
    excluded_products: data.excluded_products || [],
    excluded_categories: data.excluded_categories || [],
    is_active: data.is_active !== undefined ? data.is_active : true,
    used_count: 0,
  };

  // Add name if provided
  if (data.name) {
    payload.name = data.name;
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A coupon with this code already exists');
    if (error.code === '42501') throw new Error('Permission denied. Make sure you have admin access to create coupons.');
    throw new Error(`Failed to create coupon: ${error.message}`);
  }

  if (!coupon) throw new Error('Failed to create coupon: No data returned');

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing/coupons');
  return coupon as CouponRow;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCoupon(id: string, data: Partial<CouponData>): Promise<CouponRow> {
const { supabase } = await requireAdmin('offer_campaign.edit');

  if (!id) throw new Error('Coupon ID is required');

  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.toUpperCase().trim();
  if (data.type !== undefined) payload.type = data.type;
  if (data.value !== undefined) payload.value = data.type === 'free_shipping' ? 0 : data.value;
  if (data.description !== undefined) payload.description = data.description || null;
  if (data.name !== undefined) payload.name = data.name;
  if (data.min_order !== undefined) payload.min_order = data.min_order;
  if (data.max_discount !== undefined) payload.max_discount = data.max_discount && data.max_discount > 0 ? data.max_discount : null;
  if (data.max_uses !== undefined) payload.max_uses = data.max_uses && data.max_uses > 0 ? data.max_uses : null;
  if (data.per_user_limit !== undefined) payload.per_user_limit = data.per_user_limit;
  if (data.starts_at !== undefined) payload.starts_at = data.starts_at || null;
  if (data.expires_at !== undefined) payload.expires_at = data.expires_at || null;
  if (data.first_order_only !== undefined) payload.first_order_only = data.first_order_only;
  if (data.new_customer_only !== undefined) payload.new_customer_only = data.new_customer_only;
  if (data.applicable_products !== undefined) payload.applicable_products = data.applicable_products;
  if (data.applicable_categories !== undefined) payload.applicable_categories = data.applicable_categories;
  if (data.excluded_products !== undefined) payload.excluded_products = data.excluded_products;
  if (data.excluded_categories !== undefined) payload.excluded_categories = data.excluded_categories;
  if (data.is_active !== undefined) payload.is_active = data.is_active;

  if (Object.keys(payload).length === 0) throw new Error('No fields to update');

  const { data: coupon, error } = await supabase
    .from('coupons')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A coupon with this code already exists');
    if (error.code === '42501') throw new Error('Permission denied. Make sure you have admin access to update coupons.');
    throw new Error(`Failed to update coupon: ${error.message}`);
  }

  if (!coupon) throw new Error('Failed to update coupon: No data returned');

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing/coupons');
  return coupon as CouponRow;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteCoupon(id: string): Promise<void> {
const { supabase } = await requireAdmin('offer_campaign.delete');
  if (!id) throw new Error('Coupon ID is required');

  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) {
    if (error.code === '42501') throw new Error('Permission denied. Make sure you have admin access.');
    throw new Error(`Failed to delete coupon: ${error.message}`);
  }

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing/coupons');
}

// ─── Toggle Active ────────────────────────────────────────────────────────────

export async function toggleCouponActive(id: string, isActive: boolean): Promise<void> {
const { supabase } = await requireAdmin('offer_campaign.manage');
  if (!id) throw new Error('Coupon ID is required');

  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) {
    if (error.code === '42501') throw new Error('Permission denied. Make sure you have admin access.');
    throw new Error(`Failed to update coupon: ${error.message}`);
  }

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing/coupons');
}

// ─── Duplicate ────────────────────────────────────────────────────────────────

export async function duplicateCoupon(id: string): Promise<CouponRow> {
const { supabase } = await requireAdmin('offer_campaign.edit');
  if (!id) throw new Error('Coupon ID is required');

  const { data: original, error: fetchErr } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !original) throw new Error('Coupon not found or has been deleted');

  // Generate a unique code with -COPY suffix
  let newCode = `${original.code}-COPY`;
  let suffix = 1;
  while (true) {
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .ilike('code', newCode)
      .maybeSingle();
    if (!existing) break;
    suffix++;
    newCode = `${original.code}-COPY${suffix}`;
  }

  const payload: Record<string, unknown> = {
    code: newCode,
    type: original.type,
    value: original.value,
    description: original.description,
    min_order: original.min_order,
    max_discount: original.max_discount,
    max_uses: original.max_uses,
    per_user_limit: original.per_user_limit,
    starts_at: original.starts_at,
    expires_at: original.expires_at,
    first_order_only: original.first_order_only,
    new_customer_only: original.new_customer_only,
    applicable_products: original.applicable_products,
    applicable_categories: original.applicable_categories,
    excluded_products: original.excluded_products,
    excluded_categories: original.excluded_categories,
    is_active: false,
    used_count: 0,
  };

  // Copy name if present
  if ((original as any).name) {
    payload.name = (original as any).name;
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '42501') throw new Error('Permission denied. Make sure you have admin access.');
    throw new Error(`Failed to duplicate coupon: ${error.message}`);
  }

  if (!coupon) throw new Error('Failed to duplicate coupon: No data returned');

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing/coupons');
  return coupon as CouponRow;
}
