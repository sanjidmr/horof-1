'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, Trash2, Send, Upload, MessageCircle, Clock,
  User, FileText, ClipboardList, CheckCircle, XCircle, RefreshCw,
  Plus, DollarSign, Hash, Loader2, Paperclip, CheckCheck, Phone, Mail,
  Flag, Package,
} from 'lucide-react';
import {
  getDesignRequest, updateDesignRequestStatus, addDesignComment,
  uploadDesignFile, sendForApproval, deleteDesignFile,
  sendDesignRequestMessage, markDesignRequestMessagesRead,
  updateDesignRequestPriority,
} from '@/lib/actions/design-requests';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Textarea } from '@/components/shadcn/textarea';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { motion } from 'framer-motion';

const STATUS_OPTIONS = [
  'pending', 'under_review', 'design_in_progress', 'design_ready',
  'waiting_approval', 'approved', 'revision_requested', 'rejected', 'completed',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  under_review: { label: 'Under Review', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
  design_in_progress: { label: 'Design In Progress', color: '#6D28D9', bg: '#E9D5FF', border: '#C4B5FD' },
  design_ready: { label: 'Design Ready', color: '#047857', bg: '#D1FAE5', border: '#6EE7B7' },
  waiting_approval: { label: 'Waiting Approval', color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  approved: { label: 'Approved', color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
  revision_requested: { label: 'Revision Requested', color: '#9D174D', bg: '#FCE7F3', border: '#F9A8D4' },
  rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
  completed: { label: 'Completed', color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low: { label: 'Low', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  normal: { label: 'Normal', color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
  high: { label: 'High', color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  urgent: { label: 'Urgent', color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
};

const ACCEPTED_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf', '.ai', '.psd', '.eps', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.7z', '.rar', '.tif', '.tiff', '.bmp', '.ico'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: large ? '8px 20px' : '4px 12px',
        borderRadius: '9999px',
        fontSize: large ? '16px' : '12px',
        fontWeight: 700,
        textTransform: 'capitalize',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `2px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `2px solid ${cfg.border}`,
      }}
    >
      <Flag className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
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

function Avatar({ name, email, size = 36 }: { name?: string | null; email?: string | null; size?: number }) {
  const letter = (name?.[0] || email?.[0] || 'U').toUpperCase();
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: '#E6F0EB',
        color: '#1a4731',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${size * 0.4}px`,
        flexShrink: 0,
        border: '1px solid #CDE0D6',
      }}
    >
      {letter}
    </div>
  );
}

export default function DesignRequestDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [newMessage, setNewMessage] = useState('');
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [selectedPriority, setSelectedPriority] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const [adminNotes, setAdminNotes] = useState('');
  const [estimatedQuantity, setEstimatedQuantity] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [sfaQuantity, setSfaQuantity] = useState('');
  const [sfaPrice, setSfaPrice] = useState('');
  const [sfaComment, setSfaComment] = useState('');
  const [sendingForApproval, setSendingForApproval] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const supabase = createSupabaseBrowserClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDesignRequest(id);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setSelectedStatus(result.request?.status || '');
        setSelectedPriority(result.request?.priority || 'normal');
        setAdminNotes(result.request?.admin_notes || '');
        setEstimatedQuantity(result.request?.estimated_quantity?.toString() || '');
        setEstimatedPrice(result.request?.estimated_price?.toString() || '');

        const userIds = new Set<string>();
        if (result.request?.customer_id) userIds.add(result.request.customer_id);
        result.history?.forEach((h: any) => { if (h.changed_by) userIds.add(h.changed_by); });
        result.comments?.forEach((c: any) => { if (c.user_id) userIds.add(c.user_id); });
        result.messages?.forEach((m: any) => { if (m.sender_id) userIds.add(m.sender_id); });

        if (userIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(userIds));
          const nameMap: Record<string, string> = {};
          profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });
          setProfileNames(nameMap);
        }

        // Mark messages as read
        await markDesignRequestMessagesRead(id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load design request');
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`admin-dr-${id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'design_request_messages',
        filter: `request_id=eq.${id}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        setData((prev: any) => {
          if (!prev) return prev;
          const exists = prev.messages?.some((m: any) => m.id === newMsg.id);
          if (exists) return prev;
          return { ...prev, messages: [...(prev.messages || []), newMsg] };
        });
        await markDesignRequestMessagesRead(id);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'design_request_message_files',
        filter: `request_id=eq.${id}`,
      }, (payload) => {
        const newFile = payload.new as any;
        setData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages?.map((m: any) =>
              m.id === newFile.message_id ? { ...m, files: [...(m.files || []), newFile] } : m
            ),
          };
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'design_requests',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setData((prev: any) => {
          if (!prev) return prev;
          return { ...prev, request: { ...prev.request, ...updated } };
        });
        setSelectedStatus(updated.status || '');
        setSelectedPriority(updated.priority || 'normal');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === data.request.status) return;
    setUpdatingStatus(true);
    try {
      const { error: err } = await updateDesignRequestStatus(id, selectedStatus, statusComment || undefined);
      if (err) {
        toast.error(err);
      } else {
        toast.success(`Status changed to ${STATUS_CONFIG[selectedStatus]?.label || selectedStatus}`);
        setStatusComment('');
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityUpdate = async () => {
    if (!selectedPriority || selectedPriority === data.request.priority) return;
    setUpdatingPriority(true);
    try {
      const { error: err } = await updateDesignRequestPriority(id, selectedPriority);
      if (err) {
        toast.error(err);
      } else {
        toast.success(`Priority changed to ${PRIORITY_CONFIG[selectedPriority]?.label || selectedPriority}`);
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to update priority');
    } finally {
      setUpdatingPriority(false);
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
      } else {
        if (result.uploadErrors && result.uploadErrors.length > 0) {
          result.uploadErrors.forEach(err => toast.error(err));
        }
        toast.success('Message sent');
        setNewMessage('');
        setSelectedFiles([]);
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error: err } = await updateDesignRequestStatus(
        id,
        data.request.status,
        adminNotes ? `[Notes] Qty: ${estimatedQuantity || 'N/A'}, Price: $${estimatedPrice || 'N/A'} — ${adminNotes}` : undefined,
      );
      if (err) {
        toast.error(err);
      } else {
        toast.success('Notes saved');
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSendForApproval = async () => {
    setSendingForApproval(true);
    try {
      const { error: err } = await sendForApproval(id, {
        comment: sfaComment || undefined,
        estimatedQuantity: sfaQuantity ? Number(sfaQuantity) : undefined,
        estimatedPrice: sfaPrice ? Number(sfaPrice) : undefined,
      });
      if (err) {
        toast.error(err);
      } else {
        toast.success('Sent for approval');
        setSfaComment('');
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to send for approval');
    } finally {
      setSendingForApproval(false);
    }
  };

  const handleUploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const { error: err } = await uploadDesignFile(id, formData);
      if (err) {
        toast.error(err);
      } else {
        toast.success('File uploaded');
        (e.target as HTMLFormElement).reset();
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId);
    try {
      const { error: err } = await deleteDesignFile(fileId);
      if (err) {
        toast.error(err);
      } else {
        toast.success('File deleted');
        setRefreshKey(k => k + 1);
      }
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-7 w-64 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.request) {
    return (
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/design-requests">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Design Request Not Found</h1>
            <p className="text-sm text-slate-500">{error || 'The requested design request does not exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { request, files, messages, comments, history } = data;
  const customerFiles = files?.filter((f: any) => f.file_type === 'customer_upload') || [];
  const adminFiles = files?.filter((f: any) => f.file_type === 'design_file') || [];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-10">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/design-requests">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Design Request #{request.id?.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-slate-500">
            Submitted by {request.full_name} &middot; {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={request.priority} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            className="h-9 rounded-xl gap-1.5 text-xs font-bold"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-[#1a4731]" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                  <p className="text-sm font-medium text-slate-900">{request.full_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {request.phone_number || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {request.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name</span>
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    {request.product_name || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1a4731]" />
                Design Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {request.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Customer Uploaded Files */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#1a4731]" />
                Files Uploaded by Customer ({customerFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customerFiles.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No files uploaded by the customer.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customerFiles.map((file: any) => {
                    const isImage = isImageFile(file);
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-4 px-6 hover:bg-slate-50/50 transition-colors">
                        {isImage ? (
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                            <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.file_name}</p>
                          <p className="text-[11px] text-slate-400">{formatFileSize(file.file_size)}</p>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1a4731] bg-[#E6F0EB] hover:bg-[#CDE0D6] transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Design Files */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#1a4731]" />
                Design Files (Admin) ({adminFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {adminFiles.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No design files uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {adminFiles.map((file: any) => {
                    const isImage = isImageFile(file);
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-4 px-6 hover:bg-slate-50/50 transition-colors">
                        {isImage ? (
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                            <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.file_name}</p>
                          <p className="text-[11px] text-slate-400">{formatFileSize(file.file_size)}</p>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#1a4731] bg-[#E6F0EB] hover:bg-[#CDE0D6] transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          disabled={deletingFileId === file.id}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete file"
                        >
                          {deletingFileId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat / Conversation Section */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-[#1a4731] to-[#2D6A4F]">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Conversation with {request.full_name}
              </CardTitle>
            </CardHeader>

            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto p-6 bg-slate-50/50">
              {!messages || messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No messages yet</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Start the conversation with the customer. Send a message or upload design files.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg: any) => {
                    const isAdmin = msg.sender_role === 'admin';
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
                        className={cn('flex gap-3', isAdmin ? 'justify-end' : 'justify-start')}
                      >
                        {!isAdmin && (
                          <Avatar
                            name={profileNames[msg.sender_id] || request.full_name}
                            email={request.email}
                            size={32}
                          />
                        )}
                        <div className={cn('max-w-[75%]', isAdmin ? 'items-end' : 'items-start')}>
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                              isAdmin
                                ? 'bg-[#1a4731] text-white rounded-br-md'
                                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                            )}
                          >
                            {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                            {msgFiles.length > 0 && (
                              <div className={cn('mt-2 space-y-2', msg.message && 'pt-2 border-t', isAdmin ? 'border-white/20' : 'border-slate-100')}>
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
                                            isAdmin ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
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
                          <div className={cn('flex items-center gap-1.5 mt-1 px-1', isAdmin ? 'justify-end' : 'justify-start')}>
                            <span className="text-[10px] text-slate-400 font-medium">{formatDate(msg.created_at)}</span>
                            {isAdmin && (
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
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Status Management Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#1a4731]" />
                Status Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-center">
                <StatusBadge status={request.status} large />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Change Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s]?.label || s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Comment (optional)
                </Label>
                <Textarea
                  placeholder="Reason for status change..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  className="min-h-[70px] text-sm"
                />
              </div>

              <Button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || selectedStatus === request.status || updatingStatus}
                className="w-full bg-[#1a4731] hover:bg-[#2D6A4F] text-white font-bold text-xs h-9 rounded-xl gap-1.5"
              >
                {updatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </Button>

              <div className="pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => (
                        <SelectItem key={value} value={value}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handlePriorityUpdate}
                  disabled={!selectedPriority || selectedPriority === request.priority || updatingPriority}
                  className="w-full mt-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs h-9 rounded-xl gap-1.5"
                >
                  {updatingPriority ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                  {updatingPriority ? 'Updating...' : 'Update Priority'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes / Estimation Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1a4731]" />
                Admin Notes & Estimation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admin Notes</Label>
                <Textarea
                  placeholder="Internal notes about this request..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Est. Quantity
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={estimatedQuantity}
                    onChange={(e) => setEstimatedQuantity(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Est. Price
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full bg-[#1a4731] hover:bg-[#2D6A4F] text-white font-bold text-xs h-9 rounded-xl gap-1.5"
              >
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </CardContent>
          </Card>

          {/* Send for Approval Card */}
          {request.status === 'design_ready' && (
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden ring-2 ring-[#D1FAE5]">
              <CardHeader className="p-6 border-b border-slate-100 bg-[#D1FAE5]">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#047857]" />
                  Send for Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-slate-500">
                  Send this design to the customer for approval with estimated pricing details.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Est. Quantity
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={sfaQuantity}
                      onChange={(e) => setSfaQuantity(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Est. Price
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={sfaPrice}
                      onChange={(e) => setSfaPrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Comment to Customer
                  </Label>
                  <Textarea
                    placeholder="Add a message for the customer..."
                    value={sfaComment}
                    onChange={(e) => setSfaComment(e.target.value)}
                    className="min-h-[70px] text-sm"
                  />
                </div>

                <Button
                  onClick={handleSendForApproval}
                  disabled={sendingForApproval}
                  className="w-full bg-[#047857] hover:bg-[#065F46] text-white font-bold text-xs h-9 rounded-xl gap-1.5"
                >
                  {sendingForApproval ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sendingForApproval ? 'Sending...' : 'Send for Approval'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload Design Files Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#1a4731]" />
                Upload Design Files
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Select File
                  </Label>
                  <Input
                    type="file"
                    name="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#E6F0EB] file:text-[#1a4731] hover:file:bg-[#CDE0D6]"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-[#1a4731] hover:bg-[#2D6A4F] text-white font-bold text-xs h-9 rounded-xl gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Status Timeline Card */}
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#1a4731]" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {!history || history.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  No status history recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((entry: any, idx: number) => {
                    const fromLabel = entry.from_status
                      ? (STATUS_CONFIG[entry.from_status]?.label || entry.from_status.replace(/_/g, ' '))
                      : '—';
                    const toLabel = STATUS_CONFIG[entry.to_status]?.label || entry.to_status.replace(/_/g, ' ');
                    const toCfg = STATUS_CONFIG[entry.to_status];
                    const changerName = profileNames[entry.changed_by] || entry.changed_by?.slice(0, 8) || 'System';

                    return (
                      <div key={entry.id || idx} className="p-4 px-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: toCfg?.bg || '#F1F5F9', color: toCfg?.color || '#475569' }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap text-sm">
                              <span className="text-xs font-medium text-slate-500">{fromLabel}</span>
                              <span className="text-slate-300">&rarr;</span>
                              <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: toCfg?.bg || '#F1F5F9', color: toCfg?.color || '#475569' }}
                              >
                                {toLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <User className="h-3 w-3" />
                              <span>{changerName}</span>
                              <span>&middot;</span>
                              <span>{formatDate(entry.created_at)}</span>
                            </div>
                            {entry.comment && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                &ldquo;{entry.comment}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}