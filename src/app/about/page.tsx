import { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AboutClientPage from '@/components/about/AboutClientPage';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { title: 'About Us - Horof' };

  const { data } = await supabase.from('about_page').select('meta_title, meta_description, og_image_url').limit(1).maybeSingle();

  return {
    title: data?.meta_title || 'About Us - Horof',
    description: data?.meta_description || "Learn about Horof - Bangladesh's premier artisan furniture house.",
    openGraph: data?.og_image_url ? { images: [data.og_image_url] } : undefined,
  };
}

export default function AboutPage() {
  return <AboutClientPage />;
}
