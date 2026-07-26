'use client';

import { useState, useCallback } from 'react';
import { saveMarketingSettingsBulk } from '@/lib/actions/marketing-settings';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  Settings, Search, Globe, Code, Mail, Eye, EyeOff,
  Save, Loader2, CheckCircle, BarChart3,
} from 'lucide-react';

type Tab = 'tracking' | 'seo' | 'social' | 'scripts' | 'email';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'tracking', label: 'Tracking & Analytics', icon: BarChart3 },
  { id: 'seo', label: 'SEO Defaults', icon: Search },
  { id: 'social', label: 'Social Media', icon: Globe },
  { id: 'scripts', label: 'Custom Scripts', icon: Code },
  { id: 'email', label: 'Email / SMTP', icon: Mail },
];

export function MarketingSettingsClient({ initialSettings }: { initialSettings: Record<string, any> }) {
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [activeTab, setActiveTab] = useState<Tab>('tracking');
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const update = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveTab = useCallback(async (keys: string[]) => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      keys.forEach(k => { payload[k] = settings[k] ?? ''; });
      const result = await saveMarketingSettingsBulk(payload);
      if (result.ok) {
        toast.success('Settings saved');
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const Toggle = ({ label, description, settingKey }: { label: string; description?: string; settingKey: string }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => update(settingKey, settings[settingKey] === 'true' ? 'false' : 'true')}
        className={`relative w-12 h-7 rounded-full transition-colors ${settings[settingKey] === 'true' ? 'bg-[#1a4731]' : 'bg-slate-300'}`}
      >
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings[settingKey] === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  const Input = ({ label, settingKey, placeholder, type = 'text', secret }: {
    label: string; settingKey: string; placeholder?: string; type?: string; secret?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={secret && !showSecrets[settingKey] ? 'password' : type}
          value={settings[settingKey] || ''}
          onChange={e => update(settingKey, e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 border border-slate-200 rounded-xl px-4 pr-10 text-sm bg-slate-50 focus:bg-white focus:border-[#1a4731] outline-none transition-all"
        />
        {secret && (
          <button
            type="button"
            onClick={() => toggleSecret(settingKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showSecrets[settingKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  const Textarea = ({ label, settingKey, placeholder, monospace, rows = 4 }: {
    label: string; settingKey: string; placeholder?: string; monospace?: boolean; rows?: number;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <textarea
        value={settings[settingKey] || ''}
        onChange={e => update(settingKey, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:border-[#1a4731] outline-none transition-all resize-none ${monospace ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );

  const Select = ({ label, settingKey, options }: {
    label: string; settingKey: string; options: { value: string; label: string }[];
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <select
        value={settings[settingKey] || ''}
        onChange={e => update(settingKey, e.target.value)}
        className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm bg-slate-50 focus:bg-white focus:border-[#1a4731] outline-none transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Marketing Settings</h1>
        <p className="text-slate-500 mt-1">Configure all marketing integrations, SEO defaults, and tracking in one place</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1a4731] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="grid gap-4">
                <Toggle label="Meta (Facebook) Pixel" description="Track Facebook/Meta advertising events" settingKey="enable_meta_pixel" />
                {settings.enable_meta_pixel === 'true' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Pixel ID" settingKey="meta_pixel" placeholder="e.g. 1234567890" />
                    <Input label="CAPI Access Token" settingKey="meta_capi_token" placeholder="Your CAPI token" secret />
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              <div className="grid gap-4">
                <Toggle label="Google Analytics 4" description="Track website analytics with GA4" settingKey="enable_ga4" />
                {settings.enable_ga4 === 'true' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Measurement ID" settingKey="google_analytics" placeholder="G-XXXXXXXXXX" />
                    <Input label="Google Ads ID" settingKey="google_ads_id" placeholder="AW-XXXXXXXXXX" />
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              <div className="grid gap-4">
                <Toggle label="Google Tag Manager" description="Manage all tags from one place" settingKey="enable_gtm" />
                {settings.enable_gtm === 'true' && (
                  <Input label="GTM Container ID" settingKey="google_tag_manager" placeholder="GTM-XXXXXXX" />
                )}
              </div>

              <hr className="border-slate-100" />

              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Microsoft Clarity" settingKey="microsoft_clarity" placeholder="Project ID" />
                <Input label="Hotjar Site ID" settingKey="hotjar_id" placeholder="Site ID" />
                <Input label="TikTok Pixel ID" settingKey="tiktok_pixel" placeholder="Pixel ID" />
                <Input label="LinkedIn Insight Tag" settingKey="linkedin_insight" placeholder="Partner ID" />
                <Input label="Snapchat Pixel" settingKey="snapchat_pixel" placeholder="Pixel ID" />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4">
              <Input label="Default Meta Title" settingKey="seo_default_title" placeholder="Horof - Premium Wood Crafts" />
              <Textarea label="Default Meta Description" settingKey="seo_default_description" placeholder="Discover premium handcrafted wood crafts..." rows={3} />
              <Input label="Default Keywords" settingKey="seo_default_keywords" placeholder="wood crafts, DIY, home decor, handcraft" />
              <Input label="Canonical URL" settingKey="seo_canonical_url" placeholder="https://horof.com" />
              <Input label="Default OG Image URL" settingKey="seo_og_image" placeholder="https://horof.com/og-default.jpg" />
              <Textarea label="Robots.txt" settingKey="seo_robots_txt" monospace rows={8}
                placeholder={`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://horof.com/sitemap.xml`} />
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-4">
              <Input label="Twitter/X Handle" settingKey="twitter_handle" placeholder="@horof" />
              <Select label="Twitter Card Type" settingKey="twitter_card_type" options={[
                { value: 'summary_large_image', label: 'Summary Large Image' },
                { value: 'summary', label: 'Summary' },
              ]} />
              <Input label="Pinterest Domain Verification" settingKey="pinterest_verification" placeholder="Verification code" />
              <Input label="Facebook Domain Verification" settingKey="meta_domain_verification" placeholder="Domain verification code" />
            </div>
          )}

          {activeTab === 'scripts' && (
            <div className="space-y-4">
              <Toggle label="Enable Custom Scripts" description="Inject custom scripts on every page" settingKey="enable_custom_scripts" />
              {settings.enable_custom_scripts === 'true' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    Scripts are injected on every page. Only add trusted code. Use <code>&lt;script&gt;</code> tags directly.
                  </div>
                  <Textarea label="Header Script" settingKey="custom_header_script" monospace rows={6}
                    placeholder='<!-- Paste header scripts here -->' />
                  <Textarea label="Footer Script" settingKey="custom_footer_script" monospace rows={6}
                    placeholder='<!-- Paste footer scripts here -->' />
                </>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-4">
              <Select label="SMTP Provider" settingKey="smtp_provider" options={[
                { value: '', label: 'Select provider...' },
                { value: 'resend', label: 'Resend' },
                { value: 'brevo', label: 'Brevo (Sendinblue)' },
                { value: 'sendgrid', label: 'SendGrid' },
                { value: 'custom', label: 'Custom SMTP' },
              ]} />
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="SMTP Host" settingKey="smtp_host" placeholder="smtp.example.com" />
                <Input label="SMTP Port" settingKey="smtp_port" placeholder="587" />
                <Input label="SMTP Username" settingKey="smtp_user" placeholder="username" />
                <Input label="SMTP Password" settingKey="smtp_pass" placeholder="password" secret />
                <Input label="From Email" settingKey="smtp_from_email" placeholder="hello@horof.com" />
                <Input label="From Name" settingKey="smtp_from_name" placeholder="Horof" />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6 border-t border-slate-100 mt-6">
            <Button
              onClick={() => {
                const keysByTab: Record<Tab, string[]> = {
                  tracking: ['enable_meta_pixel', 'meta_pixel', 'meta_capi_token', 'meta_domain_verification', 'enable_ga4', 'google_analytics', 'enable_gtm', 'google_tag_manager', 'google_ads_id', 'microsoft_clarity', 'hotjar_id', 'tiktok_pixel', 'linkedin_insight', 'snapchat_pixel'],
                  seo: ['seo_default_title', 'seo_default_description', 'seo_default_keywords', 'seo_canonical_url', 'seo_og_image', 'seo_robots_txt'],
                  social: ['twitter_handle', 'twitter_card_type', 'pinterest_verification', 'meta_domain_verification'],
                  scripts: ['enable_custom_scripts', 'custom_header_script', 'custom_footer_script'],
                  email: ['smtp_provider', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name'],
                };
                saveTab(keysByTab[activeTab]);
              }}
              disabled={saving}
              variant="primary"
              className="rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
