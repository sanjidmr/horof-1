'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDesignRequest, customerRespond, sendDesignRequestMessage, markDesignRequestMessagesRead } from '@/lib/actions/design-requests';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw, Download,
  Clock, User, FileText, MessageCircle, ThumbsUp,
  AlertTriangle, RotateCcw, Send, Paperclip,
  CheckCheck, Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  under_review: 'bg-blue-50 text-blue-700 border-blue-200',
  design_in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  design_ready: 'bg-green-50 text-green-700 border-green-200',
  waiting_approval: 'bg-orange-50 text-orange-700 border-orange-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revision_requested: 'bg-pink-50 text-pink-700 border-pink-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-slate-50 text-slate-700 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  design_in_progress: 'Design In Progress',
  design_ready: 'Design Ready',
  waiting_approval: 'Waiting Approval',
  approved: 'Approved',
  revision_requested: 'Revision Requested',
  rejected: 'Rejected',
  completed: 'Completed',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-50 text-slate-600 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

type ActionType = 'approved' | 'revision_requested' | 'rejected';

const ACCEPTED_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.ai', '.psd', '.eps', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.7z', '.rar', '.tif', '.tiff', '.bmp', '.ico'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: any): boolean {
  const mime = file?.mime_type || '';
  const name = file?.file_name || '';
  return mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|tif|tiff)$/i.test(name);
}

export default function DesignRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDesignRequest(id);
      if (result.error || !result.request) {
        setError(result.error || 'Request not found');
        return;
      }
      if (result.request.customer_id !== user.id) {
        setError('You do not have permission to view this request.');
        return;
      }
      setRequest(result.request);
      setFiles(result.files || []);
      setMessages(result.messages || []);
      setComments(result.comments || []);
      setHistory(result.history || []);

      // Mark messages as read
      await markDesignRequestMessagesRead(id);
    } catch (err: any) {
      setError(err.message || 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && id) {
      fetchData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
      setError('Please log in to view this request.');
    }
  }, [authLoading, isAuthenticated, user, id, fetchData]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!id || !user) return;

    const channel = supabase
      .channel(`dr-messages-${id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'design_request_messages',
        filter: `request_id=eq.${id}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Mark as read if not from self
        if (newMsg.sender_id !== user.id) {
          await markDesignRequestMessagesRead(id);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'design_request_message_files',
        filter: `request_id=eq.${id}`,
      }, async (payload) => {
        const newFile = payload.new as any;
        setMessages(prev => prev.map(m => {
          if (m.id === newFile.message_id) {
            return { ...m, files: [...(m.files || []), newFile] };
          }
          return m;
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'design_requests',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setRequest(prev => prev ? { ...prev, ...updated } : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAction = async (action: ActionType) => {
    setSubmitting(true);
    try {
      const result = await customerRespond(id, action, actionComment || undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const msg = action === 'approved' ? 'approved' : action === 'revision_requested' ? 'sent for revision' : 'rejected';
      toast.success(`Design request ${msg} successfully!`);
      setActiveAction(null);
      setActionComment('');
      setConfirmAction(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFiles = (incoming: FileList | File[]) => {
    const newFiles: File[] = [];
    for (const file of Array.from(incoming)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext)) {
        toast.error(`${file.name}: Unsupported file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: Exceeds 50MB limit`);
        continue;
      }
      newFiles.push(file);
    }
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    setSubmittingMessage(true);
    try {
      const result = await sendDesignRequestMessage(id, newMessage.trim(), selectedFiles.length > 0 ? selectedFiles : undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.uploadErrors && result.uploadErrors.length > 0) {
        result.uploadErrors.forEach(err => toast.error(err));
      }
      toast.success('Message sent');
      setNewMessage('');
      setSelectedFiles([]);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSubmittingMessage(false);
    }
  };

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case 'approved': return <ThumbsUp className="h-6 w-6" />;
      case 'revision_requested': return <RotateCcw className="h-6 w-6" />;
      case 'rejected': return <XCircle className="h-6 w-6" />;
    }
  };

  const getActionTitle = (action: ActionType) => {
    switch (action) {
      case 'approved': return 'Approve Design';
      case 'revision_requested': return 'Request Revision';
      case 'rejected': return 'Reject Design';
    }
  };

  const getActionDescription = (action: ActionType) => {
    switch (action) {
      case 'approved': return 'I confirm this design meets my requirements.';
      case 'revision_requested': return 'I would like some changes made to this design.';
      case 'rejected': return 'This design does not meet my needs.';
    }
  };

  const getActionColors = (action: ActionType) => {
    switch (action) {
      case 'approved':
        return {
          card: 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100',
          icon: 'bg-emerald-50 text-emerald-600',
          primary: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'revision_requested':
        return {
          card: 'border-amber-200 hover:border-amber-400 hover:shadow-amber-100',
          icon: 'bg-amber-50 text-amber-600',
          primary: 'bg-amber-600 hover:bg-amber-700',
        };
      case 'rejected':
        return {
          card: 'border-red-200 hover:border-red-400 hover:shadow-red-100',
          icon: 'bg-red-50 text-red-600',
          primary: 'bg-red-600 hover:bg-red-700',
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#1a4731] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 md:p-12 text-center max-w-md w-full">
          <div className="h-16 w-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-5 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{error}</h2>
          {error.includes('log in') && (
            <Link
              href="/login?next=/design-requests"
              className="inline-flex mt-4 px-5 py-2.5 bg-[#1a4731] text-white rounded-xl font-bold hover:bg-[#2D6A4F] transition-all text-xs uppercase tracking-wider"
            >
              Login
            </Link>
          )}
          <button
            onClick={() => router.back()}
            className="inline-flex mt-4 ml-2 px-5 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const groupedFiles: Record<string, any[]> = {};
  files.forEach((f) => {
    const type = f.file_type || 'other';
    if (!groupedFiles[type]) groupedFiles[type] = [];
    groupedFiles[type].push(f);
  });

  const fileTypeLabels: Record<string, string> = {
    customer_upload: 'Your Uploads',
    design_file: 'Design Files',
    revision_file: 'Revision Files',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 pt-32 pb-16 md:pb-24 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border',
                STATUS_COLORS[request.status] || 'bg-slate-50 text-slate-700 border-slate-200'
              )}
            >
              {STATUS_LABELS[request.status] || request.status.replace(/_/g, ' ')}
            </span>
            <span
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border',
                PRIORITY_COLORS[request.priority] || 'bg-slate-50 text-slate-700 border-slate-200'
              )}
            >
              {request.priority?.toUpperCase() || 'NORMAL'}
            </span>
            <span className="font-mono font-bold text-sm text-slate-400 tracking-wider">
              #{id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Request Info Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
              <p className="text-sm font-bold text-slate-800">{request.product_name || 'Custom Design'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Submitted</p>
              <p className="text-sm text-slate-700">
                {new Date(request.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700 line-clamp-2">{request.description}</p>
            </div>
          </div>
        </div>

        {/* Files Section */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Files ({files.length})
            </h2>
            <div className="space-y-6">
              {Object.entries(groupedFiles).map(([type, typeFiles]) => (
                <div key={type}>
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                    {fileTypeLabels[type] || type.replace(/_/g, ' ')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {typeFiles.map((file) => {
                      const isImage = isImageFile(file);
                      return (
                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group">
                          {isImage ? (
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                              <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#1a4731] shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-[#1a4731] transition-colors">
                              {file.file_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {formatFileSize(file.file_size)}
                            </p>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-slate-400 hover:text-[#1a4731] hover:bg-white transition-colors shrink-0"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat / Conversation Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#1a4731] to-[#2D6A4F]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Design Request Conversation</h3>
                <p className="text-[11px] text-white/70">Chat with our design team</p>
              </div>
            </div>
            <button
              onClick={() => { fetchData(); }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No messages yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Start the conversation with our design team. Send a message or upload files.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const isSystem = msg.message_type === 'system';
                  const msgFiles = msg.files || [];

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 text-[11px] text-slate-500 font-medium">
                          {msg.message}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-3', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      {!isOwn && (
                        <div className="h-8 w-8 rounded-full bg-[#1a4731] flex items-center justify-center shrink-0 mt-1">
                          <span className="text-xs font-bold text-white">A</span>
                        </div>
                      )}
                      <div className={cn('max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                            isOwn
                              ? 'bg-[#1a4731] text-white rounded-br-md'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                          )}
                        >
                          {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                          {msgFiles.length > 0 && (
                            <div className={cn('mt-2 space-y-2', msg.message && 'pt-2 border-t', isOwn ? 'border-white/20' : 'border-slate-100')}>
                              {msgFiles.map((file: any) => {
                                const isImg = isImageFile(file);
                                return (
                                  <div key={file.id} className="flex items-center gap-2">
                                    {isImg ? (
                                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={file.file_url}
                                          alt={file.file_name}
                                          className="max-h-40 rounded-lg object-cover border border-black/10"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                          isOwn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                                        )}
                                      >
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <span className="truncate max-w-[150px]">{file.file_name}</span>
                                        <Download className="h-3.5 w-3.5 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className={cn('flex items-center gap-1.5 mt-1 px-1', isOwn ? 'justify-end' : 'justify-start')}>
                          <span className="text-[10px] text-slate-400 font-medium">{formatTime(msg.created_at)}</span>
                          {isOwn && (
                            <CheckCheck className={cn('h-3 w-3', msg.is_read ? 'text-emerald-500' : 'text-slate-300')} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="" className="h-6 w-6 rounded object-cover" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-slate-600 font-medium max-w-[120px] truncate">{file.name}</span>
                    <span className="text-slate-400">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            <div className="flex items-end gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#1a4731] hover:border-[#1a4731]/30 hover:bg-[#1a4731]/5 transition-all shrink-0"
                title="Attach files"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 focus:bg-white resize-none min-h-[44px] max-h-[120px]"
              />
              <button
                onClick={handleSendMessage}
                disabled={submittingMessage || (!newMessage.trim() && selectedFiles.length === 0)}
                className="p-2.5 bg-[#1a4731] text-white rounded-xl hover:bg-[#2D6A4F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                title="Send message"
              >
                {submittingMessage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              JPG, PNG, PDF, AI, PSD, SVG, ZIP, DOCX, XLSX (max 50MB each)
            </p>
          </div>
        </div>

        {/* Status Timeline */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Timeline
            </h2>
            <div className="space-y-0">
              {history.map((entry, idx) => (
                <div key={entry.id || idx} className="flex gap-4 pb-4 relative">
                  {idx < history.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200" />
                  )}
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 z-10 bg-white',
                      entry.to_status === 'approved' ? 'border-emerald-400' :
                      entry.to_status === 'rejected' ? 'border-red-400' :
                      entry.to_status === 'revision_requested' ? 'border-pink-400' :
                      'border-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        entry.to_status === 'approved' ? 'bg-emerald-400' :
                        entry.to_status === 'rejected' ? 'bg-red-400' :
                        entry.to_status === 'revision_requested' ? 'bg-pink-400' :
                        'bg-slate-300'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">
                        {STATUS_LABELS[entry.to_status] || entry.to_status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(entry.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {entry.comment && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{entry.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Actions */}
        {request.status === 'waiting_approval' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Your Response
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              The design is ready for your review. Please approve, request revisions, or reject.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['approved', 'revision_requested', 'rejected'] as ActionType[]).map((action) => {
                const colors = getActionColors(action);
                const isActive = activeAction === action;
                const isConfirming = confirmAction === action;

                return (
                  <div key={action}>
                    {!isActive ? (
                      <button
                        onClick={() => { setActiveAction(action); setConfirmAction(null); }}
                        className={cn(
                          'w-full p-5 rounded-2xl border-2 bg-white shadow-sm transition-all text-left',
                          colors.card
                        )}
                      >
                        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-4', colors.icon)}>
                          {getActionIcon(action)}
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 mb-1">{getActionTitle(action)}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{getActionDescription(action)}</p>
                      </button>
                    ) : (
                      <div className="p-5 rounded-2xl border-2 bg-white shadow-sm space-y-4"
                        style={{ borderColor: action === 'approved' ? '#34d399' : action === 'revision_requested' ? '#fbbf24' : '#f87171' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', colors.icon)}>
                              {getActionIcon(action)}
                            </div>
                            <h3 className="font-bold text-sm text-slate-800">{getActionTitle(action)}</h3>
                          </div>
                          <button
                            onClick={() => { setActiveAction(null); setActionComment(''); setConfirmAction(null); }}
                            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                          >
                            Cancel
                          </button>
                        </div>

                        <textarea
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                          placeholder="Add a comment (optional)..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30 resize-none"
                        />

                        {!isConfirming ? (
                          <button
                            onClick={() => setConfirmAction(action)}
                            className={cn('w-full py-3 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all', colors.primary)}
                          >
                            Continue
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              Are you sure? This action cannot be undone.
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setConfirmAction(null); setActionComment(''); setActiveAction(null); }}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                disabled={submitting}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAction(action)}
                                disabled={submitting}
                                className={cn('flex-1 py-2.5 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2', colors.primary, submitting && 'opacity-60')}
                              >
                                {submitting ? (
                                  <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Confirm'
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}