import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return new Response(JSON.stringify({ settings: [] }), { status: 200 });

    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'meta_pixel', 'google_analytics', 'google_tag_manager', 'google_ads_id',
        'microsoft_clarity', 'hotjar_id', 'tiktok_pixel',
        'enable_meta_pixel', 'enable_ga4', 'enable_gtm',
        'custom_header_script', 'custom_footer_script', 'enable_custom_scripts',
      ]);

    return new Response(JSON.stringify({ settings: settings || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[API] tracking-settings error', e?.message || e);
    return new Response(JSON.stringify({ settings: [] }), { status: 500 });
  }
}
