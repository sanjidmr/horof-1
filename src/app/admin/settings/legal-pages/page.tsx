'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Plus, Trash2, ChevronUp, ChevronDown, FileText, Shield, GripVertical, RefreshCw, ExternalLink } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Section = { id: string; title: string; content: string; order: number };

type PageData = {
  id?: string;
  page_type: string;
  title: string;
  subtitle: string;
  content: Section[];
  contact_info: string;
  meta_title: string;
  meta_description: string;
  last_updated: string;
};

const DEFAULT_SECTIONS: Record<string, Section[]> = {
  terms: [
    { id: 'intro', title: 'Introduction', content: '', order: 1 },
    { id: 'user-responsibilities', title: 'User Responsibilities', content: '', order: 2 },
    { id: 'account-terms', title: 'Account Terms', content: '', order: 3 },
    { id: 'product-information', title: 'Product Information', content: '', order: 4 },
    { id: 'pricing-payment', title: 'Pricing and Payment Terms', content: '', order: 5 },
    { id: 'order-policy', title: 'Order Policy', content: '', order: 6 },
    { id: 'shipping-terms', title: 'Shipping Terms', content: '', order: 7 },
    { id: 'return-refund', title: 'Return and Refund Terms', content: '', order: 8 },
    { id: 'intellectual-property', title: 'Intellectual Property', content: '', order: 9 },
    { id: 'limitation-liability', title: 'Limitation of Liability', content: '', order: 10 },
    { id: 'changes-to-terms', title: 'Changes to Terms', content: '', order: 11 },
    { id: 'contact-information', title: 'Contact Information', content: '', order: 12 },
  ],
  privacy_policy: [
    { id: 'intro', title: 'Introduction', content: '', order: 1 },
    { id: 'information-we-collect', title: 'Information We Collect', content: '', order: 2 },
    { id: 'personal-information-usage', title: 'Personal Information Usage', content: '', order: 3 },
    { id: 'order-information', title: 'Order Information', content: '', order: 4 },
    { id: 'payment-information', title: 'Payment Information', content: '', order: 5 },
    { id: 'cookies-tracking', title: 'Cookies and Tracking', content: '', order: 6 },
    { id: 'third-party-services', title: 'Third Party Services', content: '', order: 7 },
    { id: 'data-security', title: 'Data Security', content: '', order: 8 },
    { id: 'user-rights', title: 'User Rights', content: '', order: 9 },
    { id: 'data-retention', title: 'Data Retention', content: '', order: 10 },
    { id: 'policy-updates', title: 'Policy Updates', content: '', order: 11 },
    { id: 'contact-information', title: 'Contact Information', content: '', order: 12 },
  ],
};

export default function AdminLegalPagesPage() {
  const supabase = createSupabaseBrowserClient();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy_policy'>('terms');
  const [data, setData] = useState<Record<string, PageData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: pages } = await supabase.from('legal_pages').select('*');
    const map: Record<string, PageData> = {};
    (pages || []).forEach((p: any) => {
      map[p.page_type] = {
        id: p.id,
        page_type: p.page_type,
        title: p.title || '',
        subtitle: p.subtitle || '',
        content: Array.isArray(p.content) ? p.content : DEFAULT_SECTIONS[p.page_type] || [],
        contact_info: p.contact_info || '',
        meta_title: p.meta_title || '',
        meta_description: p.meta_description || '',
        last_updated: p.last_updated || '',
      };
    });
    ['terms', 'privacy_policy'].forEach((key) => {
      if (!map[key]) {
        map[key] = {
          page_type: key,
          title: key === 'terms' ? 'Terms & Conditions' : 'Privacy Policy',
          subtitle: '',
          content: DEFAULT_SECTIONS[key] || [],
          contact_info: '',
          meta_title: '',
          meta_description: '',
          last_updated: '',
        };
      }
    });
    setData(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const page = data[activeTab];
  const setPageField = (field: string, value: any) => {
    setData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [field]: value } }));
  };

  const updateSection = (sectionId: string, field: string, value: any) => {
    setPageField('content', (page?.content || []).map((s: Section) =>
      s.id === sectionId ? { ...s, [field]: value } : s
    ));
  };

  const addSection = () => {
    const content = page?.content || [];
    const newId = `section-${Date.now()}`;
    setPageField('content', [...content, { id: newId, title: 'New Section', content: '', order: content.length + 1 }]);
  };

  const removeSection = (sectionId: string) => {
    setPageField('content', (page?.content || []).filter((s: Section) => s.id !== sectionId));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const content = [...(page?.content || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= content.length) return;
    [content[index], content[newIndex]] = [content[newIndex], content[index]];
    content.forEach((s, i) => (s.order = i + 1));
    setPageField('content', content);
  };

  const handleSave = async () => {
    if (!page?.title?.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const content = (page.content || []).map((s: Section, i: number) => ({ ...s, order: i + 1 }));
      const payload = {
        page_type: activeTab,
        title: page.title,
        subtitle: page.subtitle || '',
        content,
        contact_info: page.contact_info || '',
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
        last_updated: new Date().toISOString().split('T')[0],
      };
      const { error } = await supabase.from('legal_pages').upsert(payload, { onConflict: 'page_type' });
      if (error) throw error;
      toast.success(`${activeTab === 'terms' ? 'Terms' : 'Privacy Policy'} saved`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400">Loading legal pages...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Legal Pages</h1>
          <p className="text-slate-500">Manage Terms &amp; Conditions and Privacy Policy content.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={activeTab === 'terms' ? '/terms' : '/privacy-policy'}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
        {[
          { key: 'terms' as const, label: 'Terms & Conditions', icon: FileText },
          { key: 'privacy_policy' as const, label: 'Privacy Policy', icon: Shield },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === t.key ? 'bg-white text-[#1a4731] shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-900">Page Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
              <input value={page?.title || ''} onChange={e => setPageField('title', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Subtitle</label>
              <input value={page?.subtitle || ''} onChange={e => setPageField('subtitle', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Meta Title (SEO)</label>
              <input value={page?.meta_title || ''} onChange={e => setPageField('meta_title', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Last Updated</label>
              <input value={page?.last_updated || ''} readOnly
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Meta Description (SEO)</label>
            <textarea value={page?.meta_description || ''} onChange={e => setPageField('meta_description', e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Content Sections</h3>
            <button onClick={addSection}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition">
              <Plus className="h-3.5 w-3.5" /> Add Section
            </button>
          </div>

          <div className="space-y-3">
            {(page?.content || []).sort((a: Section, b: Section) => a.order - b.order).map((section: Section, index: number) => (
              <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(index, -1)} disabled={index === 0}
                      className="disabled:opacity-30 text-slate-400 hover:text-slate-700 transition">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveSection(index, 1)} disabled={index >= (page?.content?.length || 0) - 1}
                      className="disabled:opacity-30 text-slate-400 hover:text-slate-700 transition">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  <input value={section.title} onChange={e => updateSection(section.id, 'title', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm font-bold text-slate-900 bg-transparent border border-transparent focus:border-slate-300 focus:bg-white rounded-lg focus:outline-none"
                    placeholder="Section title" />
                  <button onClick={() => removeSection(section.id)}
                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <textarea value={section.content} onChange={e => updateSection(section.id, 'content', e.target.value)} rows={5}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-y font-mono text-slate-700"
                    placeholder="<p>Write HTML content here...</p>" />
                  <div className="mt-2 text-[10px] text-slate-400">
                    Supports HTML: &lt;p&gt;, &lt;h3&gt;, &lt;ul&gt;&lt;li&gt;, &lt;ol&gt;&lt;li&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;em&gt;
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h3 className="font-bold text-slate-900">Contact Information</h3>
          <p className="text-xs text-slate-400">Displayed at the bottom of the page if provided.</p>
          <textarea value={page?.contact_info || ''} onChange={e => setPageField('contact_info', e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none font-mono text-slate-700"
            placeholder='<p>Email: studio@horof.com<br/>Phone: +880 1234 567890</p>' />
        </div>
      </div>
    </div>
  );
}
