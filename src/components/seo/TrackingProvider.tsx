import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FacebookPixel } from './FacebookPixel';
import { GoogleAnalytics } from './GoogleAnalytics';
import { GoogleTagManager } from './GoogleTagManager';
import { CustomScripts } from './CustomScripts';
import { ClarityScript } from './ClarityScript';

// Small cached lookup for tracking settings to avoid repeated DB reads during layout rendering
let cachedTrackingSettings: { ts: number; settings?: any } | null = null;
const TRACKING_TTL = 30 * 1000;

export default async function TrackingProvider() {
  if (cachedTrackingSettings && Date.now() - cachedTrackingSettings.ts < TRACKING_TTL) {
    const cached = cachedTrackingSettings.settings || [];
    const getCached = (key: string) => cached.find((s: any) => s.key === key)?.value as string | undefined;
    const isEnabledCached = (key: string) => getCached(key) === 'true';

    const pixelId = getCached('meta_pixel');
    const gaId = getCached('google_analytics');
    const gtmId = getCached('google_tag_manager');
    const clarityId = getCached('microsoft_clarity');
    const headerScript = getCached('custom_header_script');
    const footerScript = getCached('custom_footer_script');

    return (
      <>
        {isEnabledCached('enable_meta_pixel') && pixelId && <FacebookPixel pixelId={pixelId} />}
        {isEnabledCached('enable_ga4') && gaId && <GoogleAnalytics measurementId={gaId} />}
        {isEnabledCached('enable_gtm') && gtmId && <GoogleTagManager containerId={gtmId} />}
        {clarityId && <ClarityScript projectId={clarityId} />}
        {isEnabledCached('enable_custom_scripts') && headerScript && (
          <CustomScripts position="header" script={headerScript} />
        )}
        {isEnabledCached('enable_custom_scripts') && footerScript && (
          <CustomScripts position="footer" script={footerScript} />
        )}
      </>
    );
  }

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

  cachedTrackingSettings = { ts: Date.now(), settings };

  const get = (key: string) => settings?.find((s: any) => s.key === key)?.value as string | undefined;
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
