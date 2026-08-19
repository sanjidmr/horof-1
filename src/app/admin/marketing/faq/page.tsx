'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Save, X, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/shadcn/button';

export default function FAQAdminPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ question: '', answer: '' });
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    fetchFaqs();
  }, [supabase]);

  async function fetchFaqs() {
    setLoading(true);
    const { data } = await supabase.from('faqs').select('*').order('created_at', { ascending: true });
    if (data) setFaqs(data);
    setLoading(false);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('faqs').insert([formData]);
    if (!error) {
      toast.success('FAQ added');
      setFormData({ question: '', answer: '' });
      setIsAdding(false);
      fetchFaqs();
    } else {
      toast.error(error.message);
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from('faqs').update(formData).eq('id', id);
    if (!error) {
      toast.success('FAQ updated');
      setEditingId(null);
      setFormData({ question: '', answer: '' });
      fetchFaqs();
    } else {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (!error) {
      toast.success('FAQ deleted');
      fetchFaqs();
    } else {
      toast.error(error.message);
    }
  };

  const startEditing = (faq: any) => {
    setEditingId(faq.id);
    setFormData({ question: faq.question, answer: faq.answer });
  };

  if (loading && faqs.length === 0) return <div className="p-10 text-center">Loading FAQs...</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">FAQ Management</h1>
          <p className="text-slate-500">Manage frequently asked questions displayed on the homepage.</p>
        </div>
        {!isAdding && (
          <Button 
            onClick={() => { setIsAdding(true); setFormData({ question: '', answer: '' }); }}
            className="bg-forest hover:bg-forest/90 text-gray-800 rounded-xl px-6 h-12 font-bold flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add New FAQ
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">New Question</h2>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question</label>
              <input 
                required 
                type="text" 
                value={formData.question} 
                onChange={e => setFormData({...formData, question: e.target.value})} 
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none" 
                placeholder="e.g. How long does shipping take?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Answer</label>
              <textarea 
                required 
                rows={4}
                value={formData.answer} 
                onChange={e => setFormData({...formData, answer: e.target.value})} 
                className="w-full bg-slate-50 border-none rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-forest outline-none resize-none" 
                placeholder="Provide a clear, helpful answer..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button type="submit" className="bg-black text-white rounded-xl px-8 h-12">Save FAQ</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            {editingId === faq.id ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={formData.question} 
                  onChange={e => setFormData({...formData, question: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold text-slate-900 outline-none" 
                />
                <textarea 
                  rows={3}
                  value={formData.answer} 
                  onChange={e => setFormData({...formData, answer: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm text-slate-600 outline-none resize-none" 
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  <Button size="sm" onClick={() => handleUpdate(faq.id)} className="bg-forest text-white"><Save className="h-4 w-4 mr-1" /> Update</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-forest" /> {faq.question}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(faq)} className="p-2 text-slate-400 hover:text-forest transition-colors"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(faq.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {faqs.length === 0 && !loading && (
          <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <HelpCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No FAQs added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
