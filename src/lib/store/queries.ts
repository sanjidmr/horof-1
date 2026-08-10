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

  const HOMEPAGE_SECTIONS = ['best_selling', 'new_arrival', 'flash_sale', 'exclusive_offer', 'product_of_the_day'] as const;

  const [{ data: banners }, { data: cats }, { data: sectionRows }, { data: hp }] = await Promise.all([
    supabase.from('banners').select('id,title,subtitle,image_url,link').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('categories').select('id,name,slug,image_url').eq('is_active', true).order('order', { ascending: true }).limit(12),
    supabase
      .from('products')
      .select('id,name,slug,description,price,compare_price,stock,section,perfect_for,perfect_for_tags,flash_sale_ends_at,product_images(url,sort_order),categories(name),subcategories(name),reviews(rating)')
      .eq('is_active', true)
      .in('section', HOMEPAGE_SECTIONS)
      .limit(100),
    supabase.from('site_settings').select('value').eq('key', 'homepage').maybeSingle(),
  ]);

  const bySection = new Map<string, any[]>();
  for (const p of sectionRows ?? []) {
    const list = bySection.get(p.section) ?? [];
    list.push(p);
    bySection.set(p.section, list);
  }
  const best = (bySection.get('best_selling') ?? []).slice(0, 8);
  const neu = (bySection.get('new_arrival') ?? []).slice(0, 8);
  const flash = (bySection.get('flash_sale') ?? []).slice(0, 8);
  const excl = (bySection.get('exclusive_offer') ?? []).slice(0, 8);
  const potdRows = (bySection.get('product_of_the_day') ?? []).slice(0, 1);

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
  subcategory?: string;
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
    subcategory,
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
      'id,name,slug,description,price,compare_price,stock,section,perfect_for,perfect_for_tags,product_images(url,sort_order),categories!inner(name,slug),subcategories!left(name),reviews(rating)',
      { count: 'exact' }
    )
    .eq('is_active', true);

  if (category) query = query.eq('categories.slug', category);
  if (subcategory) query = query.eq('subcategories.slug', subcategory);
  if (brand) query = query.eq('brand_id', brand);
  if (section) query = query.eq('section', section);
  else if (section) query = query.eq('is_active', true);
  if (minPrice) query = query.gte('price', minPrice);
  if (maxPrice) query = query.lte('price', maxPrice);
  if (search) query = query.ilike('name', `%${search}%`);

  // Sorting
  if (sort === 'price_low') query = query.order('price', { ascending: true });
  else if (sort === 'price_high') query = query.order('price', { ascending: false });
  else if (sort === 'best_selling') query = query.eq('section', 'best_selling').order('created_at', { ascending: false });
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
  if (!supabase) return { categories: [] as Category[], brands: [] as any[], subcategories: [] as any[] };

  const [{ data: cats }, { data: brands }, { data: subs }] = await Promise.all([
    supabase.from('categories').select('id,name,slug,parent_id,image_url').eq('is_active', true).order('name'),
    supabase.from('brands').select('id,name,slug').eq('is_active', true).order('name'),
    supabase.from('subcategories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  return {
    categories: (cats ?? []).map(mapDbCategory),
    brands: brands ?? [],
    subcategories: subs ?? [],
  };
}
