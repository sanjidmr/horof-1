'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Marketing setting keys
export const MARKETING_KEYS = {
  // Meta / Facebook
  META_PIXEL_ID: 'meta_pixel',
  META_CAPI_TOKEN: 'meta_capi_token',
  META_DOMAIN_VERIFICATION: 'meta_domain_verification',
  
  // Google
  GA4_ID: 'google_analytics',
  GTM_ID: 'google_tag_manager',
  GOOGLE_ADS_ID: 'google_ads_id',
  GOOGLE_MERCHANT_ID: 'google_merchant_id',
  GOOGLE_SEARCH_CONSOLE: 'google_search_console',
  
  // SEO
  SEO_DEFAULT_TITLE: 'seo_default_title',
  SEO_DEFAULT_DESCRIPTION: 'seo_default_description',
  SEO_DEFAULT_KEYWORDS: 'seo_default_keywords',
  SEO_CANONICAL_URL: 'seo_canonical_url',
  SEO_OG_IMAGE: 'seo_og_image',
  SEO_ROBOTS_TXT: 'seo_robots_txt',
  SEO_ORGANIZATION_SCHEMA: 'seo_organization_schema',
  
  // Social
  PINTEREST_VERIFICATION: 'pinterest_verification',
  TIKTOK_PIXEL: 'tiktok_pixel',
  
  // Analytics
  MICROSOFT_CLARITY: 'microsoft_clarity',
  HOTJAR_ID: 'hotjar_id',
  
  // Custom Scripts
  CUSTOM_HEADER_SCRIPT: 'custom_header_script',
  CUSTOM_FOOTER_SCRIPT: 'custom_footer_script',
  
  // Email
  SMTP_PROVIDER: 'smtp_provider',
  SMTP_HOST: 'smtp_host',
  SMTP_PORT: 'smtp_port',
  SMTP_USER: 'smtp_user',
  SMTP_PASS: 'smtp_pass',
  SMTP_FROM_EMAIL: 'smtp_from_email',
  SMTP_FROM_NAME: 'smtp_from_name',
  
  // Enable/Disable toggles
  ENABLE_META_PIXEL: 'enable_meta_pixel',
  ENABLE_GA4: 'enable_ga4',
  ENABLE_GTM: 'enable_gtm',
  ENABLE_GOOGLE_ADS: 'enable_google_ads',
  ENABLE_CUSTOM_SCRIPTS: 'enable_custom_scripts',
} as const;

type MarketingKey = typeof MARKETING_KEYS[keyof typeof MARKETING_KEYS];

export async function getMarketingSettings(): Promise<Record<string, any>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {};

  const keys = Object.values(MARKETING_KEYS);
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', keys);

  const settings: Record<string, any> = {};
  (data || []).forEach((row: any) => {
    settings[row.key] = row.value;
  });
  return settings;
}

export async function saveMarketingSetting(key: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('marketing.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }

  const { error } = await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveMarketingSettingsBulk(settings: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('marketing.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }

  const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/marketing');
  revalidatePath('/');
  return { ok: true };
}
