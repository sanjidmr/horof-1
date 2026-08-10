import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbProductToCardProduct } from '@/lib/store/map-product';
import { extractProductImages } from './extract-images';
import type { Product } from '@/lib/types';

export async function getProductDetail(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { product: null as Product | null, variants: [] as { id: string; size: string | null; color: string | null; stock: number; price_modifier: number }[], images: [] as string[] };

  let row = null as unknown;
  const bySlug = await supabase
    .from('products')
    .select('id,name,slug,description,price,offer_price,stock,specification,perfect_for,perfect_for_tags,meta_title,meta_description,product_images(url,sort_order),categories(name),reviews(rating)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (bySlug.data) row = bySlug.data;
  else {
    const byId = await supabase
      .from('products')
      .select('id,name,slug,description,price,compare_price,stock,specification,perfect_for,perfect_for_tags,product_images(url,sort_order),categories(name),reviews(rating)')
      .eq('id', slug)
      .eq('is_active', true)
      .maybeSingle();
    row = byId.data;
  }

  if (!row) return { product: null, variants: [], images: [] };

  const { data: variants } = await supabase.from('product_variants').select('id,size,color,stock,price_modifier').eq('product_id', (row as { id: string }).id);

  const imgs = extractProductImages((row as { product_images?: { url: string; sort_order: number | null }[] }).product_images);

  const product = mapDbProductToCardProduct(row as never, (row as { categories?: { name?: string } }).categories?.name);

  return { product, variants: variants ?? [], images: imgs };
}
