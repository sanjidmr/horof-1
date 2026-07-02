import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbProductToCardProduct, mapDbCategory } from '@/lib/store/map-product';
import type { Product, Category } from '@/lib/types';

export type BannerSlide = { id: string; title: string | null; subtitle: string | null; image_url: string; link: string | null };

export async function getHomepageData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      banners: [] as BannerSlide[],
      categories: [] as Category[],
      bestSelling: [] as Product[],
      newArrivals: [] as Product[],
      flashSale: [] as Product[],
      exclusive: [] as Product[],
      productOfDay: null as Product | null,
      flashEndsAt: null as string | null,
      homepage: null as Record<string, unknown> | null,
    };
  }

  const [{ data: banners }, { data: cats }, { data: best }, { data: neu }, { data: flash }, { data: excl }, { data: potdRows }, { data: hp }] =
    await Promise.all([
      supabase.from('banners').select('id,title,subtitle,image_url,link').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('categories').select('id,name,slug,image_url').eq('is_active', true).order('order', { ascending: true }).limit(12),
      supabase
        .from('products')
        .select('id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories(name)')
        .eq('is_active', true)
        .eq('is_best_selling', true)
        .limit(8),
      supabase
        .from('products')
        .select('id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories(name)')
        .eq('is_active', true)
        .eq('is_new_arrival', true)
        .limit(8),
      supabase
        .from('products')
        .select('id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories(name)')
        .eq('is_active', true)
        .eq('is_best_selling', true)
        .limit(8),
      supabase
        .from('products')
        .select('id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories(name)')
        .eq('is_active', true)
        .eq('is_new_arrival', true)
        .limit(8),
      supabase
        .from('products')
        .select('id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories(name)')
        .eq('is_active', true)
        .eq('is_product_of_the_day', true)
        .limit(1),
      supabase.from('site_settings').select('value').eq('key', 'homepage').maybeSingle(),
    ]);

  const homepage = (hp?.value as Record<string, unknown> | null) ?? null;

  const mapList = (rows: any[] | null) =>
    (rows ?? []).map((r) => {
      const categoryName = Array.isArray(r.categories) 
        ? r.categories[0]?.name 
        : r.categories?.name;
      return mapDbProductToCardProduct(r as never, categoryName);
    });

  const potdRow = potdRows?.[0] ?? null;
  const flashEndsAt = (flash?.[0] as { flash_sale_ends_at?: string } | undefined)?.flash_sale_ends_at ?? null;

  return {
    banners: (banners ?? []) as BannerSlide[],
    categories: (cats ?? []).map((c) => mapDbCategory(c)),
    bestSelling: mapList(best),
    newArrivals: mapList(neu),
    flashSale: mapList(flash),
    exclusive: mapList(excl),
    productOfDay: potdRow ? mapDbProductToCardProduct(potdRow as never) : null,
    flashEndsAt,
    homepage,
  };
}
export async function getSiteSettings() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {} as Record<string, any>;

  const { data } = await supabase.from('site_settings').select('key, value');
  const settings: Record<string, any> = {};
  data?.forEach((s) => {
    settings[s.key] = s.value;
  });
  return settings;
}
export async function getProducts(params: {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  section?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { products: [] as Product[], total: 0 };

  const {
    category,
    brand,
    minPrice,
    maxPrice,
    section,
    search,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = params;

  let query = supabase
    .from('products')
    .select(
      'id,name,slug,description,price,compare_price,stock,is_best_selling,is_new_arrival,is_product_of_the_day,perfect_for,product_images(url,sort_order),categories!inner(name,slug)',
      { count: 'exact' }
    )
    .eq('is_active', true);

  if (category) query = query.eq('categories.slug', category);
  if (brand) query = query.eq('brand_id', brand);
  if (section === 'best_selling') query = query.eq('is_best_selling', true);
  else if (section === 'new_arrival') query = query.eq('is_new_arrival', true);
  else if (section === 'product_of_the_day') query = query.eq('is_product_of_the_day', true);
  else if (section) query = query.eq('is_active', true);
  if (minPrice) query = query.gte('price', minPrice);
  if (maxPrice) query = query.lte('price', maxPrice);
  if (search) query = query.ilike('name', `%${search}%`);

  // Sorting
  if (sort === 'price_low') query = query.order('price', { ascending: true });
  else if (sort === 'price_high') query = query.order('price', { ascending: false });
  else if (sort === 'best_selling') query = query.eq('is_best_selling', true).order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count } = await query;

  return {
    products: (data ?? []).map((r: any) => {
      const categoryName = Array.isArray(r.categories) 
        ? r.categories[0]?.name 
        : r.categories?.name;
      return mapDbProductToCardProduct(r as never, categoryName);
    }),
    total: count ?? 0,
  };
}

export async function getFiltersData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { categories: [] as Category[], brands: [] as any[] };

  const [{ data: cats }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id,name,slug,parent_id,image_url').eq('is_active', true).order('name'),
    supabase.from('brands').select('id,name,slug').eq('is_active', true).order('name'),
  ]);

  return {
    categories: (cats ?? []).map(mapDbCategory),
    brands: brands ?? [],
  };
}
