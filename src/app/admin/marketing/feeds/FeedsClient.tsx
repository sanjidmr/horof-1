'use client';

import { useState, useCallback } from 'react';
import {
  generateGoogleMerchantFeed,
  generateFacebookCatalogFeed,
  generatePinterestFeed,
  generateCSVFeed,
} from '@/lib/actions/product-feeds';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  Download, ExternalLink, Copy, CheckCircle, Rss, FileText,
  ShoppingCart, Image as ImageIcon, Loader2,
} from 'lucide-react';

type FeedType = 'google' | 'facebook' | 'pinterest' | 'csv';

const FEED_CONFIG: Record<FeedType, { title: string; icon: any; description: string; format: string; url: string }> = {
  google: { title: 'Google Merchant', icon: ShoppingCart, description: 'Submit to Google Shopping, free listings, and Google Ads', format: 'XML', url: '/api/shop/google-feed' },
  facebook: { title: 'Facebook Catalog', icon: ImageIcon, description: 'Sync products with Facebook Shop and Instagram Shopping', format: 'JSON', url: '/api/shop/facebook-feed' },
  pinterest: { title: 'Pinterest Feed', icon: Rss, description: 'Submit products to Pinterest for shopping pins', format: 'XML', url: '/api/shop/pinterest-feed' },
  csv: { title: 'CSV Export', icon: FileText, description: 'Download product data as CSV for any platform', format: 'CSV', url: '' },
};

export function FeedsClient() {
  const [activeTab, setActiveTab] = useState<FeedType>('google');
  const [generating, setGenerating] = useState<FeedType | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const feedUrl = `${siteUrl}${FEED_CONFIG[activeTab].url}`;

  const handleGenerate = useCallback(async (type: FeedType) => {
    setGenerating(type);
    setPreview('');
    try {
      let content = '';
      switch (type) {
        case 'google': content = await generateGoogleMerchantFeed(); break;
        case 'facebook': content = await generateFacebookCatalogFeed(); break;
        case 'pinterest': content = await generatePinterestFeed(); break;
        case 'csv': content = await generateCSVFeed(); break;
      }
      setPreview(content);
      toast.success(`${FEED_CONFIG[type].title} feed generated`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate feed');
    } finally {
      setGenerating(null);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!preview) return;
    const config = FEED_CONFIG[activeTab];
    const ext = activeTab === 'csv' ? 'csv' : activeTab === 'facebook' ? 'json' : 'xml';
    const mime = activeTab === 'csv' ? 'text/csv' : activeTab === 'facebook' ? 'application/json' : 'application/xml';
    const blob = new Blob([preview], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-feed.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Feed downloaded');
  }, [preview, activeTab]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success('URL copied');
    setTimeout(() => setCopied(false), 2000);
  }, [feedUrl]);

  return (
    <div className="space-y-6 max-w-6xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Product Feeds</h1>
        <p className="text-slate-500 mt-1">Generate and manage product feeds for advertising platforms</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(FEED_CONFIG) as FeedType[]).map(type => {
          const config = FEED_CONFIG[type];
          const Icon = config.icon;
          return (
            <button key={type} onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                activeTab === type ? 'bg-[#1a4731] text-white border-[#1a4731]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              <Icon className="w-4 h-4" />
              {config.title}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{FEED_CONFIG[activeTab].title} Feed</h2>
            <p className="text-sm text-slate-500">{FEED_CONFIG[activeTab].description}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-600 truncate border border-slate-200">
              {feedUrl || 'Generate preview below'}
            </div>
            {feedUrl && (
              <Button onClick={handleCopyUrl} variant="outline" className="rounded-xl shrink-0">
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => handleGenerate(activeTab)} disabled={generating === activeTab}
              variant="primary" className="rounded-xl">
              {generating === activeTab ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rss className="w-4 h-4 mr-2" />}
              Generate Feed
            </Button>
            {preview && (
              <Button onClick={handleDownload} variant="outline" className="rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            )}
          </div>

          {preview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Preview</span>
                <span className="text-xs text-slate-400">{(preview.length / 1024).toFixed(1)} KB</span>
              </div>
              <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                {preview.substring(0, 5000)}
                {preview.length > 5000 && '\n\n... (truncated for preview)'}
              </pre>
            </div>
          )}

          {!preview && (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Rss className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-bold">No feed generated yet</p>
              <p className="text-sm mt-1">Click "Generate Feed" to preview your product feed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
