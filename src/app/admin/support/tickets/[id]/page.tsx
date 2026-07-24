'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  User,
  Mail,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  ExternalLink,
  Calendar,
  ShoppingBag,
  Shield,
  ChevronDown,
  Loader2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  FileArchive,
  File,
  Reply,
  StickyNote,
  MoreVertical,
} from 'lucide-react';

import { getTicket, addTicketReply, addTicketNote, updateTicketStatus, updateTicketPriority, assignTicket } from '@/lib/actions/tickets';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { formatPrice } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open: { label: 'Open', color: '#0A58CA', bg: '#EAF2FF', border: '#CFE2FF' },
  pending: { label: 'Pending', color: '#664D03', bg: '#FFF3CD', border: '#FFE69C' },
  in_progress: { label: 'In Progress', color: '#4A1D96', bg: '#E2D9F3', border: '#D1C2EB' },
  resolved: { label: 'Resolved', color: '#1B4332', bg: '#E6F0EB', border: '#CDE0D6' },
  closed: { label: 'Closed', color: '#842029', bg: '#F8D7DA', border: '#F5C2C7' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low: { label: 'Low', color: '#1B4332', bg: '#E6F0EB', border: '#CDE0D6' },
  medium: { label: 'Medium', color: '#664D03', bg: '#FFF3CD', border: '#FFE69C' },
  high: { label: 'High', color: '#842029', bg: '#F8D7DA', border: '#F5C2C7' },
  urgent: { label: 'Urgent', color: '#FFFFFF', bg: '#DC2626', border: '#B91C1C' },
};

const STATUS_OPTIONS = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'capitalize',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {status === 'resolved' || status === 'closed' ? (
        <CheckCircle2 style={{ width: '12px', height: '12px' }} />
      ) : (
        <AlertCircle style={{ width: '12px', height: '12px' }} />
      )}
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'capitalize',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {priority}
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

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon style={{ width: '16px', height: '16px', color: '#0A58CA' }} />;
  if (mimeType?.includes('pdf')) return <FileText style={{ width: '16px', height: '16px', color: '#DC2626' }} />;
  if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return <FileArchive style={{ width: '16px', height: '16px', color: '#664D03' }} />;
  return <File style={{ width: '16px', height: '16px', color: '#6B7280' }} />;
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Avatar({ url, name, email, size = 40 }: { url?: string | null; name?: string | null; email?: string | null; size?: number }) {
  const letter = (name?.[0] || email?.[0] || 'U').toUpperCase();
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: '#E6F0EB',
        color: '#1B4332',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${size * 0.4}px`,
        flexShrink: 0,
        overflow: 'hidden',
        border: '1px solid #CDE0D6',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        letter
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          style={{
            width: '16px',
            height: '16px',
            fill: star <= rating ? '#F59E0B' : 'none',
            color: star <= rating ? '#F59E0B' : '#D1D5DB',
          }}
        />
      ))}
    </div>
  );
}

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingPriority, setChangingPriority] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const loadTicket = useCallback(async () => {
    try {
      const data = await getTicket(id);
      setTicket(data);
      if (!data) setError('Ticket not found');
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchOrders = useCallback(async (customerId: string) => {
    setOrdersLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('orders')
        .select('id, total_price, status, created_at')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      setOrders(data || []);
    } catch {
      // silently fail
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('role', 'admin');
      setAdmins(data || []);
    } catch {
      // silently fail
    }
  }, []);

  const getCurrentUser = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setCurrentUserRole(profile?.role || null);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadTicket();
    fetchAdmins();
    getCurrentUser();
  }, [loadTicket, fetchAdmins, getCurrentUser]);

  useEffect(() => {
    if (ticket?.customer?.id) {
      fetchOrders(ticket.customer.id);
    }
  }, [ticket?.customer?.id, fetchOrders]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`ticket-replies-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${id}` },
        () => loadTicket()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_notes', filter: `ticket_id=eq.${id}` },
        () => loadTicket()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${id}` },
        () => loadTicket()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadTicket]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [ticket?.replies, ticket?.notes]);

  const buildTimeline = useCallback(() => {
    if (!ticket) return [];
    const entries: any[] = [];

    entries.push({
      id: 'ticket-created',
      type: 'ticket',
      created_at: ticket.created_at,
      sender: ticket.customer,
      message: ticket.description,
      isInternal: false,
    });

    if (ticket.replies) {
      ticket.replies.forEach((r: any) => {
        if (!r.is_internal_note) {
          entries.push({
            id: r.id,
            type: 'reply',
            created_at: r.created_at,
            sender: r.sender,
            message: r.message,
            isInternal: false,
          });
        } else {
          entries.push({
            id: `internal-${r.id}`,
            type: 'internal',
            created_at: r.created_at,
            sender: r.sender,
            message: r.message,
            isInternal: true,
          });
        }
      });
    }

    if (ticket.notes) {
      ticket.notes.forEach((n: any) => {
        entries.push({
          id: `note-${n.id}`,
          type: 'note',
          created_at: n.created_at,
          sender: n.admin,
          message: n.note,
          isInternal: true,
        });
      });
    }

    entries.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return entries;
  }, [ticket]);

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;
    setSendingReply(true);
    try {
      const { error: err } = await addTicketReply(id, replyMessage.trim(), false);
      if (err) {
        toast.error(err);
      } else {
        toast.success('Reply sent');
        setReplyMessage('');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAddNote = async () => {
    if (!internalNote.trim()) return;
    setSendingNote(true);
    try {
      const { error: err } = await addTicketNote(id, internalNote.trim());
      if (err) {
        toast.error(err);
      } else {
        toast.success('Internal note added');
        setInternalNote('');
      }
    } catch {
      toast.error('Failed to add note');
    } finally {
      setSendingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === ticket.status) return;
    setChangingStatus(true);
    try {
      const { error: err } = await updateTicketStatus(id, newStatus);
      if (err) {
        toast.error(err);
      } else {
        toast.success(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        await loadTicket();
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (newPriority === ticket.priority) return;
    setChangingPriority(true);
    try {
      const { error: err } = await updateTicketPriority(id, newPriority);
      if (err) {
        toast.error(err);
      } else {
        toast.success(`Priority changed to ${newPriority}`);
        await loadTicket();
      }
    } catch {
      toast.error('Failed to update priority');
    } finally {
      setChangingPriority(false);
    }
  };

  const handleAssign = async (adminId: string) => {
    const value = adminId === 'unassign' ? null : adminId;
    try {
      const { error: err } = await assignTicket(id, value);
      if (err) {
        toast.error(err);
      } else {
        toast.success(adminId === 'unassign' ? 'Ticket unassigned' : 'Ticket assigned');
        await loadTicket();
      }
    } catch {
      toast.error('Failed to assign ticket');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <Skeleton style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
          <div>
            <Skeleton style={{ width: '300px', height: '28px', marginBottom: '4px' }} />
            <Skeleton style={{ width: '200px', height: '16px' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Skeleton style={{ width: '100%', height: '200px', borderRadius: '16px' }} />
            <Skeleton style={{ width: '100%', height: '400px', borderRadius: '16px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Skeleton style={{ width: '100%', height: '200px', borderRadius: '16px' }} />
            <Skeleton style={{ width: '100%', height: '300px', borderRadius: '16px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <Link href="/admin/support">
            <Button variant="outline" size="icon" style={{ height: '40px', width: '40px', borderRadius: '12px' }}>
              <ArrowLeft style={{ width: '20px', height: '20px', color: '#475569' }} />
            </Button>
          </Link>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>Ticket Not Found</h1>
            <p style={{ fontSize: '14px', color: '#64748B' }}>{error || 'The requested ticket does not exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const timeline = buildTimeline();
  const customer = ticket.customer || {};
  const assigned = ticket.assigned;
  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const rating = ticket.ratings?.[0];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link href="/admin/support">
          <Button variant="outline" size="icon" style={{ height: '40px', width: '40px', borderRadius: '12px', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: '20px', height: '20px', color: '#475569' }} />
          </Button>
        </Link>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>
            Ticket #{ticket.ticket_number || ticket.id?.slice(0, 8).toUpperCase()}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B' }}>{ticket.subject}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardContent style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                {ticket.category && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: ticket.category.color ? `${ticket.category.color}15` : '#F1F5F9',
                      color: ticket.category.color || '#475569',
                      border: `1px solid ${ticket.category.color ? `${ticket.category.color}30` : '#E2E8F0'}`,
                    }}
                  >
                    {ticket.category.name || 'Uncategorized'}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>
                  <Clock style={{ width: '14px', height: '14px' }} />
                  Created {formatDate(ticket.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare style={{ width: '18px', height: '18px', color: '#2D6A4F' }} />
                Timeline ({timeline.length})
              </CardTitle>
            </CardHeader>
            <div ref={timelineRef} style={{ maxHeight: '600px', overflowY: 'auto', padding: '0' }}>
              {timeline.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
                  <MessageSquare style={{ width: '40px', height: '40px', margin: '0 auto 12px', color: '#CBD5E1' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>No messages yet</p>
                </div>
              ) : (
                timeline.map((entry: any, idx: number) => {
                  const isLast = idx === timeline.length - 1;
                  const isOwnMessage = entry.isInternal;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '16px 24px',
                        borderBottom: isLast ? 'none' : '1px solid #F1F5F9',
                        background: entry.isInternal ? '#FFFBEB' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Avatar
                          url={entry.sender?.avatar_url}
                          name={entry.sender?.full_name}
                          email={entry.sender?.email}
                          size={36}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                              {entry.sender?.full_name || entry.sender?.email || 'Unknown'}
                            </span>
                            {entry.isInternal && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  background: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FDE68A',
                                }}
                              >
                                <StickyNote style={{ width: '10px', height: '10px' }} />
                                Internal Note
                              </span>
                            )}
                            {entry.type === 'ticket' && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  background: '#EAF2FF',
                                  color: '#0A58CA',
                                  border: '1px solid #CFE2FF',
                                }}
                              >
                                Original Ticket
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>
                              {formatDate(entry.created_at)}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {entry.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Reply style={{ width: '18px', height: '18px', color: '#0A58CA' }} />
                Reply to Customer
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '20px 24px' }}>
              <Textarea
                placeholder="Type your reply here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                style={{
                  minHeight: '120px',
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sendingReply}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: !replyMessage.trim() || sendingReply ? '#94A3B8' : '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                  }}
                >
                  {sendingReply ? (
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Send style={{ width: '16px', height: '16px' }} />
                  )}
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', background: '#FFFBEB' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote style={{ width: '18px', height: '18px', color: '#92400E' }} />
                Internal Note
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#92400E',
                    background: '#FEF3C7',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: '1px solid #FDE68A',
                  }}
                >
                  Not visible to customer
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '20px 24px' }}>
              <Textarea
                placeholder="Add an internal note (only admins can see this)..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                style={{
                  minHeight: '100px',
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '12px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  background: '#FFFBEB',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <Button
                  onClick={handleAddNote}
                  disabled={!internalNote.trim() || sendingNote}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: !internalNote.trim() || sendingNote ? '#94A3B8' : '#92400E',
                    color: '#FFFFFF',
                    border: 'none',
                  }}
                >
                  {sendingNote ? (
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <StickyNote style={{ width: '16px', height: '16px' }} />
                  )}
                  {sendingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User style={{ width: '18px', height: '18px', color: '#2D6A4F' }} />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '20px 24px' }}>
              <Link
                href={`/admin/customers/${customer.id}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <Avatar url={customer.avatar_url} name={customer.full_name} email={customer.email} size={48} />
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                    {customer.full_name || 'Unknown Customer'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Mail style={{ width: '12px', height: '12px' }} />
                    {customer.email || 'No email'}
                  </p>
                </div>
                <ExternalLink style={{ width: '14px', height: '14px', color: '#94A3B8', marginLeft: 'auto', flexShrink: 0 }} />
              </Link>
            </CardContent>
          </Card>

          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield style={{ width: '18px', height: '18px', color: '#2D6A4F' }} />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Status
                </Label>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Priority
                </Label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Assigned To
                </Label>
                <Select
                  value={assigned?.id || 'unassign'}
                  onValueChange={handleAssign}
                >
                  <SelectTrigger style={{ width: '100%' }}>
                    <SelectValue placeholder="Select admin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">Unassigned</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.full_name || admin.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {ticket.status !== 'closed' && ticket.status !== 'resolved' ? (
                  <Button
                    onClick={() => handleStatusChange('resolved')}
                    style={{
                      cursor: 'pointer',
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#E6F0EB',
                      color: '#1B4332',
                      border: '1px solid #CDE0D6',
                    }}
                  >
                    <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                    Resolve
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStatusChange('open')}
                    style={{
                      cursor: 'pointer',
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#EAF2FF',
                      color: '#0A58CA',
                      border: '1px solid #CFE2FF',
                    }}
                  >
                    <AlertCircle style={{ width: '14px', height: '14px' }} />
                    Reopen
                  </Button>
                )}
                {ticket.status !== 'closed' && (
                  <Button
                    onClick={() => handleStatusChange('closed')}
                    style={{
                      cursor: 'pointer',
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#F8D7DA',
                      color: '#842029',
                      border: '1px solid #F5C2C7',
                    }}
                  >
                    <XCircle style={{ width: '14px', height: '14px' }} />
                    Close
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
              <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip style={{ width: '18px', height: '18px', color: '#2D6A4F' }} />
                  Attachments ({ticket.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ticket.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                      background: '#FAFAFA',
                      textDecoration: 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; }}
                  >
                    {getFileIcon(att.mime_type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.file_name || 'Unnamed file'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {formatFileSize(att.file_size)}
                      </p>
                    </div>
                    <Download style={{ width: '14px', height: '14px', color: '#94A3B8', flexShrink: 0 }} />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {rating && (
            <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
              <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star style={{ width: '18px', height: '18px', color: '#F59E0B' }} />
                  Satisfaction Rating
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StarRating rating={rating.rating} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    {rating.rating}/5
                  </span>
                </div>
                {rating.feedback && (
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.5' }}>
                    &ldquo;{rating.feedback}&rdquo;
                  </p>
                )}
                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                  Rated {formatDate(rating.created_at)}
                </p>
              </CardContent>
            </Card>
          )}

          <Card style={{ background: '#FFFFFF', border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
            <CardHeader style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag style={{ width: '18px', height: '18px', color: '#2D6A4F' }} />
                Recent Orders
              </CardTitle>
              <Link href={`/admin/customers/${customer.id}`} style={{ fontSize: '12px', fontWeight: 600, color: '#0A58CA', textDecoration: 'none' }}>
                View all
              </Link>
            </CardHeader>
            <CardContent style={{ padding: '0' }}>
              {ordersLoading ? (
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Skeleton style={{ width: '100%', height: '48px', borderRadius: '8px' }} />
                  <Skeleton style={{ width: '100%', height: '48px', borderRadius: '8px' }} />
                </div>
              ) : orders.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: '#94A3B8' }}>
                  <ShoppingBag style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: '#CBD5E1' }} />
                  <p style={{ fontSize: '13px' }}>No orders yet</p>
                </div>
              ) : (
                orders.map((order: any) => {
                  const orderNum = `#${String(order.id).slice(0, 8).toUpperCase()}`;
                  const orderStatusColors: Record<string, { bg: string; color: string }> = {
                    delivered: { bg: '#E6F0EB', color: '#1B4332' },
                    shipped: { bg: '#EAF2FF', color: '#0A58CA' },
                    processing: { bg: '#FFF3CD', color: '#664D03' },
                    pending: { bg: '#F8F9FA', color: '#212529' },
                    cancelled: { bg: '#F8D7DA', color: '#842029' },
                  };
                  const oc = orderStatusColors[order.status] || { bg: '#F1F5F9', color: '#475569' };
                  return (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 24px',
                        borderBottom: '1px solid #F1F5F9',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                          {orderNum}
                        </p>
                        <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                          {formatPrice(Number(order.total_price || 0))}
                        </p>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            backgroundColor: oc.bg,
                            color: oc.color,
                            marginTop: '2px',
                          }}
                        >
                          {order.status}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
