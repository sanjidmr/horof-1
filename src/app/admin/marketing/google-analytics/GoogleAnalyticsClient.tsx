'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { toast } from 'sonner';
import { Save, BarChart3, Target, Search } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type GoogleAnalyticsSettings = {
  google_analytics: string;
  google_tag_manager: string;
  google_ads_id: string;
  google_search_console: string;
  enable_ga4: boolean;
  enable_gtm: boolean;
  enable_google_ads: boolean;
};

export default function GoogleAnalyticsClient({ initialSettings }: { initialSettings: GoogleAnalyticsSettings }) {
  const [settings, setSettings] = useState<GoogleAnalyticsSettings>({
    google_analytics: initialSettings.google_analytics || '',
    google_tag_manager: initialSettings.google_tag_manager || '',
    google_ads_id: initialSettings.google_ads_id || '',
    google_search_console: initialSettings.google_search_console || '',
    enable_ga4: initialSettings.enable_ga4 || false,
    enable_gtm: initialSettings.enable_gtm || false,
    enable_google_ads: initialSettings.enable_google_ads || false,
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ga4');

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Google Analytics settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Google Analytics & Tracking</h1>
        <p className="text-slate-500 mt-2">Configure Google Analytics, Tag Manager, and other tracking tools</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="ga4" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            GA4
          </TabsTrigger>
          <TabsTrigger value="gtm" className="gap-2">
            <Target className="h-4 w-4" />
            Tag Manager
          </TabsTrigger>
          <TabsTrigger value="other" className="gap-2">
            <Search className="h-4 w-4" />
            Other Tools
          </TabsTrigger>
        </TabsList>

        {/* GA4 Tab */}
        <TabsContent value="ga4" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics 4 (GA4)</CardTitle>
              <CardDescription>Set up Google Analytics 4 tracking for your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-ga4" className="text-base">Enable GA4</Label>
                  <p className="text-sm text-slate-500">Turn on Google Analytics 4 tracking</p>
                </div>
                <Switch
                  id="enable-ga4"
                  checked={settings.enable_ga4}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_ga4: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-analytics">GA4 Measurement ID</Label>
                <Input
                  id="google-analytics"
                  value={settings.google_analytics}
                  onChange={(e) => setSettings({ ...settings, google_analytics: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-xs text-slate-500">Format: G-XXXXXXXXXX (found in your GA4 property settings)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Tag Manager Tab */}
        <TabsContent value="gtm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Tag Manager</CardTitle>
              <CardDescription>Configure Google Tag Manager for advanced tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-gtm" className="text-base">Enable GTM</Label>
                  <p className="text-sm text-slate-500">Turn on Google Tag Manager</p>
                </div>
                <Switch
                  id="enable-gtm"
                  checked={settings.enable_gtm}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_gtm: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-tag-manager">GTM Container ID</Label>
                <Input
                  id="google-tag-manager"
                  value={settings.google_tag_manager}
                  onChange={(e) => setSettings({ ...settings, google_tag_manager: e.target.value })}
                  placeholder="GTM-XXXXXXX"
                />
                <p className="text-xs text-slate-500">Format: GTM-XXXXXXX (found in your GTM workspace)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tools Tab */}
        <TabsContent value="other" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads & Search Console</CardTitle>
              <CardDescription>Configure additional Google marketing tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-google-ads" className="text-base">Enable Google Ads</Label>
                  <p className="text-sm text-slate-500">Track Google Ads conversions</p>
                </div>
                <Switch
                  id="enable-google-ads"
                  checked={settings.enable_google_ads}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_google_ads: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-ads-id">Google Ads Conversion ID</Label>
                <Input
                  id="google-ads-id"
                  value={settings.google_ads_id}
                  onChange={(e) => setSettings({ ...settings, google_ads_id: e.target.value })}
                  placeholder="AW-XXXXXXXXXX"
                />
                <p className="text-xs text-slate-500">Format: AW-XXXXXXXXXX (found in Google Ads conversion settings)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-search-console">Google Search Console Verification</Label>
                <Input
                  id="google-search-console"
                  value={settings.google_search_console}
                  onChange={(e) => setSettings({ ...settings, google_search_console: e.target.value })}
                  placeholder="google1234567890abc.html"
                />
                <p className="text-xs text-slate-500">Upload the verification file to your public directory or enter the meta tag content</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}