import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildMeta } from '@/lib/seo';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildMeta({ title: 'Product', description: 'Product details', path: `/product/${slug}` });

  const { data: product } = await supabase.from('products').select('name, meta_title, meta_description, images').eq('slug', slug).maybeSingle();
  if (!product) return buildMeta({ title: 'Product', description: 'Product details', path: `/product/${slug}` });

  return buildMeta({
    title: product.meta_title || product.name,
    description: product.meta_description || `Shop ${product.name} at Horof - premium handcrafted wood crafts.`,
    path: `/product/${slug}`,
    images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
  });
}

export default function ProductSlugLayout({ children }: Props) {
  return <>{children}</>;
}
