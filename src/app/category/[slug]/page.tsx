import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

export const revalidate = 60; // Revalidate every minute

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!category) {
    notFound();
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Category Header */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {category.image_url && (
              <div className="w-48 h-48 rounded-3xl overflow-hidden shrink-0 shadow-lg border border-slate-200">
                <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
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

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {!products || products.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-500">Check back later for new arrivals in {category.name}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.slug}`} className="group block">
                <div className="relative aspect-[4/5] rounded-2xl bg-slate-100 overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-shadow">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
