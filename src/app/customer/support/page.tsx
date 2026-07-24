'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Ticket, MessageSquare, Plus, Send, Paperclip, X, ChevronDown,
  ChevronUp, Clock, CheckCircle2, AlertCircle, AlertTriangle,
  ArrowLeft, Star, FileText, Image as ImageIcon, Download,
  Loader2, RefreshCw, Search, Calendar, User, ShieldCheck,
  HelpCircle, Filter, Archive, Inbox
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  createTicket,
  getTickets,
  addTicketReply,
  submitTicketRating,
  getTicketCategories,
  uploadTicketAttachment,
  updateTicketStatus,
  getTicket,
} from '@/lib/actions/tickets';
import {
  getConversations,
  sendMessage,
  createConversation,
  getConversationMessages,
  uploadChatFile,
} from '@/lib/actions/chat';

type TabType = 'tickets' | 'chat';
type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface TicketCategory {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'admin' | 'customer';
  message: string;
  is_internal_note: boolean;
  created_at: string;
  sender?: { id: string; full_name: string; email: string; avatar_url?: string };
}

interface TicketRating {
  ticket_id: string;
  customer_id: string;
  rating: number;
  feedback?: string;
}

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  subject: string;
  description: string;
  category_id?: string;
  priority: Priority;
  status: TicketStatus;
  source: string;
  is_read_by_admin: boolean;
  is_read_by_customer: boolean;
  created_at: string;
  resolved_at?: string;
  closed_at?: string;
  category?: TicketCategory;
  replies?: TicketReply[];
  attachments?: TicketAttachment[];
  ratings?: TicketRating[];
  customer?: { id: string; full_name: string; email: string; avatar_url?: string };
}

interface ChatConversation {
  id: string;
  customer_id: string;
  subject?: string;
  status: 'active' | 'waiting' | 'closed';
  last_message_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'admin' | 'customer';
  message: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_read: boolean;
  created_at: string;
}

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? 'just now' : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileIcon(mimeType?: string, fileName?: string) {
  if (!mimeType && !fileName) return <Paperclip className="w-4 h-4" />;
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-800 border-blue-200/50',
  pending: 'bg-amber-50 text-amber-800 border-amber-200/50',
  in_progress: 'bg-indigo-50 text-indigo-800 border-indigo-200/50',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200/50',
  closed: 'bg-slate-100 text-slate-600 border-slate-200/50',
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-50 text-slate-600 border-slate-200/50',
  medium: 'bg-blue-50 text-blue-700 border-blue-200/50',
  high: 'bg-amber-50 text-amber-700 border-amber-200/50',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200/50',
};

const priorityIcons: Record<Priority, React.ReactNode> = {
  low: <ChevronDown className="w-3 h-3" />,
  medium: <MinusIcon className="w-3 h-3" />,
  high: <ChevronUp className="w-3 h-3" />,
  urgent: <AlertTriangle className="w-3 h-3" />,
};

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TicketCreateModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setCategoryId('');
      setPriority('medium');
      setDescription('');
      setAttachments([]);
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const cats = await getTicketCategories();
      setCategories(cats || []);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const { error, ticket } = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        categoryId: categoryId || undefined,
        priority,
      });

      if (error || !ticket) {
        toast.error(error || 'Failed to create ticket');
        return;
      }

      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append('file', file);
          const { error: uploadError } = await uploadTicketAttachment(ticket.id, formData);
          if (uploadError) {
            toast.error(`Failed to upload ${file.name}: ${uploadError}`);
          }
        }
      }

      toast.success('Ticket created successfully');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Create Support Ticket</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Describe your issue and we'll help resolve it.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              required
              maxLength={200}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all bg-white appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 12px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '20px',
                }}
              >
                <option value="">Select a category</option>
                {loadingCategories ? (
                  <option disabled>Loading...</option>
                ) : (
                  categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={classNames(
                      'flex-1 px-3 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1',
                      priority === p
                        ? priorityColors[p] + ' ring-2 ring-offset-1 ring-slate-200'
                        : 'border-slate-100 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600'
                    )}
                  >
                    {priorityIcons[p]} {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              required
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300 resize-y min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Attachments (optional)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Paperclip className="w-3.5 h-3.5" /> Add Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {attachments.length > 0 && (
                <span className="text-xs text-slate-400 font-medium">{attachments.length} file(s) selected</span>
              )}
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600"
                  >
                    {getFileIcon(file.type, file.name)}
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !description.trim()}
            className="px-6 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Submit Ticket</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TicketDetailView({
  ticketId,
  onBack,
  onUpdated,
}: {
  ticketId: string;
  onBack: () => void;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  const loadTicket = useCallback(async () => {
    try {
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch {
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!ticketId || !supabase) return;
    const channel = supabase
      .channel(`ticket-${ticketId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${ticketId}` },
        () => { loadTicket(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` },
        () => { loadTicket(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, supabase, loadTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.replies]);

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeReplyFile = (index: number) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && replyFiles.length === 0) return;
    setSubmittingReply(true);
    try {
      const { error } = await addTicketReply(ticketId, replyText.trim());
      if (error) { toast.error(error); return; }

      if (replyFiles.length > 0) {
        for (const file of replyFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const { error: uploadError } = await uploadTicketAttachment(ticketId, formData);
          if (uploadError) toast.error(`Failed to upload ${file.name}`);
        }
      }

      setReplyText('');
      setReplyFiles([]);
      toast.success('Reply sent');
      onUpdated();
      await loadTicket();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    setClosingTicket(true);
    try {
      const { error } = await updateTicketStatus(ticketId, status);
      if (error) { toast.error(error); return; }
      toast.success(status === 'closed' ? 'Ticket closed' : 'Ticket reopened');
      onUpdated();
      await loadTicket();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setClosingTicket(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) { toast.error('Please select a rating'); return; }
    setSubmittingRating(true);
    try {
      const { error } = await submitTicketRating(ticketId, rating, ratingFeedback || undefined);
      if (error) { toast.error(error); return; }
      toast.success('Thank you for your feedback!');
      await loadTicket();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-600">Ticket not found</p>
        <button onClick={onBack} className="mt-4 text-xs font-bold text-[#1B4332] hover:underline uppercase tracking-wider">
          Back to tickets
        </button>
      </div>
    );
  }

  const hasRating = ticket.ratings && ticket.ratings.length > 0;
  const isResolvedOrClosed = ticket.status === 'resolved' || ticket.status === 'closed';
  const canRate = ticket.status === 'resolved' && !hasRating;

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">{ticket.subject}</h2>
                <span className={classNames('px-2.5 py-0.5 text-[10px] font-bold rounded-full border tracking-wide uppercase', statusColors[ticket.status])}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={classNames('px-2.5 py-0.5 text-[10px] font-bold rounded-full border tracking-wide uppercase', priorityColors[ticket.priority])}>
                  {ticket.priority}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatFullDate(ticket.created_at)}
                </span>
                {ticket.ticket_number && (
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    #{ticket.ticket_number}
                  </span>
                )}
                {ticket.category && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}
                  >
                    {ticket.category.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isResolvedOrClosed ? (
                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={closingTicket}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                </button>
              ) : ticket.status === 'resolved' ? (
                <button
                  onClick={() => handleUpdateStatus('open')}
                  disabled={closingTicket}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reopen
                </button>
              ) : null}
              {!isResolvedOrClosed && (
                <button
                  onClick={() => handleUpdateStatus('closed')}
                  disabled={closingTicket}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Archive className="w-3.5 h-3.5" /> Close
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center text-sm font-bold shrink-0">
                {(ticket.customer?.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-800">{ticket.customer?.full_name || 'You'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-400 font-bold uppercase tracking-wider">Customer</span>
                  <span className="text-xs text-slate-400 ml-auto">{formatFullDate(ticket.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
          </div>

          {ticket.replies && ticket.replies.length > 0 && ticket.replies.map(reply => (
            <div key={reply.id} className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className={classNames(
                  'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  reply.sender_role === 'admin'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-[#E6F0EB] text-[#1B4332]'
                )}>
                  {(reply.sender?.full_name?.[0] || (reply.sender_role === 'admin' ? 'A' : 'U')).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800">
                      {reply.sender?.full_name || (reply.sender_role === 'admin' ? 'Support Agent' : 'You')}
                    </span>
                    <span className={classNames(
                      'text-[10px] px-1.5 py-0.5 border rounded font-bold uppercase tracking-wider',
                      reply.sender_role === 'admin'
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200/50'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                      {reply.sender_role === 'admin' ? 'Support' : 'Customer'}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">{formatFullDate(reply.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                </div>
              </div>
            </div>
          ))}

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="p-6 md:p-8">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">Attachments</h4>
              <div className="flex flex-wrap gap-3">
                {ticket.attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    {getFileIcon(att.mime_type, att.file_name)}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[180px] group-hover:text-[#1B4332] transition-colors">
                        {att.file_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{formatFileSize(att.file_size)}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1B4332] shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!isResolvedOrClosed ? (
          <form onSubmit={handleReply} className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Reply</label>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300 resize-none"
              />
              {replyFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {replyFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs font-medium text-slate-600"
                    >
                      {getFileIcon(file.type, file.name)}
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button type="button" onClick={() => removeReplyFile(idx)} className="text-slate-400 hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleReplyFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Attach files
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submittingReply || (!replyText.trim() && replyFiles.length === 0)}
                  className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center gap-2 shadow-sm"
                >
                  {submittingReply ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Send Reply</>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : canRate ? (
          <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Rate this support experience</h4>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className={classNames(
                      'w-6 h-6 transition-all',
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-300'
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={ratingFeedback}
              onChange={e => setRatingFeedback(e.target.value)}
              placeholder="Additional feedback (optional)..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300 resize-none mb-3"
            />
            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={submittingRating || rating === 0}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider flex items-center gap-2 shadow-sm"
            >
              {submittingRating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
              ) : (
                <><Star className="w-3.5 h-3.5" /> Submit Rating</>
              )}
            </button>
          </div>
        ) : hasRating ? (
          <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30 text-center">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={classNames(
                    'w-5 h-5',
                    star <= (ticket.ratings?.[0]?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium">You rated this support {ticket.ratings?.[0]?.rating}/5</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChatView({
  conversationId,
  onBack,
}: {
  conversationId: string | null;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await getConversations('customer', user.id);
      setConversations(convs as any);
    } catch {
      console.error('Failed to load conversations');
    }
  }, [user]);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await getConversationMessages(convId);
      setMessages(msgs as any);
    } catch {
      console.error('Failed to load messages');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadConversations(),
      conversationId ? loadMessages(conversationId) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [loadConversations, loadMessages, conversationId]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!supabase || !activeConvId) return;
    const channel = supabase
      .channel(`chat-${activeConvId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvId, supabase]);

  const handleStartChat = async () => {
    if (!user) return;
    setStartingChat(true);
    try {
      const { id, error } = await createConversation(user.id, 'Customer Support Chat');
      if (error) { toast.error(error); return; }
      if (id) {
        setActiveConvId(id);
        await loadConversations();
        await loadMessages(id);
        toast.success('Chat started');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!messageText.trim() && chatFiles.length === 0)) return;
    setSending(true);
    try {
      if (messageText.trim()) {
        const { error } = await sendMessage(activeConvId, messageText.trim());
        if (error) { toast.error(error); return; }
      }

      if (chatFiles.length > 0) {
        for (const file of chatFiles) {
          const formData = new FormData();
          formData.append('file', file);
          const { error, url, name, size, type } = await uploadChatFile(formData);
          if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
          const msgType = type?.startsWith('image/') ? 'image' : 'file';
          await sendMessage(activeConvId, file.name, msgType as any, url, name, size, type);
        }
      }

      setMessageText('');
      setChatFiles([]);
      await loadMessages(activeConvId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setChatFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeChatFile = (index: number) => {
    setChatFiles(prev => prev.filter((_, i) => i !== index));
  };

  const activeConvs = conversations.filter(c => c.status !== 'closed');
  const closedConvs = conversations.filter(c => c.status === 'closed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="lg:w-80 shrink-0">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Conversations</h3>
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 disabled:opacity-50 shadow-sm"
              >
                {startingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                New Chat
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeConvs.length === 0 && closedConvs.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400">No conversations yet</p>
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="mt-3 px-4 py-2 bg-[#1B4332] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#2D6A4F] transition-all disabled:opacity-50"
                >
                  Start a chat
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activeConvs.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={classNames(
                      'w-full text-left p-4 hover:bg-slate-50 transition-colors',
                      activeConvId === conv.id ? 'bg-[#E6F0EB]/40 border-l-2 border-[#1B4332]' : ''
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700 truncate">
                        {conv.subject || 'Support Chat'}
                      </span>
                      <span className={classNames(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider',
                        conv.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {conv.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{formatDate(conv.last_message_at || conv.created_at)}</p>
                  </button>
                ))}
                {closedConvs.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Past Chats</span>
                    </div>
                    {closedConvs.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConvId(conv.id)}
                        className={classNames(
                          'w-full text-left p-4 hover:bg-slate-50 transition-colors opacity-60 hover:opacity-100',
                          activeConvId === conv.id ? 'bg-[#E6F0EB]/40 border-l-2 border-[#1B4332] opacity-100' : ''
                        )}
                      >
                        <span className="text-sm font-bold text-slate-600">{conv.subject || 'Support Chat'}</span>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{formatDate(conv.last_message_at || conv.created_at)}</p>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {activeConvId ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={onBack} className="lg:hidden p-1 text-slate-400 hover:text-slate-700 mr-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-800">
                  {conversations.find(c => c.id === activeConvId)?.subject || 'Chat'}
                </h3>
              </div>
              <span className={classNames(
                'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
                conversations.find(c => c.id === activeConvId)?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              )}>
                {conversations.find(c => c.id === activeConvId)?.status || 'active'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No messages yet. Send a message to start the conversation.</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_role === 'customer';
                  return (
                    <div key={msg.id} className={classNames('flex items-start gap-2.5', isMe ? 'flex-row-reverse' : '')}>
                      <div className={classNames(
                        'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
                        isMe ? 'bg-[#E6F0EB] text-[#1B4332]' : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {isMe ? 'U' : 'S'}
                      </div>
                      <div className={classNames(
                        'max-w-[75%] rounded-2xl px-4 py-2.5',
                        isMe
                          ? 'bg-[#1B4332] text-white rounded-tr-md'
                          : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-md'
                      )}>
                        {msg.message_type === 'image' && msg.file_url ? (
                          <img src={msg.file_url} alt={msg.file_name || 'Image'} className="max-w-full rounded-lg mb-1 max-h-48 object-cover" />
                        ) : msg.message_type === 'file' && msg.file_url ? (
                          <a
                            href={msg.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={classNames(
                              'flex items-center gap-2 text-xs font-bold hover:underline',
                              isMe ? 'text-white/80 hover:text-white' : 'text-[#1B4332]'
                            )}
                          >
                            {getFileIcon(msg.mime_type, msg.file_name)}
                            <span className="truncate max-w-[150px]">{msg.file_name || 'File'}</span>
                          </a>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        )}
                        <div className={classNames(
                          'text-[10px] mt-1 font-medium',
                          isMe ? 'text-white/60' : 'text-slate-400'
                        )}>
                          {formatDate(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50/30">
              {chatFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {chatFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs font-medium text-slate-600"
                    >
                      {getFileIcon(file.type, file.name)}
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button type="button" onClick={() => removeChatFile(idx)} className="text-slate-400 hover:text-rose-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300"
                />
                <button
                  type="submit"
                  disabled={sending || (!messageText.trim() && chatFiles.length === 0)}
                  className="p-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <MessageSquare className="w-16 h-16 text-slate-100 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">Live Chat</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                Select a conversation or start a new chat to speak with our support team in real-time.
              </p>
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="px-6 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 mx-auto disabled:opacity-50 shadow-sm"
              >
                {startingChat ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                ) : (
                  <><MessageSquare className="w-4 h-4" /> Start New Chat</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerSupportPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [stats, setStats] = useState({ openTickets: 0, resolvedTickets: 0, activeChats: 0 });
  const supabase = createSupabaseBrowserClient();

  const loadTickets = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTickets('customer', user.id);
      setTickets(data as any);
      const open = data.filter((t: any) => !['resolved', 'closed'].includes(t.status)).length;
      const resolved = data.filter((t: any) => t.status === 'resolved').length;
      const chats = data.filter((t: any) => t.source === 'chat' && t.status !== 'closed').length;
      setStats({ openTickets: open, resolvedTickets: resolved, activeChats: chats });
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadTickets();
  }, [user, loadTickets]);

  useEffect(() => {
    if (!user || !supabase) return;
    const channelName = `customer-support-${user.id}-${Math.floor(Math.random() * 1000000)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets', filter: `customer_id=eq.${user.id}` },
        () => { loadTickets(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, loadTickets]);

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.category?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Please sign in</h2>
        <p className="text-sm text-slate-400 mb-6">You need to be logged in to access support.</p>
        <a
          href="/login?next=/customer/support"
          className="inline-flex px-6 py-3 bg-[#1B4332] text-white rounded-xl text-sm font-bold hover:bg-[#2D6A4F] transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 text-slate-800">
      <motion.div
        key="header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-xl border border-[#1b4332]/5 bg-gradient-to-tr from-[#1B4332] via-[#24543d] to-[#2D6A4F] p-6 md:p-8 text-white"
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="w-6 h-6 text-emerald-300" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Support</h1>
          </div>
          <p className="text-white/80 text-sm font-medium max-w-xl">
            Submit a support ticket or start a live chat with our team. We're here to help.
          </p>
        </div>
      </motion.div>

      <motion.div
        key="stats"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 md:gap-5"
      >
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <Ticket className="h-5 w-5 md:h-5.5 md:w-5.5" />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Tickets</p>
            <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5">{stats.openTickets}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="h-5 w-5 md:h-5.5 md:w-5.5" />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved</p>
            <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5">{stats.resolvedTickets}</p>
          </div>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-inner">
            <MessageSquare className="h-5 w-5 md:h-5.5 md:w-5.5" />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Chats</p>
            <p className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5">{stats.activeChats}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-1">
        <div className="flex border border-slate-100 p-1 bg-slate-50/50 rounded-2xl">
          {([
            { id: 'tickets', label: 'Tickets', icon: Ticket },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
          ] as { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedTicketId(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1B4332] shadow-sm border border-slate-100'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'tickets' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tickets' ? (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedTicketId ? (
              <TicketDetailView
                ticketId={selectedTicketId}
                onBack={() => setSelectedTicketId(null)}
                onUpdated={loadTickets}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search tickets..."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#E6F0EB] transition-all placeholder:text-slate-300"
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                      {(['all', 'open', 'pending', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={classNames(
                            'whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all shrink-0',
                            statusFilter === s
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                          )}
                        >
                          {s === 'all' ? 'All' : s.replace('_', ' ')}
                          <span className="ml-1 opacity-70">({ticketCounts[s]})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loadingTickets ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1B4332] mx-auto" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="py-16 text-center max-w-sm mx-auto">
                    <div className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">No tickets found</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search or filters.'
                        : 'You haven\'t created any support tickets yet.'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex mt-5 px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all items-center gap-2 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Ticket
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredTickets.map((ticket, idx) => (
                      <motion.button
                        key={ticket.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="w-full text-left p-5 md:p-6 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#1B4332] transition-colors truncate">
                                {ticket.subject}
                              </h4>
                              <span className={classNames(
                                'px-2 py-0.5 text-[9px] font-bold rounded-full border tracking-wide uppercase',
                                statusColors[ticket.status]
                              )}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={classNames(
                                'px-2 py-0.5 text-[9px] font-bold rounded-full border tracking-wide uppercase flex items-center gap-0.5',
                                priorityColors[ticket.priority]
                              )}>
                                {priorityIcons[ticket.priority]}
                                {ticket.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium line-clamp-1">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(ticket.created_at)}
                              </span>
                              {ticket.category && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}
                                >
                                  {ticket.category.name}
                                </span>
                              )}
                              {ticket.attachments && ticket.attachments.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Paperclip className="w-3 h-3" />
                                  {ticket.attachments.length}
                                </span>
                              )}
                              {ticket.replies && ticket.replies.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <MessageSquare className="w-3 h-3" />
                                  {ticket.replies.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 shrink-0 mt-1 hidden sm:block" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ChatView conversationId={null} onBack={() => {}} />
          </motion.div>
        )}
      </AnimatePresence>

      <TicketCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadTickets}
      />
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
