import { getSiteSetting } from '@/lib/actions/site-settings';
import { SeoSettingsForm } from './SeoSettingsForm';

export default async function AdminSettingsSeoPage() {
  const metaTitle = (await getSiteSetting('seo_default_title')) as string | null;
  const metaDesc = (await getSiteSetting('seo_default_description')) as string | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SEO Settings</h1>
        <p className="text-sm text-slate-500">Configure global SEO defaults, meta tags, and social sharing.</p>
      </div>
      <SeoSettingsForm defaultTitle={metaTitle || ''} defaultDescription={metaDesc || ''} />
    </div>
  );
}
