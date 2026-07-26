'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { getDesignRequest, customerRespond, addDesignComment } from '@/lib/actions/design-requests';
import { useAuth } from '@/context/AuthContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw, Download,
  Clock, User, FileText, MessageCircle, ThumbsUp,
  AlertTriangle, RotateCcw, Send
} from 'lucide-react';

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

type ActionType = 'approved' | 'revision_requested' | 'rejected';

export default function DesignRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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
      setComments(result.comments || []);
      setHistory(result.history || []);
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const result = await addDesignComment(id, newComment.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Comment added');
      setNewComment('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
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
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">

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
            <span className="font-mono font-bold text-sm text-slate-400 tracking-wider">
              #{id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm font-bold text-slate-800">{request.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-slate-700">{request.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm text-slate-700">{request.phone_number || '—'}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Design Description
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {request.description}
          </p>
          {request.product_name && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Product Name</p>
              <p className="text-sm font-bold text-slate-800">{request.product_name}</p>
            </div>
          )}
        </div>

        {/* Files */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Files Uploaded
            </h2>
            <div className="space-y-6">
              {Object.entries(groupedFiles).map(([type, typeFiles]) => (
                <div key={type}>
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                    {fileTypeLabels[type] || type.replace(/_/g, ' ')}
                  </p>
                  <div className="space-y-2">
                    {typeFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#1a4731] shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-[#1a4731] transition-colors">
                            {file.file_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ''}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-slate-400 group-hover:text-[#1a4731] shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
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
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Comments
          </h2>

          {comments.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No comments yet.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-[#1a4731] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {(c.user?.full_name || c.user?.name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {c.user?.full_name || c.user?.name || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(c.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{c.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment || !newComment.trim()}
              className="px-4 py-2.5 bg-[#1a4731] text-white rounded-xl font-bold text-xs hover:bg-[#2D6A4F] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>

        {/* Approval Actions */}
        {request.status === 'waiting_approval' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
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
