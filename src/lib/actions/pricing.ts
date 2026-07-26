'use server';

import { createSupabaseServerClient } from '../supabase/server';
import { revalidatePath } from 'next/cache';

export interface QuantityDiscount {
  id: string;
  product_id: number;
  quantity: number;
  discount_percent: number;
  created_at?: string;
}

export interface ProductConfigOption {
  id: string;
  product_id: number;
  type: 'size' | 'acrylic_color' | 'letter_color' | 'lighting';
  name: string;
  price_modifier: number;
  is_active: boolean;
  created_at?: string;
}

export async function getProductPricingData(productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { discounts: [] as QuantityDiscount[], configOptions: [] as ProductConfigOption[] };

  try {
    const [discountsRes, configRes] = await Promise.all([
      supabase.from('quantity_discounts').select('*').eq('product_id', productId).order('quantity', { ascending: true }),
      supabase.from('product_config_options').select('*').eq('product_id', productId).order('created_at', { ascending: true }),
    ]);

    return {
      discounts: (discountsRes.data ?? []) as QuantityDiscount[],
      configOptions: (configRes.data ?? []) as ProductConfigOption[],
    };
  } catch {
    return { discounts: [] as QuantityDiscount[], configOptions: [] as ProductConfigOption[] };
  }
}

export async function upsertQuantityDiscount(discount: Omit<QuantityDiscount, 'id' | 'created_at'> & { id?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const payload: Record<string, unknown> = {
    product_id: discount.product_id,
    quantity: discount.quantity,
    discount_percent: discount.discount_percent,
  };

  const { data, error } = await supabase
    .from('quantity_discounts')
    .upsert(payload, { onConflict: 'product_id,quantity' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/products/${discount.product_id}`);
  return data as QuantityDiscount;
}

export async function deleteQuantityDiscount(id: string, productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const { error } = await supabase
    .from('quantity_discounts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/products/${productId}`);
  return { success: true };
}

export async function upsertConfigOption(option: Omit<ProductConfigOption, 'id' | 'created_at'> & { id?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const payload: Record<string, unknown> = {
    product_id: option.product_id,
    type: option.type,
    name: option.name,
    price_modifier: option.price_modifier,
    is_active: option.is_active,
  };

  const { data, error } = await supabase
    .from('product_config_options')
    .upsert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/products/${option.product_id}`);
  return data as ProductConfigOption;
}

export async function deleteConfigOption(id: string, productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const { error } = await supabase
    .from('product_config_options')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath(`/products/${productId}`);
  return { success: true };
}
