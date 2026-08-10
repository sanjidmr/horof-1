import { createSupabaseServerClient } from '@/lib/supabase/server';
import MetaPixelClient from './MetaPixelClient';

export default async function MetaPixelPage() {
  const supabase = await createSupabaseServerClient();
  
  let settings: Record<string, any> = {};

  if (supabase) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'meta_pixel', 'meta_capi_token', 'meta_domain_verification',
        'enable_meta_pixel',
      ]);

    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return <MetaPixelClient initialSettings={settings as any} />;
}