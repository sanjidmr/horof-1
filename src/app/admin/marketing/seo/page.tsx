import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SeoSettingsClient } from './SeoSettingsClient';

export default async function MarketingSeoPage() {
  const supabase = await createSupabaseServerClient();
  let settings: Record<string, any> = {};

  if (supabase) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'seo_default_title', 'seo_default_description', 'seo_default_keywords',
        'seo_canonical_url', 'seo_og_image', 'seo_robots_txt',
        'seo_organization_schema', 'twitter_handle', 'twitter_card_type',
      ]);

    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  let pages: any[] = [];
  try {
    const { data } = await supabase!
      .from('seo_pages')
      .select('*')
      .order('page_path');
    pages = data || [];
  } catch {}

  return <SeoSettingsClient initialSettings={settings} initialPages={pages} />;
}
