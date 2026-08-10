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
import { Save, Eye, Shield, Zap } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MetaPixelSettings = {
  meta_pixel: string;
  meta_capi_token: string;
  meta_domain_verification: string;
  enable_meta_pixel: boolean;
};

export default function MetaPixelClient({ initialSettings }: { initialSettings: MetaPixelSettings }) {
  const [settings, setSettings] = useState<MetaPixelSettings>({
    meta_pixel: initialSettings.meta_pixel || '',
    meta_capi_token: initialSettings.meta_capi_token || '',
    meta_domain_verification: initialSettings.meta_domain_verification || '',
    enable_meta_pixel: initialSettings.enable_meta_pixel || false,
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pixel');

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

      toast.success('Meta Pixel settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Meta Pixel & Facebook Tracking</h1>
        <p className="text-slate-500 mt-2">Configure Meta Pixel, CAPI, and domain verification</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pixel" className="gap-2">
            <Eye className="h-4 w-4" />
            Pixel Setup
          </TabsTrigger>
          <TabsTrigger value="capi" className="gap-2">
            <Zap className="h-4 w-4" />
            CAPI
          </TabsTrigger>
          <TabsTrigger value="verification" className="gap-2">
            <Shield className="h-4 w-4" />
            Verification
          </TabsTrigger>
        </TabsList>

        {/* Meta Pixel Tab */}
        <TabsContent value="pixel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meta Pixel</CardTitle>
              <CardDescription>Set up Meta Pixel for Facebook and Instagram tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-meta-pixel" className="text-base">Enable Meta Pixel</Label>
                  <p className="text-sm text-slate-500">Turn on Meta Pixel tracking</p>
                </div>
                <Switch
                  id="enable-meta-pixel"
                  checked={settings.enable_meta_pixel}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_meta_pixel: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-pixel-id">Meta Pixel ID</Label>
                <Input
                  id="meta-pixel-id"
                  value={settings.meta_pixel}
                  onChange={(e) => setSettings({ ...settings, meta_pixel: e.target.value })}
                  placeholder="123456789012345"
                />
                <p className="text-xs text-slate-500">Found in your Meta Events Manager (format: 15-digit number)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAPI Tab */}
        <TabsContent value="capi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversions API (CAPI)</CardTitle>
              <CardDescription>Configure Meta Conversions API for server-side tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-capi-token">CAPI Access Token</Label>
                <Input
                  id="meta-capi-token"
                  type="password"
                  value={settings.meta_capi_token}
                  onChange={(e) => setSettings({ ...settings, meta_capi_token: e.target.value })}
                  placeholder="EAAJ..."
                />
                <p className="text-xs text-slate-500">Generate this token in your Meta Events Manager under Conversions API</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Verification</CardTitle>
              <CardDescription>Verify your domain for Meta Business Manager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-domain-verification">Domain Verification Code</Label>
                <Input
                  id="meta-domain-verification"
                  value={settings.meta_domain_verification}
                  onChange={(e) => setSettings({ ...settings, meta_domain_verification: e.target.value })}
                  placeholder="meta-domain-verification=abc123xyz"
                />
                <p className="text-xs text-slate-500">
                  Add this code to your site's meta tags or upload the verification file provided by Meta Business Manager
                </p>
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