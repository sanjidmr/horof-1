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
import { Save, ExternalLink, Share2, Settings2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SocialMediaSettings = {
  facebook_url: string;
  twitter_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
  tiktok_url: string;
  pinterest_url: string;
  social_auto_post: boolean;
  social_auto_share_products: boolean;
  social_share_buttons: boolean;
  social_feed_enabled: boolean;
};

export default function SocialMediaClient({ initialSettings }: { initialSettings: SocialMediaSettings }) {
  const [settings, setSettings] = useState<SocialMediaSettings>({
    facebook_url: initialSettings.facebook_url || '',
    twitter_url: initialSettings.twitter_url || '',
    instagram_url: initialSettings.instagram_url || '',
    linkedin_url: initialSettings.linkedin_url || '',
    youtube_url: initialSettings.youtube_url || '',
    tiktok_url: initialSettings.tiktok_url || '',
    pinterest_url: initialSettings.pinterest_url || '',
    social_auto_post: initialSettings.social_auto_post || false,
    social_auto_share_products: initialSettings.social_auto_share_products || false,
    social_share_buttons: initialSettings.social_share_buttons || false,
    social_feed_enabled: initialSettings.social_feed_enabled || false,
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profiles');

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: typeof value === 'boolean' ? value : value,
      }));

      const { error } = await supabase
        .from('site_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Social media settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const socialPlatforms = [
    { key: 'facebook_url', label: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourpage' },
    { key: 'twitter_url', label: 'Twitter / X', icon: '🐦', placeholder: 'https://twitter.com/yourhandle' },
    { key: 'instagram_url', label: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/yourprofile' },
    { key: 'linkedin_url', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/yourcompany' },
    { key: 'youtube_url', label: 'YouTube', icon: '🎥', placeholder: 'https://youtube.com/yourchannel' },
    { key: 'tiktok_url', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourhandle' },
    { key: 'pinterest_url', label: 'Pinterest', icon: '📌', placeholder: 'https://pinterest.com/yourprofile' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Social Media Marketing</h1>
        <p className="text-slate-500 mt-2">Manage your social media profiles and sharing settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profiles" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Social Profiles
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Sharing Settings
          </TabsTrigger>
        </TabsList>

        {/* Social Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Profiles</CardTitle>
              <CardDescription>Connect your social media accounts to your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialPlatforms.map((platform) => (
                <div key={platform.key} className="space-y-2">
                  <Label htmlFor={platform.key} className="flex items-center gap-2">
                    <span className="text-xl">{platform.icon}</span>
                    {platform.label}
                  </Label>
                  <Input
                    id={platform.key}
                    type="url"
                    value={settings[platform.key as keyof SocialMediaSettings] as string}
                    onChange={(e) => setSettings({ ...settings, [platform.key]: e.target.value })}
                    placeholder={platform.placeholder}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharing Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Sharing Settings</CardTitle>
              <CardDescription>Configure how content is shared on social media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="social-share-buttons" className="text-base">Social Share Buttons</Label>
                  <p className="text-sm text-slate-500">Show social media share buttons on product pages</p>
                </div>
                <Switch
                  id="social-share-buttons"
                  checked={settings.social_share_buttons}
                  onCheckedChange={(checked) => setSettings({ ...settings, social_share_buttons: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="social-auto-share" className="text-base">Auto-Share Products</Label>
                  <p className="text-sm text-slate-500">Automatically share new products to social media</p>
                </div>
                <Switch
                  id="social-auto-share"
                  checked={settings.social_auto_share_products}
                  onCheckedChange={(checked) => setSettings({ ...settings, social_auto_share_products: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="social-auto-post" className="text-base">Auto-Post Updates</Label>
                  <p className="text-sm text-slate-500">Automatically post updates about orders and promotions</p>
                </div>
                <Switch
                  id="social-auto-post"
                  checked={settings.social_auto_post}
                  onCheckedChange={(checked) => setSettings({ ...settings, social_auto_post: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="social-feed" className="text-base">Social Media Feed</Label>
                  <p className="text-sm text-slate-500">Display social media feed on the website</p>
                </div>
                <Switch
                  id="social-feed"
                  checked={settings.social_feed_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, social_feed_enabled: checked })}
                />
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