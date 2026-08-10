import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildMeta } from '@/lib/seo';
import { extractProductImages } from '@/lib/store/extract-images';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildMeta({ title: 'Product', description: 'Product details', path: `/product/${slug}` });

  const { data: raw } = await supabase.from('products').select('name, meta_title, meta_description, product_images(url,sort_order)').eq('slug', slug).maybeSingle();
  if (!raw) return buildMeta({ title: 'Product', description: 'Product details', path: `/product/${slug}` });

  const product = raw as any;
  const images = extractProductImages(product.product_images);

  return buildMeta({
    title: product.meta_title || product.name,
    description: product.meta_description || `Shop ${product.name} at Horof - premium handcrafted wood crafts.`,
    path: `/product/${slug}`,
    images: images[0] ? [{ url: images[0] }] : undefined,
  });
}

export default function ProductSlugLayout({ children }: Props) {
  return <>{children}</>;
}
