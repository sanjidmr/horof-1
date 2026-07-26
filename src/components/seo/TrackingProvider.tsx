import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FacebookPixel } from './FacebookPixel';
import { GoogleAnalytics } from './GoogleAnalytics';
import { GoogleTagManager } from './GoogleTagManager';
import { CustomScripts } from './CustomScripts';
import { ClarityScript } from './ClarityScript';

export default async function TrackingProvider() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [
      'meta_pixel', 'google_analytics', 'google_tag_manager', 'google_ads_id',
      'microsoft_clarity', 'hotjar_id', 'tiktok_pixel',
      'enable_meta_pixel', 'enable_ga4', 'enable_gtm',
      'custom_header_script', 'custom_footer_script', 'enable_custom_scripts',
    ]);

  const get = (key: string) => settings?.find((s) => s.key === key)?.value as string | undefined;
  const isEnabled = (key: string) => get(key) === 'true';

  const pixelId = get('meta_pixel');
  const gaId = get('google_analytics');
  const gtmId = get('google_tag_manager');
  const clarityId = get('microsoft_clarity');
  const headerScript = get('custom_header_script');
  const footerScript = get('custom_footer_script');

  return (
    <>
      {isEnabled('enable_meta_pixel') && pixelId && <FacebookPixel pixelId={pixelId} />}
      {isEnabled('enable_ga4') && gaId && <GoogleAnalytics measurementId={gaId} />}
      {isEnabled('enable_gtm') && gtmId && <GoogleTagManager containerId={gtmId} />}
      {clarityId && <ClarityScript projectId={clarityId} />}
      {isEnabled('enable_custom_scripts') && headerScript && (
        <CustomScripts position="header" script={headerScript} />
      )}
      {isEnabled('enable_custom_scripts') && footerScript && (
        <CustomScripts position="footer" script={footerScript} />
      )}
    </>
  );
}
