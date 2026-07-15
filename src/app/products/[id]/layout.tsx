import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildMeta } from '@/lib/seo';
import type { Metadata } from 'next';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildMeta({ title: 'Product', description: 'Product details', path: `/products/${id}` });

  const { data: product } = await supabase.from('products').select('name, meta_title, meta_description, images').eq('id', id).maybeSingle();
  if (!product) return buildMeta({ title: 'Product', description: 'Product details', path: `/products/${id}` });

  return buildMeta({
    title: product.meta_title || product.name,
    description: product.meta_description || `Shop ${product.name} at Horof - premium handcrafted wood crafts.`,
    path: `/products/${id}`,
    images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
  });
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
