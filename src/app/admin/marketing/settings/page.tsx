import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MarketingSettingsClient } from './MarketingSettingsClient';

export default async function MarketingSettingsPage() {
  const supabase = await createSupabaseServerClient();
  let settings: Record<string, any> = {};

  if (supabase) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'meta_pixel', 'meta_capi_token', 'meta_domain_verification',
        'google_analytics', 'google_tag_manager', 'google_ads_id',
        'google_search_console',
        'seo_default_title', 'seo_default_description', 'seo_default_keywords',
        'seo_canonical_url', 'seo_og_image', 'seo_robots_txt',
        'pinterest_verification', 'tiktok_pixel',
        'microsoft_clarity', 'hotjar_id',
        'custom_header_script', 'custom_footer_script',
        'enable_meta_pixel', 'enable_ga4', 'enable_gtm', 'enable_google_ads',
        'enable_custom_scripts',
        'smtp_provider', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
        'smtp_from_email', 'smtp_from_name',
      ]);

    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return <MarketingSettingsClient initialSettings={settings} />;
}
