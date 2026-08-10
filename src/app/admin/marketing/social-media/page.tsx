import { createSupabaseServerClient } from '@/lib/supabase/server';
import SocialMediaClient from './SocialMediaClient';

export default async function SocialMediaPage() {
  const supabase = await createSupabaseServerClient();
  
  let settings: Record<string, any> = {};

  if (supabase) {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url',
        'youtube_url', 'tiktok_url', 'pinterest_url',
        'social_auto_post', 'social_auto_share_products',
        'social_share_buttons', 'social_feed_enabled',
      ]);

    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
  }

  return <SocialMediaClient initialSettings={settings as any} />;
}