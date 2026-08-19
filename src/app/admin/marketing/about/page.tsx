'use client';

import React, { useEffect, useState } from 'react';
import {
  Save, Eye, Users, Star, CheckCircle, Plus, Trash2, UploadCloud,
  ChevronDown, ChevronUp, Type, Target, ShoppingBag, Award, Leaf,
  Sparkles, ShieldCheck, Zap, Truck, TreePine, EyeIcon, Building2, Globe, Link2
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const ICON_OPTIONS = [
  { label: 'Star', value: 'Star', Icon: Star },
  { label: 'Leaf', value: 'Leaf', Icon: Leaf },
  { label: 'Sparkles', value: 'Sparkles', Icon: Sparkles },
  { label: 'ShieldCheck', value: 'ShieldCheck', Icon: ShieldCheck },
  { label: 'Zap', value: 'Zap', Icon: Zap },
  { label: 'Target', value: 'Target', Icon: Target },
  { label: 'Eye', value: 'Eye', Icon: EyeIcon },
  { label: 'Award', value: 'Award', Icon: Award },
  { label: 'Truck', value: 'Truck', Icon: Truck },
  { label: 'TreePine', value: 'TreePine', Icon: TreePine },
  { label: 'CheckCircle', value: 'CheckCircle', Icon: CheckCircle },
  { label: 'Users', value: 'Users', Icon: Users },
  { label: 'Building2', value: 'Building2', Icon: Building2 },
  { label: 'Globe', value: 'Globe', Icon: Globe },
];

const COLOR_OPTIONS = [
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-100',
  'bg-blue-50 text-blue-700 border-blue-100',
  'bg-purple-50 text-purple-700 border-purple-100',
  'bg-rose-50 text-rose-700 border-rose-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
];

type AboutPage = Record<string, any>;
type TeamMember = { id: string; name: string; position: string; bio: string; email: string; phone: string; image_url: string; social_links: any; display_order: number; is_active: boolean };
type Value = { id: string; title: string; description: string; icon: string; color: string; display_order: number; is_active: boolean };
type WhyChooseUs = { id: string; title: string; description: string; icon: string; display_order: number; is_active: boolean };
type TrustedClient = { id: string; client_name: string; logo_url: string; website_url: string; display_order: number; is_active: boolean };

export default function AdminAboutPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'page' | 'team' | 'values' | 'wcu' | 'clients'>('page');

  const [page, setPage] = useState<AboutPage>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [values, setValues] = useState<Value[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<WhyChooseUs[]>([]);
  const [trustedClients, setTrustedClients] = useState<TrustedClient[]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true, story: false, founder: false, mission: false, vision: false, cta: false, stats: false, seo: false,
  });

  useEffect(() => {
    async function load() {
      const [pageRes, teamRes, valRes, wcuRes, clientRes] = await Promise.all([
        supabase.from('about_page').select('*').limit(1).maybeSingle(),
        supabase.from('about_team_members').select('*').order('display_order'),
        supabase.from('about_values').select('*').order('display_order'),
        supabase.from('about_why_choose_us').select('*').order('display_order'),
        supabase.from('about_trusted_clients').select('*').order('display_order'),
      ]);
      if (pageRes.data) setPage(pageRes.data);
      if (teamRes.data) setTeamMembers(teamRes.data);
      if (valRes.data) setValues(valRes.data);
      if (wcuRes.data) setWhyChooseUs(wcuRes.data);
      if (clientRes.data) setTrustedClients(clientRes.data);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleImageUpload = async (field: string, file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `site-assets/about-${field}-${Math.random()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('site-assets').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path);
      setPage(prev => ({ ...prev, [field]: publicUrl }));
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    }
  };

  const savePage = async () => {
    try {
      setSaving(true);
      const { id, created_at, updated_at, ...rest } = page;
      const { error } = await supabase
        .from('about_page')
        .upsert({ ...rest, id: id || undefined }, { onConflict: 'id' });
      if (error) throw error;
      toast.success('About page saved');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => setPage(prev => ({ ...prev, [field]: value }));

  const toggleSection = (s: string) => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  if (loading) return <div className="p-10 text-center text-slate-400">Loading about page data...</div>;

  const tabs = [
    { key: 'page' as const, label: 'Page Content', icon: Type },
    { key: 'team' as const, label: 'Team Members', icon: Users },
    { key: 'values' as const, label: 'Values', icon: Star },
    { key: 'wcu' as const, label: 'Why Choose Us', icon: CheckCircle },
    { key: 'clients' as const, label: 'Trusted Clients', icon: Building2 },
  ];

  return (
    <div className="space-y-8 max-w-5xl pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">About Page CMS</h1>
        <p className="text-slate-500">Manage all content for the About Us page.</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
        {tabs.map(t => (
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

      {activeTab === 'page' && (
        <div className="space-y-4">
          {[
            { key: 'hero', title: 'Hero Section', fields: renderHeroFields },
            { key: 'story', title: 'Our Story', fields: renderStoryFields },
            { key: 'founder', title: 'Founder Section', fields: renderFounderFields },
            { key: 'mission', title: 'Mission', fields: renderMissionFields },
            { key: 'vision', title: 'Vision', fields: renderVisionFields },
            { key: 'cta', title: 'CTA Section', fields: renderCTAFields },
            { key: 'stats', title: 'Stats', fields: renderStatsFields },
            { key: 'seo', title: 'SEO', fields: renderSEOFields },
          ].map(({ key, title, fields }) => (
            <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition"
              >
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                {openSections[key] ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </button>
              {openSections[key] && (
                <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                  {fields(page, updateField, handleImageUpload)}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={savePage}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
          >
            {saving ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save All Page Content'}
          </button>
        </div>
      )}

      {activeTab === 'team' && (
        <TeamMembersTab members={teamMembers} setMembers={setTeamMembers} supabase={supabase} />
      )}

      {activeTab === 'values' && (
        <ValuesTab values={values} setValues={setValues} supabase={supabase} />
      )}

      {activeTab === 'wcu' && (
        <WhyChooseUsTab items={whyChooseUs} setItems={setWhyChooseUs} supabase={supabase} />
      )}

      {activeTab === 'clients' && (
        <TrustedClientsTab clients={trustedClients} setClients={setTrustedClients} supabase={supabase} />
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', rows, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; rows?: number; placeholder?: string }) {
  if (rows) return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none" />
    </div>
  );
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
    </div>
  );
}

function ImageUpload({ label, url, onUpload }: { label: string; url?: string; onUpload: (f: File) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-2">{label}</label>
      <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 overflow-hidden group">
        {url ? (
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <UploadCloud className="h-8 w-8 mb-1 opacity-30" />
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <label className="bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-bold cursor-pointer hover:scale-105 transition-transform">
            Replace
            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}

function renderHeroFields(page: AboutPage, update: (f: string, v: any) => void, upload: (f: string, f2: File) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Hero Title" value={page.hero_title} onChange={v => update('hero_title', v)} placeholder="e.g. Origin of" />
      <Input label="Hero Subtitle" value={page.hero_subtitle} onChange={v => update('hero_subtitle', v)} />
      <Input label="Hero Badge" value={page.hero_badge} onChange={v => update('hero_badge', v)} placeholder="e.g. Est. 1999" />
      <Input label="Hero Button Text" value={page.hero_button_text} onChange={v => update('hero_button_text', v)} />
      <Input label="Hero Button Link" value={page.hero_button_link} onChange={v => update('hero_button_link', v)} />
      <Input label="Hero Description" value={page.hero_description} onChange={v => update('hero_description', v)} rows={3} />
      <div className="md:col-span-2">
        <ImageUpload label="Hero Background Image" url={page.hero_image_url} onUpload={f => upload('hero_image_url', f)} />
      </div>
    </div>
  );
}

function renderStoryFields(page: AboutPage, update: (f: string, v: any) => void, upload: (f: string, f2: File) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Story Title" value={page.story_title} onChange={v => update('story_title', v)} />
      <Input label="Story Subtitle" value={page.story_subtitle} onChange={v => update('story_subtitle', v)} />
      <div className="md:col-span-2">
        <Input label="Story Content" value={page.story_content} onChange={v => update('story_content', v)} rows={5} />
      </div>
      <div className="md:col-span-2">
        <ImageUpload label="Story Image" url={page.story_image_url} onUpload={f => upload('story_image_url', f)} />
      </div>
    </div>
  );
}

function renderFounderFields(page: AboutPage, update: (f: string, v: any) => void, upload: (f: string, f2: File) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Founder Title" value={page.founder_title} onChange={v => update('founder_title', v)} />
      <Input label="Founder Name" value={page.founder_name} onChange={v => update('founder_name', v)} />
      <Input label="Founder Designation" value={page.founder_designation} onChange={v => update('founder_designation', v)} />
      <Input label="Founder Quote" value={page.founder_quote} onChange={v => update('founder_quote', v)} />
      <div className="md:col-span-2">
        <Input label="Founder Bio" value={page.founder_bio} onChange={v => update('founder_bio', v)} rows={5} />
      </div>
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUpload label="Founder Photo" url={page.founder_image_url} onUpload={f => upload('founder_image_url', f)} />
        <ImageUpload label="Founder Signature" url={page.founder_signature_url} onUpload={f => upload('founder_signature_url', f)} />
      </div>
    </div>
  );
}

function renderMissionFields(page: AboutPage, update: (f: string, v: any) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Mission Title" value={page.mission_title} onChange={v => update('mission_title', v)} />
      <Input label="Mission Icon" value={page.mission_icon} onChange={v => update('mission_icon', v)} />
      <div className="md:col-span-2">
        <Input label="Mission Description" value={page.mission_description} onChange={v => update('mission_description', v)} rows={3} />
      </div>
    </div>
  );
}

function renderVisionFields(page: AboutPage, update: (f: string, v: any) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Vision Title" value={page.vision_title} onChange={v => update('vision_title', v)} />
      <Input label="Vision Icon" value={page.vision_icon} onChange={v => update('vision_icon', v)} />
      <div className="md:col-span-2">
        <Input label="Vision Description" value={page.vision_description} onChange={v => update('vision_description', v)} rows={3} />
      </div>
    </div>
  );
}

function renderCTAFields(page: AboutPage, update: (f: string, v: any) => void, upload: (f: string, f2: File) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="CTA Title" value={page.cta_title} onChange={v => update('cta_title', v)} />
      <div className="md:col-span-2">
        <Input label="CTA Description" value={page.cta_description} onChange={v => update('cta_description', v)} rows={3} />
      </div>
      <Input label="Primary Button Text" value={page.cta_button_text} onChange={v => update('cta_button_text', v)} />
      <Input label="Primary Button Link" value={page.cta_button_link} onChange={v => update('cta_button_link', v)} />
      <Input label="Secondary Button Text" value={page.cta_secondary_button_text} onChange={v => update('cta_secondary_button_text', v)} />
      <Input label="Secondary Button Link" value={page.cta_secondary_button_link} onChange={v => update('cta_secondary_button_link', v)} />
      <div className="md:col-span-2">
        <ImageUpload label="CTA Background Image" url={page.cta_image_url} onUpload={f => upload('cta_image_url', f)} />
      </div>
    </div>
  );
}

function renderStatsFields(page: AboutPage, update: (f: string, v: any) => void) {
  const stats = Array.isArray(page.stats) ? page.stats : [];
  const updateStat = (i: number, field: string, value: string) => {
    const newStats = [...stats];
    newStats[i] = { ...newStats[i], [field]: value };
    update('stats', newStats);
  };
  const addStat = () => update('stats', [...stats, { label: '', value: '', icon: 'ShoppingBag' }]);
  const removeStat = (i: number) => update('stats', stats.filter((_: any, j: number) => j !== i));

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Manage statistic counters displayed on the About page.</p>
      {stats.map((stat: any, i: number) => (
        <div key={i} className="flex gap-3 items-start p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input label="Label" value={stat.label} onChange={v => updateStat(i, 'label', v)} />
            <Input label="Value (e.g. 18,400+)" value={stat.value} onChange={v => updateStat(i, 'value', v)} />
            <Input label="Icon Name" value={stat.icon} onChange={v => updateStat(i, 'icon', v)} />
          </div>
          <button onClick={() => removeStat(i)} className="mt-6 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button onClick={addStat} className="flex items-center gap-2 text-sm text-[#1a4731] font-bold hover:underline">
        <Plus className="h-4 w-4" /> Add Stat
      </button>
    </div>
  );
}

function renderSEOFields(page: AboutPage, update: (f: string, v: any) => void, upload: (f: string, f2: File) => void) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="Meta Title" value={page.meta_title} onChange={v => update('meta_title', v)} />
      <div className="md:col-span-2">
        <Input label="Meta Description" value={page.meta_description} onChange={v => update('meta_description', v)} rows={2} />
      </div>
      <div className="md:col-span-2">
        <ImageUpload label="Open Graph Image (for social sharing)" url={page.og_image_url} onUpload={f => upload('og_image_url', f)} />
      </div>
    </div>
  );
}

function TeamMembersTab({ members, setMembers, supabase }: { members: TeamMember[]; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>; supabase: any }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', bio: '', email: '', phone: '' });
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      setAdding(true);
      const { data, error } = await supabase.from('about_team_members').insert({
        name: form.name, position: form.position, bio: form.bio, email: form.email, phone: form.phone,
        display_order: members.length, is_active: true,
      }).select().single();
      if (error) throw error;
      setMembers(prev => [...prev, data]);
      setForm({ name: '', position: '', bio: '', email: '', phone: '' });
      toast.success('Team member added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team member?')) return;
    const { error } = await supabase.from('about_team_members').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setMembers(prev => prev.filter(m => m.id !== id));
    toast.success('Deleted');
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('about_team_members').update({ is_active: !current }).eq('id', id);
    if (error) return toast.error(error.message);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m));
  };

  const handleImageUpload = async (id: string, file: File) => {
    try {
      setSavingId(id);
      const ext = file.name.split('.').pop();
      const path = `site-assets/team-${id}-${Math.random()}.${ext}`;
      const { error } = await supabase.storage.from('site-assets').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path);
      await supabase.from('about_team_members').update({ image_url: publicUrl }).eq('id', id);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, image_url: publicUrl } : m));
      toast.success('Photo updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900">Add Team Member</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <input placeholder="Position" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
        </div>
        <textarea placeholder="Bio" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none" />
        <button onClick={handleAdd} disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
          {adding ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Member
        </button>
      </div>

      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              {m.image_url ? (
                <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400"><Users className="h-6 w-6 opacity-30" /></div>
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <UploadCloud className="h-4 w-4 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(m.id, e.target.files[0])} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900 truncate">{m.name}</div>
              <div className="text-xs text-slate-500 truncate">{m.position || 'No position'}</div>
              {m.bio && <div className="text-xs text-slate-400 truncate mt-0.5">{m.bio}</div>}
            </div>
            <button onClick={() => toggleActive(m.id, m.is_active)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${m.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
              {m.is_active ? 'Active' : 'Hidden'}
            </button>
            <button onClick={() => handleDelete(m.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {members.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No team members yet.</p>}
      </div>
    </div>
  );
}

function ValuesTab({ values, setValues, supabase }: { values: Value[]; setValues: React.Dispatch<React.SetStateAction<Value[]>>; supabase: any }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', icon: 'Star', color: COLOR_OPTIONS[0] });

  const handleAdd = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      setAdding(true);
      const { data, error } = await supabase.from('about_values').insert({
        ...form, display_order: values.length, is_active: true,
      }).select().single();
      if (error) throw error;
      setValues(prev => [...prev, data]);
      setForm({ title: '', description: '', icon: 'Star', color: COLOR_OPTIONS[0] });
      toast.success('Value added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this value?')) return;
    const { error } = await supabase.from('about_values').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setValues(prev => prev.filter(v => v.id !== id));
    toast.success('Deleted');
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('about_values').update({ is_active: !current }).eq('id', id);
    setValues(prev => prev.map(v => v.id === id ? { ...v, is_active: !current } : v));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900">Add Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <select value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
            {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none" />
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map(c => (
            <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${c} ${form.color === c ? 'ring-2 ring-[#1a4731]' : 'opacity-60 hover:opacity-100'}`}>
              {c.split(' ')[0].replace('bg-', '')}
            </button>
          ))}
        </div>
        <button onClick={handleAdd} disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
          {adding ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Value
        </button>
      </div>

      <div className="space-y-3">
        {values.map(v => (
          <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${v.color}`}>
              {ICON_OPTIONS.find(o => o.value === v.icon)?.Icon ?
                React.createElement(ICON_OPTIONS.find(o => o.value === v.icon)!.Icon, { className: 'h-5 w-5' }) :
                <Star className="h-5 w-5" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900">{v.title}</div>
              {v.description && <div className="text-xs text-slate-500 truncate">{v.description}</div>}
            </div>
            <button onClick={() => toggleActive(v.id, v.is_active)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${v.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
              {v.is_active ? 'Active' : 'Hidden'}
            </button>
            <button onClick={() => handleDelete(v.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {values.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No values yet.</p>}
      </div>
    </div>
  );
}

function WhyChooseUsTab({ items, setItems, supabase }: { items: WhyChooseUs[]; setItems: React.Dispatch<React.SetStateAction<WhyChooseUs[]>>; supabase: any }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', icon: 'CheckCircle' });

  const handleAdd = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      setAdding(true);
      const { data, error } = await supabase.from('about_why_choose_us').insert({
        ...form, display_order: items.length, is_active: true,
      }).select().single();
      if (error) throw error;
      setItems(prev => [...prev, data]);
      setForm({ title: '', description: '', icon: 'CheckCircle' });
      toast.success('Card added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    const { error } = await supabase.from('about_why_choose_us').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Deleted');
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('about_why_choose_us').update({ is_active: !current }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_active: !current } : i));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900">Add Card</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <select value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30">
            {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none" />
        <button onClick={handleAdd} disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
          {adding ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Card
        </button>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              {ICON_OPTIONS.find(o => o.value === item.icon)?.Icon ?
                React.createElement(ICON_OPTIONS.find(o => o.value === item.icon)!.Icon, { className: 'h-5 w-5 text-slate-600' }) :
                <CheckCircle className="h-5 w-5 text-slate-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-slate-900">{item.title}</div>
              {item.description && <div className="text-xs text-slate-500 truncate">{item.description}</div>}
            </div>
            <button onClick={() => toggleActive(item.id, item.is_active)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${item.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
              {item.is_active ? 'Active' : 'Hidden'}
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No cards yet.</p>}
      </div>
    </div>
  );
}

function TrustedClientsTab({ clients, setClients, supabase }: { clients: TrustedClient[]; setClients: React.Dispatch<React.SetStateAction<TrustedClient[]>>; supabase: any }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ client_name: '', website_url: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!form.client_name.trim()) return toast.error('Client name is required');
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast.error('Please select a logo image');
    try {
      setAdding(true);
      const ext = file.name.split('.').pop();
      const path = `site-assets/client-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('site-assets').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('site-assets').getPublicUrl(path);
      const { data, error } = await supabase.from('about_trusted_clients').insert({
        client_name: form.client_name, logo_url: publicUrl, website_url: form.website_url,
        display_order: clients.length, is_active: true,
      }).select().single();
      if (error) throw error;
      setClients(prev => [...prev, data]);
      setForm({ client_name: '', website_url: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Client added');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this client?')) return;
    const { error } = await supabase.from('about_trusted_clients').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Removed');
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('about_trusted_clients').update({ is_active: !current }).eq('id', id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900">Add Client Logo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Client Name *" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <input placeholder="Website URL" value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30" />
          <input ref={fileInputRef} type="file" accept="image/*"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#1a4731] file:text-white file:text-xs file:font-bold" />
        </div>
        <button onClick={handleAdd} disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4731] hover:bg-[#0e2f20] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
          {adding ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center text-center gap-3">
            <div className="relative h-16 w-32 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-3">
              {c.logo_url ? (
                <img src={c.logo_url} alt={c.client_name} className="max-h-full max-w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{c.client_name}</p>
              {c.website_url && (
                <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a4731] hover:underline inline-flex items-center gap-1 mt-0.5">
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(c.id, c.is_active)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {c.is_active ? 'Active' : 'Hidden'}
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && <div className="col-span-full text-center text-slate-400 text-sm py-8">No clients added yet.</div>}
      </div>
    </div>
  );
}
