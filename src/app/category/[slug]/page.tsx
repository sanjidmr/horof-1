import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { extractProductImages } from '@/lib/store/extract-images';

const PAGE_SIZE = 12;

export const revalidate = 60;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, queryParams] = await Promise.all([params, searchParams]);
  const parsedPage = Number.parseInt(queryParams.page || '1', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: category } = await supabase
    .from('categories')
    .select('id,name,slug,description,image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    notFound();
  }

  const [{ data: subcategories }, { data: products, count }] = await Promise.all([
    supabase.from('subcategories').select('id,name,slug,sort_order').eq('category_id', category.id).eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('products')
      .select('id,name,slug,price,compare_price,created_at,subcategories(name),product_images(url,sort_order)', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Category Header */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {category.image_url && (
              <div className="w-48 h-48 rounded-3xl overflow-hidden shrink-0 shadow-lg border border-slate-200">
                <img src={category.image_url} alt={category.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">{category.name}</h1>
              {category.description && (
                <p className="text-slate-500 max-w-2xl text-lg">{category.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subcategories */}
      {subcategories && subcategories.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-lg font-bold text-slate-700 mb-4">Browse by Subcategory</h2>
          <div className="flex flex-wrap gap-3">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/products?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-[#1B4332] hover:text-white hover:border-[#1B4332] transition-all"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {!products || products.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-500">Check back later for new arrivals in {category.name}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((product) => {
                const images = extractProductImages(product.product_images);
              return (
              <Link key={product.id} href={`/products/${product.id}`} className="group block">
                <div className="relative aspect-[4/5] rounded-2xl bg-slate-100 overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-shadow">
                  {images[0] ? (
                    <img src={images[0]} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">No Image</div>
                  )}

                  {/* Hover Quick View */}
                  <div className="absolute inset-x-4 bottom-4 translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300">
                    <div className="w-full py-3 bg-white/90 backdrop-blur text-slate-900 text-sm font-bold text-center rounded-xl shadow-lg">
                      Quick View
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2D6A4F] transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{formatPrice(Number(product.price))}</span>
                    {product.compare_price && (
                      <span className="text-xs text-slate-400 line-through">{formatPrice(Number(product.compare_price))}</span>
                    )}
                  </div>
                  {product.subcategories?.[0]?.name && (
                    <p className="text-xs text-slate-400 mt-1">{product.subcategories[0].name}</p>
                  )}
                </div>
              </Link>
              );
            })}
          </div>
        )}

        {(count ?? 0) > PAGE_SIZE && (
          <nav className="mt-12 flex items-center justify-center gap-5" aria-label="Category product pages">
            <Link
              href={`/category/${encodeURIComponent(slug)}?page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : undefined}
              className={`rounded-xl border border-slate-200 px-4 py-2 text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            >
              Previous
            </Link>
            <span className="text-sm text-slate-600">Page {page} of {Math.ceil((count ?? 0) / PAGE_SIZE)}</span>
            <Link
              href={`/category/${encodeURIComponent(slug)}?page=${Math.min(Math.ceil((count ?? 0) / PAGE_SIZE), page + 1)}`}
              aria-disabled={page >= Math.ceil((count ?? 0) / PAGE_SIZE)}
              tabIndex={page >= Math.ceil((count ?? 0) / PAGE_SIZE) ? -1 : undefined}
              className={`rounded-xl border border-slate-200 px-4 py-2 text-sm ${page >= Math.ceil((count ?? 0) / PAGE_SIZE) ? 'pointer-events-none opacity-50' : ''}`}
            >
              Next
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
