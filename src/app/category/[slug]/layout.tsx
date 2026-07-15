import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildMeta } from '@/lib/seo';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return buildMeta({ title: 'Category', description: 'Browse products by category', path: `/category/${slug}` });

  const { data: category } = await supabase.from('categories').select('name, description').eq('slug', slug).maybeSingle();
  if (!category) return buildMeta({ title: 'Category', description: 'Browse products by category', path: `/category/${slug}` });

  return buildMeta({
    title: category.name,
    description: category.description || `Browse our collection of ${category.name} at Horof.`,
    path: `/category/${slug}`,
  });
}

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>;
}
