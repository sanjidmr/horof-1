import { createSupabaseServerClient } from '@/lib/supabase/server';
import GoogleAnalyticsClient from './GoogleAnalyticsClient';

export default async function GoogleAnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  
  let settings: Record<string, any> = {};

  if (supabase) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'google_analytics', 'google_tag_manager', 'google_ads_id',
        'google_search_console', 'enable_ga4', 'enable_gtm', 'enable_google_ads',
      ]);

    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return <GoogleAnalyticsClient initialSettings={settings as any} />;
}