'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Search, Eye, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PopupType, PopupTrigger, PopupFrequency } from '@/types/database';

type Popup = {
  id: string; name: string; title: string | null; description: string | null;
  popup_type: PopupType; trigger_type: PopupTrigger; trigger_value: number;
  frequency: PopupFrequency; image_url: string | null;
  background_color: string; text_color: string; button_text: string;
  button_color: string; button_text_color: string;
  coupon_code: string | null; product_id: string | null;
  discount_percent: number | null; discount_amount: number | null;
  display_pages: string[]; display_devices: string[];
  show_to_new_visitors: boolean; show_to_returning_visitors: boolean;
  show_to_logged_in: boolean; show_to_guests: boolean;
  date_start: string | null; date_end: string | null;
  ab_test_enabled: boolean; views: number; conversions: number; closes: number;
  is_active: boolean; priority: number; created_at: string; updated_at: string;
};

const POPUP_TYPES: { value: PopupType; label: string }[] = [
  { value: 'newsletter_signup', label: 'Newsletter Signup' },
  { value: 'discount_offer', label: 'Discount Offer' },
  { value: 'coupon_popup', label: 'Coupon Popup' },
  { value: 'exit_intent', label: 'Exit Intent Popup' },
  { value: 'welcome_popup', label: 'Welcome Popup' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'flash_sale', label: 'Flash Sale' },
  { value: 'product_promotion', label: 'Product Promotion' },
];

const TRIGGER_TYPES: { value: PopupTrigger; label: string }[] = [
  { value: 'on_load', label: 'On Page Load' },
  { value: 'after_seconds', label: 'After X Seconds' },
  { value: 'scroll_percentage', label: 'Scroll Percentage' },
  { value: 'exit_intent', label: 'Exit Intent' },
  { value: 'on_page', label: 'On Specific Page' },
];

const FREQUENCIES: { value: PopupFrequency; label: string }[] = [
  { value: 'once', label: 'Show Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'every_visit', label: 'Every Visit' },
];

export function PopupCampaignManager({ initial }: { initial: Popup[] }) {
  const [popups, setPopups] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPopup, setPreviewPopup] = useState<Popup | null>(null);
  const [formData, setFormData] = useState({
    name: '', title: '', description: '', popup_type: 'newsletter_signup' as PopupType,
    trigger_type: 'on_load' as PopupTrigger, trigger_value: 0, frequency: 'once' as PopupFrequency,
    image_url: '', background_color: '#ffffff', text_color: '#1a4731',
    button_text: 'Subscribe', button_color: '#1a4731', button_text_color: '#ffffff',
    coupon_code: '', product_id: '', discount_percent: 0, discount_amount: 0,
    display_pages: '', display_devices: 'desktop,mobile',
    show_to_new_visitors: true, show_to_returning_visitors: true,
    show_to_logged_in: true, show_to_guests: true,
    date_start: '', date_end: '', priority: 0, is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return popups;
    const q = searchQuery.toLowerCase();
    return popups.filter((p) => p.name.toLowerCase().includes(q) || p.popup_type.toLowerCase().includes(q));
  }, [popups, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '', title: '', description: '', popup_type: 'newsletter_signup',
      trigger_type: 'on_load', trigger_value: 0, frequency: 'once',
      image_url: '', background_color: '#ffffff', text_color: '#1a4731',
      button_text: 'Subscribe', button_color: '#1a4731', button_text_color: '#ffffff',
      coupon_code: '', product_id: '', discount_percent: 0, discount_amount: 0,
      display_pages: '', display_devices: 'desktop,mobile',
      show_to_new_visitors: true, show_to_returning_visitors: true,
      show_to_logged_in: true, show_to_guests: true,
      date_start: '', date_end: '', priority: 0, is_active: true,
    });
  };

  const handleEdit = (p: Popup) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, title: p.title || '', description: p.description || '',
      popup_type: p.popup_type, trigger_type: p.trigger_type,
      trigger_value: p.trigger_value, frequency: p.frequency,
      image_url: p.image_url || '', background_color: p.background_color,
      text_color: p.text_color, button_text: p.button_text, button_color: p.button_color,
      button_text_color: p.button_text_color, coupon_code: p.coupon_code || '',
      product_id: p.product_id || '', discount_percent: p.discount_percent || 0,
      discount_amount: p.discount_amount || 0,
      display_pages: p.display_pages.join(', '),
      display_devices: p.display_devices.join(', '),
      show_to_new_visitors: p.show_to_new_visitors,
      show_to_returning_visitors: p.show_to_returning_visitors,
      show_to_logged_in: p.show_to_logged_in, show_to_guests: p.show_to_guests,
      date_start: p.date_start ? p.date_start.split('T')[0] : '',
      date_end: p.date_end ? p.date_end.split('T')[0] : '',
      priority: p.priority, is_active: p.is_active,
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    const payload: any = {
      name: formData.name, title: formData.title || null, description: formData.description || null,
      popup_type: formData.popup_type, trigger_type: formData.trigger_type,
      trigger_value: formData.trigger_value, frequency: formData.frequency,
      image_url: formData.image_url || null, background_color: formData.background_color,
      text_color: formData.text_color, button_text: formData.button_text,
      button_color: formData.button_color, button_text_color: formData.button_text_color,
      coupon_code: formData.coupon_code || null, product_id: formData.product_id || null,
      discount_percent: formData.discount_percent || null,
      discount_amount: formData.discount_amount || null,
      display_pages: formData.display_pages.split(',').map((s) => s.trim()).filter(Boolean),
      display_devices: formData.display_devices.split(',').map((s) => s.trim()).filter(Boolean),
      show_to_new_visitors: formData.show_to_new_visitors,
      show_to_returning_visitors: formData.show_to_returning_visitors,
      show_to_logged_in: formData.show_to_logged_in, show_to_guests: formData.show_to_guests,
      date_start: formData.date_start ? new Date(formData.date_start).toISOString() : null,
      date_end: formData.date_end ? new Date(formData.date_end).toISOString() : null,
      priority: formData.priority, is_active: formData.is_active,
    };
    if (editingId) payload.id = editingId;
    let query;
    if (editingId) {
      query = supabase.from('popup_campaigns').update(payload).eq('id', editingId).select('*').single();
    } else {
      query = supabase.from('popup_campaigns').insert(payload).select('*').single();
    }
    const { data, error } = await query;
    if (error) { toast.error(error.message); }
    else {
      toast.success(editingId ? 'Popup updated' : 'Popup created');
      if (data) setPopups((prev) => editingId ? prev.map((p) => (p.id === editingId ? data : p)) : [data, ...prev]);
      setEditingId(null); setIsAdding(false); resetForm();
    }
    setIsLoading(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from('popup_campaigns').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setPopups((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)));
    toast.success(active ? 'Popup activated' : 'Popup deactivated');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('popup_campaigns').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setPopups((prev) => prev.filter((p) => p.id !== id));
    toast.success('Popup deleted');
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      newsletter_signup: '📧', discount_offer: '🏷️', coupon_popup: '🎫',
      exit_intent: '🚪', welcome_popup: '👋', announcement: '📢',
      flash_sale: '⚡', product_promotion: '🛍️',
    };
    return icons[type] || '📋';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search popups..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}>
          <Plus className="w-4 h-4 mr-2" /> New Popup
        </Button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit' : 'New'} Popup Campaign</h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Popup Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Popup Type</Label>
              <select value={formData.popup_type} onChange={(e) => setFormData((p) => ({ ...p, popup_type: e.target.value as PopupType }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                {POPUP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" value={formData.priority || ''} onChange={(e) => setFormData((p) => ({ ...p, priority: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={formData.image_url} onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Background Color</Label>
              <Input type="color" value={formData.background_color} onChange={(e) => setFormData((p) => ({ ...p, background_color: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Text Color</Label>
              <Input type="color" value={formData.text_color} onChange={(e) => setFormData((p) => ({ ...p, text_color: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Button Text</Label>
              <Input value={formData.button_text} onChange={(e) => setFormData((p) => ({ ...p, button_text: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Button Color</Label>
              <Input type="color" value={formData.button_color} onChange={(e) => setFormData((p) => ({ ...p, button_color: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Button Text Color</Label>
              <Input type="color" value={formData.button_text_color} onChange={(e) => setFormData((p) => ({ ...p, button_text_color: e.target.value }))} />
            </div>
            {['discount_offer', 'coupon_popup', 'flash_sale'].includes(formData.popup_type) && (
              <div className="space-y-1.5">
                <Label>Coupon Code</Label>
                <Input value={formData.coupon_code} onChange={(e) => setFormData((p) => ({ ...p, coupon_code: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Trigger & Frequency</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Trigger Type</Label>
                <select value={formData.trigger_type} onChange={(e) => setFormData((p) => ({ ...p, trigger_type: e.target.value as PopupTrigger }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                  {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Trigger Value (seconds or %)</Label>
                <Input type="number" min={0} value={formData.trigger_value || ''} onChange={(e) => setFormData((p) => ({ ...p, trigger_value: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <select value={formData.frequency} onChange={(e) => setFormData((p) => ({ ...p, frequency: e.target.value as PopupFrequency }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a4731]/30 focus:border-[#1a4731] outline-none transition-all">
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Display Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Display Pages (comma separated URLs, leave empty for all)</Label>
                <Input value={formData.display_pages} onChange={(e) => setFormData((p) => ({ ...p, display_pages: e.target.value }))} placeholder="/, /products, /cart" />
              </div>
              <div className="space-y-1.5">
                <Label>Devices</Label>
                <Input value={formData.display_devices} onChange={(e) => setFormData((p) => ({ ...p, display_devices: e.target.value }))} placeholder="desktop, mobile, tablet" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.show_to_new_visitors} onChange={(e) => setFormData((p) => ({ ...p, show_to_new_visitors: e.target.checked }))} className="rounded" />
                New Visitors
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.show_to_returning_visitors} onChange={(e) => setFormData((p) => ({ ...p, show_to_returning_visitors: e.target.checked }))} className="rounded" />
                Returning Visitors
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.show_to_logged_in} onChange={(e) => setFormData((p) => ({ ...p, show_to_logged_in: e.target.checked }))} className="rounded" />
                Logged-in Users
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.show_to_guests} onChange={(e) => setFormData((p) => ({ ...p, show_to_guests: e.target.checked }))} className="rounded" />
                Guest Users
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Date Start</Label>
              <Input type="date" value={formData.date_start} onChange={(e) => setFormData((p) => ({ ...p, date_start: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date End</Label>
              <Input type="date" value={formData.date_end} onChange={(e) => setFormData((p) => ({ ...p, date_end: e.target.value }))} />
            </div>
            <div className="space-y-1.5 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setEditingId(null); setIsAdding(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading || !formData.name}>
              <Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Create'} Popup
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Trigger</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Frequency</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Analytics</th>
                <th className="text-left px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{p.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {getTypeIcon(p.popup_type)} {p.popup_type.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.trigger_type.replace(/_/g, ' ')}
                    {p.trigger_value > 0 && ` (${p.trigger_value})`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.frequency.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <span title="Views">👁 {p.views}</span>
                      <span title="Conversions">✅ {p.conversions}</span>
                      <span title="Closes">✕ {p.closes}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(p.id, !p.is_active)}
                      className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors',
                        p.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                      {p.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No popup campaigns found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
