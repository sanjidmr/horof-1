import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com';
  
  const defaultRules: MetadataRoute.Robots = {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout/', '/account/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return defaultRules;

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'seo_robots_txt')
      .maybeSingle();

    const customRobots = data?.value as string | undefined;
    if (!customRobots || !customRobots.trim()) return defaultRules;

    const lines = customRobots.split('\n').map(l => l.trim()).filter(Boolean);
    const rules: any[] = [];
    let sitemapUrl = `${siteUrl}/sitemap.xml`;
    let currentAgent = '*';

    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const [directive, value] = line.split(':').map(s => s.trim());
      if (!directive || !value) continue;

      const lowerDirective = directive.toLowerCase();
      if (lowerDirective === 'user-agent') {
        currentAgent = value;
      } else if (lowerDirective === 'allow') {
        rules.push({ userAgent: currentAgent, allow: value });
      } else if (lowerDirective === 'disallow') {
        rules.push({ userAgent: currentAgent, disallow: value });
      } else if (lowerDirective === 'sitemap') {
        sitemapUrl = value.startsWith('http') ? value : `${siteUrl}${value}`;
      }
    }

    if (rules.length === 0) return defaultRules;

    return {
      rules: rules.length === 1 ? rules[0] : rules,
      sitemap: sitemapUrl,
    };
  } catch {
    return defaultRules;
  }
}
