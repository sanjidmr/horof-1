import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbProductToCardProduct } from './map-product';
import type { Product } from '@/lib/types';

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
    .select('id,name,slug,description,price,offer_price,stock,specification,perfect_for,meta_title,meta_description,product_images(url,sort_order),categories(name),reviews(rating)')
    .eq('category_id', catData.id)
    .neq('id', currentProductId)
    .eq('is_active', true)
    .limit(4);

  if (!rows) return [];

  return rows.map(row => mapDbProductToCardProduct(row as never, categoryName));
}
