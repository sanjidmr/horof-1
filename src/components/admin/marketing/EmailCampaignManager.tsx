'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  Plus, Edit2, Trash2, Save, X, Search, Send, Copy, Eye,
  CheckCircle, XCircle, Clock, RefreshCw, Users, BarChart3, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignStatus, CampaignType } from '@/types/database';

type Campaign = {
  id: string; name: string; subject: string; preheader: string | null;
  sender_name: string | null; sender_email: string | null; reply_to: string | null;
  campaign_type: CampaignType; status: CampaignStatus; template_id: string | null;
  html_body: string; plain_text: string | null; dynamic_variables: any;
  product_ids: string[]; audience: any; segment_type: string; segment_filter: any;
  scheduled_at: string | null; sent_at: string | null;
  recipient_count: number; delivered_count: number; open_count: number;
  click_count: number; bounce_count: number; complaint_count: number;
  unsubscribe_count: number; automation_trigger: string | null;
  automation_delay_minutes: number | null; provider: string;
  created_by: string | null; created_at: string; updated_at: string;
};

type Template = { id: string; name: string; subject: string; html_body: string; };

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-50 text-blue-700',
  sending: 'bg-amber-50 text-amber-700',
  sent: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
};

const SEGMENTS = [
  { value: 'all', label: 'All Subscribers' },
  { value: 'subscribers', label: 'Newsletter Subscribers' },
  { value: 'customers', label: 'All Customers' },
  { value: 'vip', label: 'VIP Customers' },
  { value: 'new', label: 'New (Last 30 Days)' },
  { value: 'abandoned', label: 'Abandoned Cart' },
];

const AUTOMATIONS = [
  { value: '', label: 'None (Manual Send)' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'order_confirmation', label: 'Order Confirmation' },
  { value: 'shipping_update', label: 'Shipping Update' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
];

export function EmailCampaignManager({
  initialCampaigns, initialTemplates,
}: {
  initialCampaigns: Campaign[]; initialTemplates: Template[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const [formData, setFormData] = useState({
    name: '', subject: '', preheader: '', sender_name: 'Horof', sender_email: '',
    reply_to: '', campaign_type: 'broadcast' as CampaignType, template_id: '',
    html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
<h1 style="color:#1a4731">Hello {{customer_name}},</h1>
<p>Check out our latest products and exclusive offers!</p>
<p style="text-align:center;margin:30px 0">
  <a href="{{shop_url}}" style="background:#1a4731;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">Shop Now</a>
</p>
<p style="color:#888;font-size:12px">If you no longer wish to receive these emails, <a href="{{unsubscribe_url}}">unsubscribe here</a>.</p>
</div>`,
    plain_text: '', product_ids: '', segment_type: 'all', segment_filter: '{}',
    scheduled_at: '', automation_trigger: '', automation_delay_minutes: 0, provider: 'resend',
  });

  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q) || c.status.toLowerCase().includes(q)
    );
  }, [campaigns, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '', subject: '', preheader: '', sender_name: 'Horof', sender_email: '',
      reply_to: '', campaign_type: 'broadcast', template_id: '',
      html_body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
<h1 style="color:#1a4731">Hello {{customer_name}},</h1>
<p>Check out our latest products and exclusive offers!</p>
<p style="text-align:center;margin:30px 0">
  <a href="{{shop_url}}" style="background:#1a4731;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold">Shop Now</a>
</p>
<p style="color:#888;font-size:12px">If you no longer wish to receive these emails, <a href="{{unsubscribe_url}}">unsubscribe here</a>.</p>
</div>`,
      plain_text: '', product_ids: '', segment_type: 'all', segment_filter: '{}',
      scheduled_at: '', automation_trigger: '', automation_delay_minutes: 0, provider: 'resend',
    });
  };

  const handleEdit = (c: Campaign) => {
    setEditingId(c.id);
    setFormData({
      name: c.name, subject: c.subject, preheader: c.preheader || '',
      sender_name: c.sender_name || 'Horof', sender_email: c.sender_email || '',
      reply_to: c.reply_to || '', campaign_type: c.campaign_type, template_id: c.template_id || '',
      html_body: c.html_body, plain_text: c.plain_text || '',
      product_ids: c.product_ids.join(', '), segment_type: c.segment_type,
      segment_filter: JSON.stringify(c.segment_filter),
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : '',
      automation_trigger: c.automation_trigger || '',
      automation_delay_minutes: c.automation_delay_minutes || 0, provider: c.provider || 'resend',
    });
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      setFormData((p) => ({ ...p, template_id: templateId, subject: t.subject, html_body: t.html_body }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload: any = {
      name: formData.name, subject: formData.subject, preheader: formData.preheader || null,
      sender_name: formData.sender_name || null, sender_email: formData.sender_email || null,
      reply_to: formData.reply_to || null, campaign_type: formData.campaign_type,
      html_body: formData.html_body, plain_text: formData.plain_text || null,
      product_ids: formData.product_ids.split(',').map((s) => s.trim()).filter(Boolean),
      segment_type: formData.segment_type,
      segment_filter: {}, scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
      automation_trigger: formData.automation_trigger || null,
      automation_delay_minutes: formData.automation_delay_minutes || null,
      provider: formData.provider, template_id: formData.template_id || null,
      status: formData.scheduled_at ? 'scheduled' : 'draft',
    };
    if (editingId) payload.id = editingId;
    let query;
    if (editingId) {
      query = supabase.from('email_campaigns').update(payload).eq('id', editingId);
    } else {
      query = supabase.from('email_campaigns').insert(payload).select('*').single();
    }
    const { data, error } = await query;
    if (error) { toast.error(error.message); }
    else {
      toast.success(editingId ? 'Campaign updated' : 'Campaign created');
      if (data) setCampaigns((prev) => editingId ? prev.map((c) => (c.id === editingId ? data : c)) : [data, ...prev]);
      setEditingId(null); setIsAdding(false); resetForm();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success('Campaign deleted');
  };

  const handleDuplicate = async (id: string) => {
    const { data: orig } = await supabase.from('email_campaigns').select('*').eq('id', id).single();
    if (!orig) { toast.error('Campaign not found'); return; }
    const { id: _id, created_at, updated_at, sent_at, status: _s, open_count, click_count, bounce_count, complaint_count, unsubscribe_count, delivered_count, ...rest } = orig;
    const { data, error } = await supabase.from('email_campaigns').insert({ ...rest, name: `${rest.name} (Copy)`, status: 'draft' }).select('*').single();
    if (error) { toast.error(error.message); return; }
    setCampaigns((prev) => [data, ...prev]);
    toast.success('Campaign duplicated');
  };

  const handleSendTest = async () => {
    if (!testEmail) { toast.error('Enter a test email'); return; }
    setSendingTest(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail, subject: `[TEST] ${formData.subject}`,
          html: formData.html_body.replace(/\{\{customer_name\}\}/g, 'Test User'),
          provider: formData.provider,
        }),
      });
      if (!res.ok) { toast.error('Failed to send test email'); }
      else { toast.success('Test email sent!'); }
    } catch { toast.error('Failed to send test email'); }
    setSendingTest(false);
  };

  const handleSendCampaign = async (id: string) => {
    toast.info('Sending campaign... (email provider integration required)');
    const { error } = await supabase.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'sent', sent_at: new Date().toISOString() } : c)));
    toast.success('Campaign marked as sent');
  };

  const getAudienceCountLabel = (segment: string) => {
    const map: Record<string, string> = { all: 'All subscribers', subscribers: 'Newsletter only', customers: 'All customers', vip: 'VIP customers', new: 'New customers', abandoned: 'Abandoned cart' };
    return map[segment] || segment;
  };

  if (previewHtml) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Email Preview</h3>
          <Button variant="outline" size="sm" onClick={() => setPreviewHtml(null)}><X className="w-4 h-4 mr-2" />Close Preview</Button>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <iframe srcDoc={previewHtml} className="w-full h-[80vh]" title="Email Preview" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search campaigns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'New'} Email Campaign</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewHtml(formData.html_body)}>
                <Eye className="w-4 h-4 mr-1" /> Preview
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject Line</Label>
              <Input value={formData.subject} onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Preheader</Label>
              <Input value={formData.preheader} onChange={(e) => setFormData((p) => ({ ...p, preheader: e.target.value }))} placeholder="Preview text after subject" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Campaign Type</Label>
              <select value={formData.campaign_type} onChange={(e) => setFormData((p) => ({ ...p, campaign_type: e.target.value as CampaignType }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                <option value="broadcast">Broadcast</option>
                <option value="welcome">Welcome</option>
                <option value="order_confirmation">Order Confirmation</option>
                <option value="shipping_update">Shipping Update</option>
                <option value="birthday">Birthday</option>
                <option value="abandoned_cart">Abandoned Cart</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sender Name</Label>
              <Input value={formData.sender_name} onChange={(e) => setFormData((p) => ({ ...p, sender_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sender Email</Label>
              <Input type="email" value={formData.sender_email} onChange={(e) => setFormData((p) => ({ ...p, sender_email: e.target.value }))} placeholder="noreply@horof.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Reply-To</Label>
              <Input type="email" value={formData.reply_to} onChange={(e) => setFormData((p) => ({ ...p, reply_to: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Template (optional)</Label>
              <select value={formData.template_id} onChange={(e) => loadTemplate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                <option value="">No template (start from scratch)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Product IDs (comma separated, for showcase)</Label>
              <Input value={formData.product_ids} onChange={(e) => setFormData((p) => ({ ...p, product_ids: e.target.value }))} placeholder="uuid1, uuid2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>HTML Body <span className="text-xs text-slate-400 font-normal">(use {'{{customer_name}}'}, {'{{shop_url}}'}, {'{{unsubscribe_url}}'} variables)</span></Label>
            <textarea value={formData.html_body} onChange={(e) => setFormData((p) => ({ ...p, html_body: e.target.value }))}
              className="w-full h-64 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Audience Segment</Label>
              <select value={formData.segment_type} onChange={(e) => setFormData((p) => ({ ...p, segment_type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Automation Trigger</Label>
              <select value={formData.automation_trigger} onChange={(e) => setFormData((p) => ({ ...p, automation_trigger: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                {AUTOMATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule Send</Label>
              <Input type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData((p) => ({ ...p, scheduled_at: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="flex-1 space-y-1.5">
              <Label>Test Email</Label>
              <div className="flex gap-2">
                <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.name || !formData.subject}>
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Create'} Campaign
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Campaign</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Audience</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Analytics</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Schedule</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[250px]">{c.subject}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{c.campaign_type.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{getAudienceCountLabel(c.segment_type)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', STATUS_STYLES[c.status])}>
                      {c.status === 'sent' && <Send className="w-3 h-3" />}
                      {c.status === 'scheduled' && <Clock className="w-3 h-3" />}
                      {c.status === 'sending' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {c.status === 'draft' && <Eye className="w-3 h-3" />}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.status === 'sent' ? (
                      <span className="flex items-center gap-2">
                        <span title="Opens">{c.open_count} opens</span>
                        <span title="Clicks">{c.click_count} clicks</span>
                        <span title="Bounces">{c.bounce_count} bounces</span>
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <button onClick={() => handleSendCampaign(c.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors" title="Send Now">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingId(c.id); setIsAdding(false); handleEdit(c); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDuplicate(c.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors" title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => setPreviewHtml(c.html_body)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No campaigns found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
