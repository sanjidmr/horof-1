'use client';

import { useState, useCallback } from 'react';
import {
  saveRedirect, deleteRedirect, toggleRedirect, importRedirects,
  type RedirectRow,
} from '@/lib/actions/redirects';
import { Card, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  Plus, Search, Trash2, Edit, ArrowRight, Upload, X,
  ExternalLink, ToggleLeft, ToggleRight, Link2,
} from 'lucide-react';

export function RedirectsClient({ initialRedirects }: { initialRedirects: RedirectRow[] }) {
  const [redirects, setRedirects] = useState<RedirectRow[]>(initialRedirects);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RedirectRow | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = redirects.filter(r =>
    r.from_path.toLowerCase().includes(search.toLowerCase()) ||
    r.to_path.toLowerCase().includes(search.toLowerCase())
  );

  const totalHits = redirects.reduce((sum, r) => sum + (r.hit_count || 0), 0);
  const activeCount = redirects.filter(r => r.is_active).length;

  const handleSave = async (from_path: string, to_path: string, status_code: number, notes: string, id?: string) => {
    const result = await saveRedirect({ id, from_path, to_path, status_code, notes });
    if (result.ok) {
      toast.success(id ? 'Redirect updated' : 'Redirect created');
      if (!id) {
        setRedirects(prev => [{ id: result.id!, from_path, to_path, status_code, is_active: true, hit_count: 0, notes: notes || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
      } else {
        setRedirects(prev => prev.map(r => r.id === id ? { ...r, from_path, to_path, status_code, notes: notes || null } : r));
      }
      setShowForm(false);
      setEditing(null);
    } else {
      toast.error(result.error || 'Failed');
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    const result = await toggleRedirect(id, !current);
    if (result.ok) {
      setRedirects(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
    } else {
      toast.error(result.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteRedirect(id);
    if (result.ok) {
      toast.success('Redirect deleted');
      setRedirects(prev => prev.filter(r => r.id !== id));
      setDeleting(null);
    } else {
      toast.error(result.error || 'Failed');
    }
  };

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(Boolean);
    const pairs = lines.map(line => {
      const parts = line.split(/[,\t;|]+/).map(s => s.trim());
      if (parts.length >= 2) {
        return { from_path: parts[0], to_path: parts[1], status_code: parseInt(parts[2]) || 301 };
      }
      return null;
    }).filter(Boolean) as { from_path: string; to_path: string; status_code: number }[];

    if (pairs.length === 0) {
      toast.error('No valid redirects found. Use format: /old-path, /new-path');
      return;
    }

    const result = await importRedirects(pairs);
    if (result.ok) {
      toast.success(`Imported ${result.imported || pairs.length} redirects`);
      setShowImport(false);
      setImportText('');
      window.location.reload();
    } else {
      toast.error(result.error || 'Import failed');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Redirect Manager</h1>
          <p className="text-slate-500 mt-1">Manage 301 and 302 URL redirects for SEO</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImport(true)} variant="outline" className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} variant="primary" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Add Redirect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{redirects.length}</p>
          <p className="text-xs text-slate-500">Total Redirects</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-slate-500">Active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalHits.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total Hits</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text" placeholder="Search redirects..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
        />
      </div>

      <Card>
        <CardContent className="pt-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No redirects found</p>
              <p className="text-sm mt-1">Add a redirect to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center gap-4 py-3 px-2 hover:bg-slate-50 rounded-lg transition">
                  <button onClick={() => handleToggle(r.id, r.is_active)} className="shrink-0">
                    {r.is_active ? <ToggleRight className="w-8 h-8 text-[#1a4731]" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <code className="font-mono text-xs bg-red-50 text-red-700 px-2 py-1 rounded">{r.from_path}</code>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <code className="font-mono text-xs bg-green-50 text-green-700 px-2 py-1 rounded">{r.to_path}</code>
                    </div>
                    {r.notes && <p className="text-xs text-slate-400 mt-1 truncate">{r.notes}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${r.status_code === 301 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                    {r.status_code}
                  </span>
                  <span className="text-xs text-slate-400 w-16 text-right">{r.hit_count || 0} hits</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleting(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <RedirectForm
          initial={editing}
          onSave={(from, to, code, notes) => handleSave(from, to, code, notes, editing?.id)}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Import Redirects</h3>
              <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-500">Paste one redirect per line. Format: <code>/old-path, /new-path</code> or <code>/old-path /new-path 301</code></p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono resize-none focus:border-[#1a4731] outline-none"
              placeholder={"/old-page, /new-page\n/another-old, /another-new 302"} />
            <div className="flex gap-3">
              <button onClick={() => setShowImport(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button>
              <button onClick={handleImport} className="flex-1 py-3 rounded-xl bg-[#1a4731] text-white text-sm font-bold hover:bg-[#0e2f20]">Import</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDeleting(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 space-y-5 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold">Delete Redirect?</h3>
            <p className="text-sm text-slate-500">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button>
              <button onClick={() => handleDelete(deleting)} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RedirectForm({ initial, onSave, onClose }: {
  initial: RedirectRow | null;
  onSave: (from: string, to: string, code: number, notes: string) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(initial?.from_path || '/');
  const [to, setTo] = useState(initial?.to_path || '/');
  const [code, setCode] = useState(initial?.status_code || 301);
  const [notes, setNotes] = useState(initial?.notes || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{initial ? 'Edit' : 'New'} Redirect</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">From Path</label>
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="/old-page"
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-mono focus:border-[#1a4731] outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">To Path</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="/new-page"
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-mono focus:border-[#1a4731] outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Status Code</label>
            <div className="flex gap-2">
              {[301, 302].map(c => (
                <button key={c} onClick={() => setCode(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${code === c ? 'bg-[#1a4731] text-white border-[#1a4731]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {c} {c === 301 ? '(Permanent)' : '(Temporary)'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"
              className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-[#1a4731] outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button>
          <button onClick={() => onSave(from, to, code, notes)} className="flex-1 py-3 rounded-xl bg-[#1a4731] text-white text-sm font-bold hover:bg-[#0e2f20]">
            {initial ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
