import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { ShoppingCart, Check, ShieldCheck, Truck, Star } from 'lucide-react';
import { ReviewSection } from '@/components/product/ReviewSection';
import { getReviewStats } from '@/lib/actions/reviews';

export const revalidate = 60; // Revalidate every minute

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: product } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!product) {
    notFound();
  }

  // Find related products
  const { data: related } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .eq('is_active', true)
    .limit(4);

  const stats = await getReviewStats(product.id);

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500 mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          {product.categories && (
            <>
              <Link href={`/category/${product.categories.slug}`} className="hover:text-slate-900">{product.categories.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-900 font-medium">{product.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Images */}
          <div className="lg:w-1/2 space-y-4">
            <div className="aspect-[4/5] rounded-3xl bg-slate-100 overflow-hidden shadow-sm">
              {product.images && product.images[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img: string, i: number) => (
                  <div key={i} className="aspect-square rounded-xl bg-slate-100 overflow-hidden cursor-pointer hover:ring-2 ring-[#2D6A4F] ring-offset-2 transition-all">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:w-1/2 flex flex-col pt-4">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 text-2xl">
                <span className="font-bold text-[#1B4332]">{formatPrice(Number(product.price))}</span>
                {product.compare_price && (
                  <span className="text-lg text-slate-400 line-through">{formatPrice(Number(product.compare_price))}</span>
                )}
              </div>
              {stats.total > 0 && (
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                  <div className="flex items-center text-[#F59E0B]">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold ml-1 text-slate-900">{stats.average.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <a href="#reviews" className="hover:text-[#2D6A4F] hover:underline transition-all">
                    {stats.total} review{stats.total === 1 ? '' : 's'}
                  </a>
                </div>
              )}
            </div>

            <div className="prose prose-slate mb-10">
              <p className="text-slate-600 leading-relaxed text-lg">{product.description}</p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-bold text-slate-700">
                  {product.stock > 0 ? `${product.stock} in stock - Ready to ship` : 'Out of stock'}
                </span>
              </div>

              <button
                disabled={product.stock <= 0}
                className="w-full h-14 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg shadow-[#1B4332]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-5 w-5" />
                {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-slate-200">
              <div className="flex items-center gap-3 text-slate-600">
                <ShieldCheck className="h-6 w-6 text-[#40916C]" />
                <span className="text-sm font-medium">Secure Checkout</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Truck className="h-6 w-6 text-[#40916C]" />
                <span className="text-sm font-medium">Fast & Insured Shipping</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <ReviewSection 
            productId={product.id} 
            productName={product.name} 
            slug={product.slug} 
          />
        </div>

        {/* Related Products */}
        {related && related.length > 0 && (
          <div className="mt-32 pt-16 border-t border-slate-100">
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-10">You might also like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {related.map((prod) => (
                <Link key={prod.id} href={`/product/${prod.slug}`} className="group block">
                  <div className="relative aspect-[4/5] rounded-2xl bg-slate-100 overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-shadow">
                    {prod.images && prod.images[0] ? (
                      <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#2D6A4F] transition-colors line-clamp-1">
                      {prod.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{formatPrice(Number(prod.price))}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
