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

// Fallback Mock Data for a product when table queries fail or are empty
const getFallbackPricingData = (productId: number): {
  discounts: QuantityDiscount[];
  configOptions: ProductConfigOption[];
} => {
  const mockDiscounts: QuantityDiscount[] = [
    { id: 'mock-d-1', product_id: productId, quantity: 2, discount_percent: 2.5 },
    { id: 'mock-d-2', product_id: productId, quantity: 3, discount_percent: 5 },
    { id: 'mock-d-3', product_id: productId, quantity: 4, discount_percent: 7.5 },
    { id: 'mock-d-4', product_id: productId, quantity: 5, discount_percent: 10 },
  ];

  const mockOptions: ProductConfigOption[] = [
    // Sizes
    { id: 'mock-s-16', product_id: productId, type: 'size', name: '16 Inches', price_modifier: 0, is_active: true },
    { id: 'mock-s-18', product_id: productId, type: 'size', name: '18 Inches', price_modifier: 500, is_active: true },
    { id: 'mock-s-20', product_id: productId, type: 'size', name: '20 Inches', price_modifier: 1000, is_active: true },
    { id: 'mock-s-22', product_id: productId, type: 'size', name: '22 Inches', price_modifier: 1500, is_active: true },
    { id: 'mock-s-24', product_id: productId, type: 'size', name: '24 Inches', price_modifier: 2000, is_active: true },
    // Acrylic Colors
    { id: 'mock-a-blk', product_id: productId, type: 'acrylic_color', name: 'Black', price_modifier: 0, is_active: true },
    { id: 'mock-a-trs', product_id: productId, type: 'acrylic_color', name: 'Transparent', price_modifier: 200, is_active: true },
    { id: 'mock-a-oth', product_id: productId, type: 'acrylic_color', name: 'Others', price_modifier: 500, is_active: true },
    // Letter Colors
    { id: 'mock-l-gld', product_id: productId, type: 'letter_color', name: 'Mirror Gold', price_modifier: 0, is_active: true },
    { id: 'mock-l-wht', product_id: productId, type: 'letter_color', name: 'White', price_modifier: 100, is_active: true },
    { id: 'mock-l-oth', product_id: productId, type: 'letter_color', name: 'Others', price_modifier: 300, is_active: true },
    // Lighting
    { id: 'mock-lt-led', product_id: productId, type: 'lighting', name: 'LED Module', price_modifier: 1200, is_active: true },
    { id: 'mock-lt-wout', product_id: productId, type: 'lighting', name: 'Without Light', price_modifier: 0, is_active: true },
  ];

  return {
    discounts: mockDiscounts,
    configOptions: mockOptions,
  };
};

export async function getProductPricingData(productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getFallbackPricingData(productId);

  try {
    const [discountsRes, configRes] = await Promise.all([
      supabase.from('quantity_discounts').select('*').eq('product_id', productId).order('quantity', { ascending: true }),
      supabase.from('product_config_options').select('*').eq('product_id', productId).order('created_at', { ascending: true }),
    ]);

    // If tables don't exist, postgrest returns code 42P01 (relation does not exist)
    const tableMissing = 
      (discountsRes.error && discountsRes.error.code === '42P01') ||
      (configRes.error && configRes.error.code === '42P01');

    if (tableMissing) {
      console.warn('quantity_discounts or product_config_options tables do not exist, falling back to mock configurations.');
      return getFallbackPricingData(productId);
    }

    const discounts = discountsRes.data || [];
    const configOptions = configRes.data || [];

    // If database returned tables but they are empty, seed them or use fallbacks
    if (discounts.length === 0 && configOptions.length === 0) {
      return getFallbackPricingData(productId);
    }

    return {
      discounts: discounts as QuantityDiscount[],
      configOptions: configOptions as ProductConfigOption[],
    };
  } catch (error) {
    console.error('Error fetching pricing/variant configurations:', error);
    return getFallbackPricingData(productId);
  }
}

export async function upsertQuantityDiscount(discount: Omit<QuantityDiscount, 'id' | 'created_at'> & { id?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const payload: any = {
    product_id: discount.product_id,
    quantity: discount.quantity,
    discount_percent: discount.discount_percent,
  };

  if (discount.id && !discount.id.startsWith('mock-')) {
    payload.id = discount.id;
  }

  const { data, error } = await supabase
    .from('quantity_discounts')
    .upsert(payload, { onConflict: 'product_id,quantity' })
    .select()
    .single();

  if (error) {
    console.error('Error saving discount rule:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/products/${discount.product_id}`);
  return data as QuantityDiscount;
}

export async function deleteQuantityDiscount(id: string, productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  if (id.startsWith('mock-')) {
    return { success: true };
  }

  const { error } = await supabase
    .from('quantity_discounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting discount rule:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/products/${productId}`);
  return { success: true };
}

export async function upsertConfigOption(option: Omit<ProductConfigOption, 'id' | 'created_at'> & { id?: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  const payload: any = {
    product_id: option.product_id,
    type: option.type,
    name: option.name,
    price_modifier: option.price_modifier,
    is_active: option.is_active,
  };

  if (option.id && !option.id.startsWith('mock-')) {
    payload.id = option.id;
  }

  const { data, error } = await supabase
    .from('product_config_options')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error saving config option:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/products/${option.product_id}`);
  return data as ProductConfigOption;
}

export async function deleteConfigOption(id: string, productId: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client failed to initialize');

  if (id.startsWith('mock-')) {
    return { success: true };
  }

  const { error } = await supabase
    .from('product_config_options')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting config option:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/products/${productId}`);
  return { success: true };
}
