'use client';

import { useState, useCallback } from 'react';
import { saveMarketingSettingsBulk } from '@/lib/actions/marketing-settings';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  Search, Globe, Code, Eye, Save, Loader2,
  FileText, AlertTriangle,
} from 'lucide-react';

type Tab = 'meta' | 'social' | 'schema' | 'pages';

export function SeoSettingsClient({ initialSettings, initialPages }: {
  initialSettings: Record<string, any>;
  initialPages: any[];
}) {
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [pages, setPages] = useState<any[]>(initialPages);
  const [activeTab, setActiveTab] = useState<Tab>('meta');
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  const saveTab = useCallback(async (keys: string[]) => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      keys.forEach(k => { payload[k] = settings[k] ?? ''; });
      const result = await saveMarketingSettingsBulk(payload);
      result.ok ? toast.success('SEO settings saved') : toast.error(result.error || 'Failed to save');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const metaTitle = settings.seo_default_title || '';
  const metaDesc = settings.seo_default_description || '';
  const canonicalUrl = settings.seo_canonical_url || 'https://horof.com';
  const ogImage = settings.seo_og_image || '';

  const Input = ({ label, settingKey, placeholder, monospace }: {
    label: string; settingKey: string; placeholder?: string; monospace?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={settings[settingKey] || ''}
        onChange={e => update(settingKey, e.target.value)}
        placeholder={placeholder}
        className={`w-full h-11 border border-slate-200 rounded-xl px-4 text-sm bg-slate-50 focus:bg-white focus:border-[#1a4731] outline-none transition-all ${monospace ? 'font-mono text-xs' : ''}`}
      />
    </div>
  );

  const Textarea = ({ label, settingKey, placeholder, rows = 4, monospace }: {
    label: string; settingKey: string; placeholder?: string; rows?: number; monospace?: boolean;
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

  return (
    <div className="space-y-6 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">SEO Settings</h1>
        <p className="text-slate-500 mt-1">Manage meta tags, structured data, and search engine optimization</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {([
          { id: 'meta' as Tab, label: 'Meta Tags', icon: Search },
          { id: 'social' as Tab, label: 'Social / OG', icon: Globe },
          { id: 'schema' as Tab, label: 'Structured Data', icon: Code },
          { id: 'pages' as Tab, label: 'Page SEO', icon: FileText },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-white text-[#1a4731] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {activeTab === 'meta' && (
            <div className="space-y-5">
              <Input label="Default Meta Title" settingKey="seo_default_title" placeholder="Horof - Premium Wood Crafts" />
              <Textarea label="Default Meta Description" settingKey="seo_default_description" placeholder="Discover premium handcrafted wood crafts, DIY supplies, and home decor from Bangladesh." rows={3} />
              <Input label="Default Keywords" settingKey="seo_default_keywords" placeholder="wood crafts, DIY supplies, handcraft, home decor, Bangladesh" />

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-bold">Search Preview</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-blue-800 text-lg font-normal hover:underline cursor-pointer truncate">
                    {metaTitle || 'Your Site Title'} | Horof
                  </p>
                  <p className="text-green-700 text-xs mt-1">{canonicalUrl}</p>
                  <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                    {metaDesc || 'Your meta description will appear here in Google search results...'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => saveTab(['seo_default_title', 'seo_default_description', 'seo_default_keywords'])}
                  disabled={saving} variant="primary" className="rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Meta Tags
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-5">
              <Input label="Canonical URL" settingKey="seo_canonical_url" placeholder="https://horof.com" />
              <Input label="Default OG Image URL" settingKey="seo_og_image" placeholder="https://horof.com/og-default.jpg" />

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase">Social Preview</p>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-w-sm">
                  {ogImage && (
                    <div className="bg-slate-100 h-36 flex items-center justify-center text-slate-400 text-xs">
                      OG Image: {ogImage}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-slate-400 truncate">{canonicalUrl}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{metaTitle || 'Your Site Title'}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{metaDesc || 'Your description...'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => saveTab(['seo_canonical_url', 'seo_og_image'])}
                  disabled={saving} variant="primary" className="rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Social Settings
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-5">
              <Textarea label="Organization Schema (JSON-LD)" settingKey="seo_organization_schema"
                placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Horof",\n  "url": "https://horof.com",\n  "logo": "https://horof.com/logo.png"\n}`}
                rows={12} monospace />
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Product Schema, Breadcrumb Schema, and FAQ Schema are generated automatically from your product and page data. Organization Schema is set above.
              </div>

              <div className="flex justify-end">
                <Button onClick={() => saveTab(['seo_organization_schema'])}
                  disabled={saving} variant="primary" className="rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Schema
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                Per-page SEO overrides. Add a page path below to set custom meta tags for specific pages.
              </div>

              {pages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No per-page SEO overrides</p>
                  <p className="text-sm mt-1">Add pages below to customize their meta tags</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pages.map((page: any) => (
                    <div key={page.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 font-mono truncate">{page.page_path}</p>
                        <p className="text-xs text-slate-500 truncate">{page.meta_title || 'No title set'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {page.no_index && (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">NoIndex</span>
                        )}
                        {page.seo_score && (
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            page.seo_score >= 80 ? 'bg-green-50 text-green-600' :
                            page.seo_score >= 50 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {page.seo_score}/100
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
