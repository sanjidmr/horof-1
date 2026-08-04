import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LegalPageContent } from '@/components/legal/LegalPageContent';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('legal_pages').select('meta_title, meta_description').eq('page_type', 'privacy_policy').maybeSingle();
  return {
    title: data?.meta_title || 'Privacy Policy - Horof',
    description: data?.meta_description || 'Read our Privacy Policy.',
    openGraph: {
      title: data?.meta_title || 'Privacy Policy - Horof',
      description: data?.meta_description || 'Read our Privacy Policy.',
    },
  };
}

export default async function PrivacyPolicyPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('legal_pages').select('*').eq('page_type', 'privacy_policy').maybeSingle();

  if (!data) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <p className="text-slate-400">Content not available.</p>
      </div>
    );
  }

  return <LegalPageContent data={data} pageType="privacy_policy" />;
}
