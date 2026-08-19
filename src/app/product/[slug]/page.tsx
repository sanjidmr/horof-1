import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export const revalidate = 60; // Revalidate every minute

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { slug } = await params;

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!product) {
    notFound();
  }

  redirect(`/products/${product.id}`);
}
