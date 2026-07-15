import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FacebookPixel } from './FacebookPixel';
import { GoogleAnalytics } from './GoogleAnalytics';

export default async function TrackingProvider() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: settings } = await supabase.from('site_settings').select('key, value').in('key', ['meta_pixel', 'google_analytics']);
  const pixelId = settings?.find((s) => s.key === 'meta_pixel')?.value as string | undefined;
  const gaId = settings?.find((s) => s.key === 'google_analytics')?.value as string | undefined;

  return (
    <>
      {pixelId && <FacebookPixel pixelId={pixelId} />}
      {gaId && <GoogleAnalytics measurementId={gaId} />}
    </>
  );
}
