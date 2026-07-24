'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  MessageSquare, Users, UserCheck, Ticket,
  Search, Filter, Send, Paperclip, Clock,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  TrendingUp, Star, Plus, MoreVertical, Tag,
  ArrowLeft, Loader2, ChevronDown, ChevronRight,
  Phone, Mail, ImageIcon, FileText, Smile,
  UserPlus, UserMinus, RefreshCw, SlidersHorizontal,
  PieChart, Calendar, Reply, Info, File,
  Trash2, AlertTriangle, Check, X, PanelRightOpen,
  MessageCircle, Zap, Maximize, Minimize
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  avatar_url?: string;
};

type ChatTag = {
  id: string;
  name: string;
  color: string;
};

type ConversationTag = {
  tag: ChatTag;
};

type Conversation = {
  id: string;
  customer_id: string;
  assigned_admin_id?: string;
  status: 'active' | 'waiting' | 'resolved' | 'closed';
  subject?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  is_read_by_admin: boolean;
  is_read_by_customer: boolean;
  unread_count: number;
  customer?: Profile;
  assigned?: Profile;
  tags?: ConversationTag[];
};

type ChatMessage = {
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
  sender?: Profile;
};

type ChatNote = {
  id: string;
  conversation_id: string;
  admin_id: string;
  note: string;
  created_at: string;
  admin?: Profile;
};

type Ticket = {
  id: string;
  ticket_number: string;
  customer_id: string;
  assigned_admin_id?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id?: string;
  source: string;
  is_read_by_admin: boolean;
  is_read_by_customer: boolean;
  created_at: string;
  resolved_at?: string;
  closed_at?: string;
  customer?: Profile;
  assigned?: Profile;
  category?: { id: string; name: string; color: string };
  replies?: TicketReply[];
  notes?: TicketNote[];
  ratings?: TicketRating[];
};

type TicketReply = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'admin' | 'customer';
  message: string;
  is_internal_note: boolean;
  created_at: string;
  sender?: Profile;
};

type TicketNote = {
  id: string;
  ticket_id: string;
  admin_id: string;
  note: string;
  created_at: string;
  admin?: Profile;
};

type TicketRating = {
  id: string;
  ticket_id: string;
  customer_id: string;
  rating: number;
  feedback?: string;
};

type SupportAgent = {
  id: string;
  profile_id: string;
  is_online: boolean;
  is_available: boolean;
  last_seen_at?: string;
  profile?: Profile;
};

type SupportStats = {
  activeChats: number;
  waitingCustomers: number;
  onlineAgents: number;
  openTickets: number;
};

type TicketAnalytics = {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgRating: number;
  avgResolutionTime: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  waiting: 'bg-amber-100 text-amber-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-slate-100 text-slate-500',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  pending: 'bg-amber-100 text-amber-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

function StatCard({ label, value, icon: Icon, color, bg, trend }: {
  label: string; value: number | string; icon: any; color: string; bg: string; trend?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn('p-3 rounded-xl', bg, 'group-hover:scale-110 transition-transform')}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
      STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
      PRIORITY_COLORS[priority] || 'bg-slate-100 text-slate-600'
    )}>
      {priority}
    </span>
  );
}

function AgentAvatar({ agent, size = 'md' }: { agent?: Profile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-10 w-10 text-sm' };
  if (!agent) {
    return (
      <div className={cn('rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold', sizeClasses[size])}>
        ?
      </div>
    );
  }
  return (
    <div className={cn('rounded-full bg-[#1a4731]/10 flex items-center justify-center text-[#1a4731] font-bold flex-shrink-0', sizeClasses[size])}>
      {agent.full_name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function formatTime(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

export default function AdminSupportPage() {
  const supabase = createSupabaseBrowserClient();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SupportStats>({ activeChats: 0, waitingCustomers: 0, onlineAgents: 0, openTickets: 0 });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [conversationNotes, setConversationNotes] = useState<ChatNote[]>([]);
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [chatNoteInput, setChatNoteInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedChat, setExpandedChat] = useState(false);
  const [onlineAgentIds, setOnlineAgentIds] = useState<Set<string>>(new Set());
  const [typingConversations, setTypingConversations] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketReplyInput, setTicketReplyInput] = useState('');
  const [ticketNoteInput, setTicketNoteInput] = useState('');
  const [sendingTicketReply, setSendingTicketReply] = useState(false);
  const [ticketFilterStatus, setTicketFilterStatus] = useState<string>('all');
  const [ticketFilterPriority, setTicketFilterPriority] = useState<string>('all');
  const [ticketFilterCategory, setTicketFilterCategory] = useState<string>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketCategories, setTicketCategories] = useState<any[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<Profile[]>([]);

  const realtimeChannels = useRef<any[]>([]);
  const hasSetupPresence = useRef(false);

  useEffect(() => {
    fetchAllData();
    setupRealtime();
    return () => {
      realtimeChannels.current.forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
      supabase.removeAllChannels();
      realtimeChannels.current = [];
    };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (hasSetupPresence.current) return;
    hasSetupPresence.current = true;

    const presenceChannel = supabase.channel('agent-presence-' + currentUser.id);
    realtimeChannels.current.push(presenceChannel);
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.userId) onlineIds.add(p.userId);
          });
        });
        setOnlineAgentIds(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((p: any) => {
          if (p.userId) setOnlineAgentIds(prev => new Set(prev).add(p.userId));
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((p: any) => {
          if (p.userId) setOnlineAgentIds(prev => {
            const next = new Set(prev);
            next.delete(p.userId);
            return next;
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ userId: currentUser.id, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      hasSetupPresence.current = false;
      try { presenceChannel.untrack(); } catch {}
      try { supabase.removeChannel(presenceChannel); } catch {}
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  useEffect(() => {
    const channel = supabase.channel('typing-indicators');
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { conversationId, userId } = payload.payload;
        if (userId !== currentUser?.id) {
          setTypingConversations(prev => new Set(prev).add(conversationId));
          setTimeout(() => {
            setTypingConversations(prev => {
              const next = new Set(prev);
              next.delete(conversationId);
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setCurrentUser(profile);
      }

      const [statsData, convs, tickData, ags, tags, cats, admins] = await Promise.all([
        fetchStats(),
        fetchConversations(),
        fetchTickets(),
        fetchAgents(),
        fetchTags(),
        fetchCategories(),
        fetchAdmins(),
      ]);

      setStats(statsData);
      setConversations(convs);
      setTickets(tickData);
      setAgents(ags);
      setAllTags(tags);
      setTicketCategories(cats);
      setAdminProfiles(admins);

      const analyticsData = await fetchAnalytics();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching support data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (): Promise<SupportStats> => {
    const [activeChats, waiting, online, openTickets] = await Promise.all([
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabase.from('support_agents').select('id', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).not('status', 'in', '("resolved","closed")'),
    ]);
    return {
      activeChats: activeChats.count || 0,
      waitingCustomers: waiting.count || 0,
      onlineAgents: online.count || 0,
      openTickets: openTickets.count || 0,
    };
  };

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        customer:customer_id(id, full_name, email, avatar_url),
        assigned:assigned_admin_id(id, full_name, email, avatar_url),
        tags:chat_conversation_tags(tag:tag_id(id, name, color))
      `)
      .order('last_message_at', { ascending: false });
    return (data || []) as unknown as Conversation[];
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select(`
        *,
        customer:customer_id(id, full_name, email, avatar_url),
        assigned:assigned_admin_id(id, full_name, email),
        category:category_id(id, name, color)
      `)
      .order('created_at', { ascending: false });
    return (data || []) as unknown as Ticket[];
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('support_agents')
      .select('*, profile:profile_id(id, full_name, email, avatar_url)')
      .eq('is_online', true);
    return (data || []) as SupportAgent[];
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('chat_tags').select('*').order('name');
    return (data || []) as ChatTag[];
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('ticket_categories').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  };

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin');
    return (data || []) as Profile[];
  };

  const fetchAnalytics = async (): Promise<TicketAnalytics | null> => {
    const [total, open, resolved, ratings] = await Promise.all([
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'pending', 'in_progress']),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('ticket_ratings').select('rating'),
    ]);

    const avgRating = ratings.data && ratings.data.length > 0
      ? ratings.data.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.data.length
      : 0;

    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select('created_at, resolved_at, status, priority')
      .not('status', 'eq', 'closed');

    const avgResolutionTime = ticketsData && ticketsData.length > 0
      ? ticketsData
          .filter((t: any) => t.resolved_at)
          .reduce((sum: number, t: any) => sum + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()), 0)
          / (ticketsData.filter((t: any) => t.resolved_at).length || 1)
      : 0;

    const byPriority = (ticketsData || []).reduce((acc: any, t: any) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = (ticketsData || []).reduce((acc: any, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTickets: total.count || 0,
      openTickets: open.count || 0,
      resolvedTickets: resolved.count || 0,
      avgRating,
      avgResolutionTime,
      byPriority,
      byStatus,
    };
  };

  const setupRealtime = () => {
    const channel = supabase.channel('support-realtime');
    realtimeChannels.current.push(channel);

    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        async () => {
          const convs = await fetchConversations();
          setConversations(convs);
          const s = await fetchStats();
          setStats(s);
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload: any) => {
          const msg = payload.new;
          if (selectedConversation && msg.conversation_id === selectedConversation.id) {
            setConversationMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg as unknown as ChatMessage];
            });
          }
          const convs = await fetchConversations();
          setConversations(convs);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        async () => {
          const t = await fetchTickets();
          setTickets(t);
          const s = await fetchStats();
          setStats(s);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_agents' },
        async () => {
          const ags = await fetchAgents();
          setAgents(ags);
          const s = await fetchStats();
          setStats(s);
          const onlineIds = new Set(ags.map(a => a.profile_id));
          setOnlineAgentIds(onlineIds);
        }
      )
      .subscribe();
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setExpandedChat(false);

    if (!conversation.is_read_by_admin) {
      await supabase.from('chat_conversations').update({ is_read_by_admin: true, unread_count: 0 }).eq('id', conversation.id);
      setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, is_read_by_admin: true, unread_count: 0 } : c));
    }

    const [messages, notes] = await Promise.all([
      supabase.from('chat_messages').select('*, sender:sender_id(id, full_name, email, avatar_url)').eq('conversation_id', conversation.id).order('created_at', { ascending: true }),
      supabase.from('chat_notes').select('*, admin:admin_id(id, full_name, email)').eq('conversation_id', conversation.id).order('created_at', { ascending: false }),
    ]);

    setConversationMessages((messages.data || []) as unknown as ChatMessage[]);
    setConversationNotes((notes.data || []) as unknown as ChatNote[]);
  };

  const sendChatMessage = async () => {
    if (!chatMessageInput.trim() || !selectedConversation || sendingMessage) return;
    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_role: 'admin',
          message: chatMessageInput.trim(),
          message_type: 'text',
          is_read: false,
        })
        .select('*, sender:sender_id(id, full_name, email, avatar_url)')
        .single();

      if (error) { toast.error(error.message); return; }

      await supabase.rpc('update_conversation_last_message');
      setConversationMessages(prev => [...prev, data as unknown as ChatMessage]);
      setChatMessageInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    toast.loading('Uploading file...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.error) { toast.error(result.error); return; }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_role: 'admin',
          message: result.name,
          message_type: 'file',
          file_url: result.url,
          file_name: result.name,
          file_size: result.size,
          mime_type: result.type,
          is_read: false,
        })
        .select('*, sender:sender_id(id, full_name, email, avatar_url)')
        .single();

      if (error) { toast.error(error.message); return; }
      setConversationMessages(prev => [...prev, data as unknown as ChatMessage]);
      toast.dismiss();
      toast.success('File shared');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to upload file');
    }
    e.target.value = '';
  };

  const addChatNote = async () => {
    if (!chatNoteInput.trim() || !selectedConversation) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_notes')
        .insert({ conversation_id: selectedConversation.id, admin_id: user.id, note: chatNoteInput.trim() });

      if (error) { toast.error(error.message); return; }

      const { data: freshNotes } = await supabase
        .from('chat_notes')
        .select('*, admin:admin_id(id, full_name, email)')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: false });

      setConversationNotes(freshNotes || []);
      setChatNoteInput('');
      toast.success('Note added');
    } catch (err: any) {
      toast.error('Failed to add note');
    }
  };

  const assignConversation = async (conversationId: string, adminId: string | null) => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ assigned_admin_id: adminId })
      .eq('id', conversationId);

    if (error) { toast.error(error.message); return; }
    const convs = await fetchConversations();
    setConversations(convs);
    if (selectedConversation?.id === conversationId) {
      const updated = convs.find(c => c.id === conversationId);
      if (updated) setSelectedConversation(updated);
    }
    toast.success(adminId ? 'Conversation assigned' : 'Assignment removed');
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ status })
      .eq('id', conversationId);

    if (error) { toast.error(error.message); return; }
    const convs = await fetchConversations();
    setConversations(convs);
    if (selectedConversation?.id === conversationId) {
      const updated = convs.find(c => c.id === conversationId);
      if (updated) setSelectedConversation(updated);
    }
    toast.success(`Status changed to ${status}`);
  };

  const toggleConversationTag = async (conversationId: string, tagId: string, hasTag: boolean) => {
    if (hasTag) {
      const { error } = await supabase
        .from('chat_conversation_tags')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('tag_id', tagId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from('chat_conversation_tags')
        .insert({ conversation_id: conversationId, tag_id: tagId });
      if (error) { toast.error(error.message); return; }
    }
    const convs = await fetchConversations();
    setConversations(convs);
    if (selectedConversation?.id === conversationId) {
      const updated = convs.find(c => c.id === conversationId);
      if (updated) setSelectedConversation(updated);
    }
    toast.success(hasTag ? 'Tag removed' : 'Tag added');
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const { data } = await supabase
      .from('support_tickets')
      .select(`
        *,
        customer:customer_id(id, full_name, email, avatar_url),
        assigned:assigned_admin_id(id, full_name, email),
        category:category_id(id, name, color),
        replies:ticket_replies(*, sender:sender_id(id, full_name, email, avatar_url)),
        notes:ticket_notes(*, admin:admin_id(id, full_name, email)),
        ratings:ticket_ratings(*)
      `)
      .eq('id', ticket.id)
      .single();

    if (data) setSelectedTicket(data as unknown as Ticket);

    if (!ticket.is_read_by_admin) {
      await supabase.from('support_tickets').update({ is_read_by_admin: true }).eq('id', ticket.id);
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, is_read_by_admin: true } : t));
    }
  };

  const sendTicketReply = async () => {
    if (!ticketReplyInput.trim() || !selectedTicket || sendingTicketReply) return;
    setSendingTicketReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not authenticated'); return; }

      const { error } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_role: 'admin',
          message: ticketReplyInput.trim(),
          is_internal_note: false,
        });

      if (error) { toast.error(error.message); return; }

      setTicketReplyInput('');
      const { data } = await supabase
        .from('support_tickets')
        .select(`
          *,
          customer:customer_id(id, full_name, email, avatar_url),
          assigned:assigned_admin_id(id, full_name, email),
          category:category_id(id, name, color),
          replies:ticket_replies(*, sender:sender_id(id, full_name, email, avatar_url)),
          notes:ticket_notes(*, admin:admin_id(id, full_name, email)),
          ratings:ticket_ratings(*)
        `)
        .eq('id', selectedTicket.id)
        .single();

      if (data) setSelectedTicket(data as unknown as Ticket);
      toast.success('Reply sent');
    } catch (err: any) {
      toast.error('Failed to send reply');
    } finally {
      setSendingTicketReply(false);
    }
  };

  const addTicketNote = async () => {
    if (!ticketNoteInput.trim() || !selectedTicket) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ticket_notes')
        .insert({ ticket_id: selectedTicket.id, admin_id: user.id, note: ticketNoteInput.trim() });

      if (error) { toast.error(error.message); return; }

      setTicketNoteInput('');
      const { data } = await supabase
        .from('support_tickets')
        .select(`
          *,
          customer:customer_id(id, full_name, email, avatar_url),
          assigned:assigned_admin_id(id, full_name, email),
          category:category_id(id, name, color),
          replies:ticket_replies(*, sender:sender_id(id, full_name, email, avatar_url)),
          notes:ticket_notes(*, admin:admin_id(id, full_name, email)),
          ratings:ticket_ratings(*)
        `)
        .eq('id', selectedTicket.id)
        .single();

      if (data) setSelectedTicket(data as unknown as Ticket);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const updateData: any = { status };
    if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
    if (status === 'closed') updateData.closed_at = new Date().toISOString();

    const { error } = await supabase.from('support_tickets').update(updateData).eq('id', ticketId);
    if (error) { toast.error(error.message); return; }

    const t = await fetchTickets();
    setTickets(t);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: status as any } : null);
    }
    toast.success(`Status changed to ${status}`);
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    const { error } = await supabase.from('support_tickets').update({ priority }).eq('id', ticketId);
    if (error) { toast.error(error.message); return; }

    const t = await fetchTickets();
    setTickets(t);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, priority: priority as any } : null);
    }
    toast.success(`Priority changed to ${priority}`);
  };

  const assignTicket = async (ticketId: string, adminId: string | null) => {
    const { error } = await supabase.from('support_tickets').update({ assigned_admin_id: adminId }).eq('id', ticketId);
    if (error) { toast.error(error.message); return; }

    const t = await fetchTickets();
    setTickets(t);
    if (selectedTicket?.id === ticketId) {
      const updated = t.find(tk => tk.id === ticketId);
      if (updated) setSelectedTicket(updated);
    }
    toast.success(adminId ? 'Ticket assigned' : 'Assignment removed');
  };

  const sendTypingIndicator = useCallback((conversationId: string) => {
    if (!currentUser) return;
    const channel = supabase.channel('typing-indicators');
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { conversationId, userId: currentUser.id },
    });
    supabase.removeChannel(channel);
  }, [currentUser]);

  const filteredTickets = tickets.filter(t => {
    if (ticketFilterStatus !== 'all' && t.status !== ticketFilterStatus) return false;
    if (ticketFilterPriority !== 'all' && t.priority !== ticketFilterPriority) return false;
    if (ticketFilterCategory !== 'all' && t.category_id !== ticketFilterCategory) return false;
    if (ticketSearch) {
      const q = ticketSearch.toLowerCase();
      return t.subject.toLowerCase().includes(q) || t.ticket_number?.toLowerCase().includes(q) || t.customer?.full_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'chats', label: 'Active Chats', icon: MessageSquare },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const formatResolutionTime = (ms: number) => {
    if (ms <= 0) return 'N/A';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const priorityData = analytics?.byPriority ? Object.entries(analytics.byPriority).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })) : [];
  const statusData = analytics?.byStatus ? Object.entries(analytics.byStatus).map(([name, value]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), value })) : [];
  const PIE_COLORS = ['#1a4731', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

  const unreadCount = conversations.filter(c => !c.is_read_by_admin && c.status !== 'closed').length;
  const activeConversations = conversations.filter(c => c.status === 'active' || c.status === 'waiting');
  const openTicketsList = tickets.filter(t => !['resolved', 'closed'].includes(t.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#1a4731] mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading support dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-[#1a4731]">Support</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage chats, tickets, and support analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-100">
            <div className={cn('h-2 w-2 rounded-full', stats.onlineAgents > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
            {stats.onlineAgents} agent{stats.onlineAgents !== 1 ? 's' : ''} online
          </div>
          <button
            onClick={fetchAllData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#1a4731] hover:border-[#1a4731]/30 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedConversation(null); setSelectedTicket(null); }}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-[#1a4731] text-white shadow-md shadow-forest-900/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'chats' && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount}</span>
              )}
              {tab.id === 'tickets' && openTicketsList.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{openTicketsList.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Cards (shown on dashboard + analytics) */}
      {(activeTab === 'dashboard') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Chats" value={stats.activeChats} icon={MessageSquare} color="text-emerald-600" bg="bg-emerald-50" trend="Live" />
          <StatCard label="Waiting Customers" value={stats.waitingCustomers} icon={Users} color="text-amber-600" bg="bg-amber-50" />
          <StatCard label="Online Agents" value={stats.onlineAgents} icon={UserCheck} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Open Tickets" value={stats.openTickets} icon={Ticket} color="text-purple-600" bg="bg-purple-50" />
        </div>
      )}

      {/* ============ DASHBOARD TAB ============ */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Active Conversations */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-[#1a4731]">Active Conversations</h3>
              <button
                onClick={() => setActiveTab('chats')}
                className="text-xs font-bold text-[#1a4731] hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {activeConversations.slice(0, 5).length > 0 ? activeConversations.slice(0, 5).map(conv => (
                <div
                  key={conv.id}
                  onClick={() => { selectConversation(conv); setActiveTab('chats'); }}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <AgentAvatar agent={conv.customer} />
                    {conv.status === 'active' && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{conv.customer?.full_name || 'Unknown Customer'}</h4>
                      <StatusBadge status={conv.status} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.subject || 'No subject'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(conv.last_message_at)}</p>
                  </div>
                  {conv.assigned && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                      <UserCheck className="h-3 w-3" />
                      {conv.assigned.full_name?.split(' ')[0]}
                    </div>
                  )}
                </div>
              )) : (
                <div className="p-10 text-center text-slate-400 text-sm">No active conversations.</div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Open Tickets Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-[#1a4731]">Open Tickets</h3>
                <button onClick={() => setActiveTab('tickets')} className="text-xs font-bold text-[#1a4731] hover:underline flex items-center gap-1">
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-3">
                {openTicketsList.slice(0, 4).length > 0 ? openTicketsList.slice(0, 4).map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => { selectTicket(ticket); setActiveTab('tickets'); }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn('h-2 w-2 rounded-full mt-1.5', ticket.priority === 'urgent' ? 'bg-red-500' : ticket.priority === 'high' ? 'bg-orange-500' : ticket.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{ticket.ticket_number}</span>
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-slate-400 text-sm py-4">No open tickets.</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-[#1a4731] to-emerald-900 rounded-2xl p-5 text-white shadow-lg shadow-forest-900/20">
              <h3 className="text-lg font-display font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setActiveTab('chats')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors text-left">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-semibold">View Chats</span>
                </button>
                <button onClick={() => setActiveTab('tickets')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors text-left">
                  <Ticket className="h-4 w-4" />
                  <span className="text-xs font-semibold">View Tickets</span>
                </button>
                <button onClick={() => setActiveTab('analytics')} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors text-left">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Analytics</span>
                </button>
                <button onClick={fetchAllData} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors text-left">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-xs font-semibold">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ACTIVE CHATS TAB ============ */}
      {activeTab === 'chats' && (
        <div className={cn('flex gap-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', expandedChat ? 'fixed inset-4 z-50' : 'h-[calc(100vh-240px)]')}>
          {/* Conversations List */}
          <div className={cn('w-full border-r border-slate-100 flex flex-col', selectedConversation ? 'hidden lg:flex lg:w-[380px]' : 'flex')}>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20 focus:border-[#1a4731] transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm">No conversations yet.</p>
                </div>
              ) : conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-50',
                    selectedConversation?.id === conv.id ? 'bg-[#1a4731]/5 border-l-2 border-l-[#1a4731]' : 'border-l-2 border-l-transparent',
                    !conv.is_read_by_admin ? 'bg-emerald-50/30' : ''
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <AgentAvatar agent={conv.customer} size="sm" />
                      {conv.status === 'active' && <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={cn('text-sm truncate', !conv.is_read_by_admin ? 'font-bold text-slate-900' : 'font-semibold text-slate-700')}>
                          {conv.customer?.full_name || 'Unknown'}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{conv.subject || 'No subject'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={conv.status} />
                        {conv.assigned && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {conv.assigned.full_name?.split(' ')[0]}
                          </span>
                        )}
                        {!conv.is_read_by_admin && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      {typingConversations.has(conv.id) && (
                        <p className="text-[10px] text-emerald-600 italic mt-1">typing...</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Detail */}
          {selectedConversation ? (
            <div className={cn('flex-1 flex flex-col', !selectedConversation ? 'hidden' : '')}>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConversation(null)} className="lg:hidden p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <AgentAvatar agent={selectedConversation.customer} />
                    {selectedConversation.status === 'active' && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedConversation.customer?.full_name || 'Unknown'}</h3>
                    <p className="text-[10px] text-slate-500">{selectedConversation.subject || 'No subject'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpandedChat(!expandedChat)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors hidden lg:block">
                    {expandedChat ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                  <div className="relative group">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="p-1.5">
                        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                        {['active', 'waiting', 'resolved', 'closed'].map(s => (
                          <button
                            key={s}
                            onClick={() => updateConversationStatus(selectedConversation.id, s)}
                            className={cn('w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2', selectedConversation.status === s ? 'bg-[#1a4731]/10 text-[#1a4731] font-semibold' : 'hover:bg-slate-50 text-slate-600')}
                          >
                            {s === selectedConversation.status && <Check className="h-3 w-3" />}
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 p-1.5">
                        <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assign To</p>
                        <button
                          onClick={() => assignConversation(selectedConversation.id, null)}
                          className={cn('w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors', !selectedConversation.assigned_admin_id ? 'bg-[#1a4731]/10 text-[#1a4731] font-semibold' : 'hover:bg-slate-50 text-slate-600')}
                        >
                          Unassigned
                        </button>
                        {adminProfiles.map(admin => (
                          <button
                            key={admin.id}
                            onClick={() => assignConversation(selectedConversation.id, admin.id)}
                            className={cn('w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors', selectedConversation.assigned_admin_id === admin.id ? 'bg-[#1a4731]/10 text-[#1a4731] font-semibold' : 'hover:bg-slate-50 text-slate-600')}
                          >
                            {admin.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {conversationMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No messages yet. Start the conversation.
                  </div>
                ) : conversationMessages.map(msg => (
                  <div key={msg.id} className={cn('flex gap-3', msg.sender_role === 'admin' ? 'flex-row-reverse' : '')}>
                    <AgentAvatar agent={msg.sender as Profile} size="sm" />
                    <div className={cn('max-w-[70%]', msg.sender_role === 'admin' ? 'items-end' : '')}>
                      <div className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        msg.sender_role === 'admin'
                          ? 'bg-[#1a4731] text-white rounded-tr-md'
                          : 'bg-white border border-slate-100 rounded-tl-md shadow-sm'
                      )}>
                        {msg.message_type === 'text' ? (
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        ) : msg.message_type === 'image' ? (
                          <img src={msg.file_url} alt={msg.message} className="max-w-full rounded-lg" />
                        ) : (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline hover:no-underline">
                            <File className="h-4 w-4" />
                            {msg.file_name || msg.message}
                          </a>
                        )}
                      </div>
                      <p className={cn('text-[10px] text-slate-400 mt-1', msg.sender_role === 'admin' ? 'text-right' : '')}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Tags */}
              {selectedConversation.tags && selectedConversation.tags.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 flex gap-1.5 flex-wrap">
                  {selectedConversation.tags.map((ct: any) => (
                    <span
                      key={ct.tag?.id}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: ct.tag?.color + '20', color: ct.tag?.color }}
                    >
                      {ct.tag?.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Tag selector */}
              <div className="px-4 py-2 border-t border-slate-100 flex gap-1.5 flex-wrap items-center">
                <Tag className="h-3 w-3 text-slate-400" />
                {allTags.map(tag => {
                  const hasTag = selectedConversation.tags?.some((ct: any) => ct.tag?.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleConversationTag(selectedConversation.id, tag.id, !!hasTag)}
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all',
                        hasTag ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      )}
                      style={hasTag ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>

              {/* Internal Notes */}
              <div className="border-t border-slate-100">
                <div className="p-3 bg-amber-50/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="h-3 w-3 text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Internal Notes</span>
                  </div>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2">
                    {conversationNotes.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No notes yet.</p>
                    ) : conversationNotes.map(note => (
                      <div key={note.id} className="bg-white rounded-lg p-2.5 border border-amber-100">
                        <p className="text-xs text-slate-700">{note.note}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {note.admin?.full_name} &middot; {formatTime(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatNoteInput}
                      onChange={e => setChatNoteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChatNote()}
                      placeholder="Add internal note..."
                      className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/50"
                    />
                    <button onClick={addChatNote} className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-[#1a4731] hover:bg-[#1a4731]/10 rounded-lg transition-colors"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input type="file" ref={chatFileInputRef} onChange={handleChatFileUpload} className="hidden" />
                  <input
                    type="text"
                    value={chatMessageInput}
                    onChange={e => { setChatMessageInput(e.target.value); sendTypingIndicator(selectedConversation.id); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20 focus:border-[#1a4731] transition-all"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatMessageInput.trim() || sendingMessage}
                    className="p-2.5 bg-[#1a4731] text-white rounded-xl hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <MessageSquare className="h-7 w-7 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a conversation</h3>
                <p className="text-sm max-w-xs">Choose a conversation from the list to view and reply.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ TICKETS TAB ============ */}
      {activeTab === 'tickets' && (
        <div className="flex gap-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-240px)]">
          {/* Ticket List */}
          <div className={cn('w-full border-r border-slate-100 flex flex-col', selectedTicket ? 'hidden lg:flex lg:w-[420px]' : 'flex')}>
            {/* Filters */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20 focus:border-[#1a4731] transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={ticketFilterStatus}
                  onChange={e => setTicketFilterStatus(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={ticketFilterPriority}
                  onChange={e => setTicketFilterPriority(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select
                  value={ticketFilterCategory}
                  onChange={e => setTicketFilterCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                >
                  <option value="all">All Categories</option>
                  {ticketCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Ticket className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm">No tickets found.</p>
                </div>
              ) : filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={cn(
                    'p-4 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-50',
                    selectedTicket?.id === ticket.id ? 'bg-[#1a4731]/5 border-l-2 border-l-[#1a4731]' : 'border-l-2 border-l-transparent',
                    !ticket.is_read_by_admin ? 'bg-blue-50/30' : ''
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AgentAvatar agent={ticket.customer} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={cn('text-sm truncate', !ticket.is_read_by_admin ? 'font-bold text-slate-900' : 'font-semibold text-slate-700')}>
                          {ticket.subject}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatTime(ticket.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">{ticket.ticket_number}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[10px] text-slate-500">{ticket.customer?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                        {ticket.category && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{ticket.category.name}</span>
                        )}
                        {!ticket.is_read_by_admin && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Ticket Detail */}
          {selectedTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Ticket Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 mt-1">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{selectedTicket.ticket_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={selectedTicket.status} />
                        <PriorityBadge priority={selectedTicket.priority} />
                        {selectedTicket.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: selectedTicket.category.color + '20', color: selectedTicket.category.color }}>
                            {selectedTicket.category.name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          Opened {format(new Date(selectedTicket.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <AgentAvatar agent={selectedTicket.customer} size="sm" />
                        <span className="text-xs text-slate-600 font-medium">{selectedTicket.customer?.full_name}</span>
                        <span className="text-[10px] text-slate-400">{selectedTicket.customer?.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Change */}
                    <select
                      value={selectedTicket.status}
                      onChange={e => updateTicketStatus(selectedTicket.id, e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    {/* Priority Change */}
                    <select
                      value={selectedTicket.priority}
                      onChange={e => updateTicketPriority(selectedTicket.id, e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    {/* Assign */}
                    <select
                      value={selectedTicket.assigned_admin_id || ''}
                      onChange={e => assignTicket(selectedTicket.id, e.target.value || null)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20"
                    >
                      <option value="">Unassigned</option>
                      {adminProfiles.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ticket Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Original Description */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AgentAvatar agent={selectedTicket.customer} size="sm" />
                    <span className="text-xs font-semibold text-slate-700">{selectedTicket.customer?.full_name}</span>
                    <span className="text-[10px] text-slate-400">{format(new Date(selectedTicket.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Replies */}
                {selectedTicket.replies?.filter(r => !r.is_internal_note).map(reply => (
                  <div key={reply.id} className={cn('flex gap-3', reply.sender_role === 'admin' ? 'flex-row-reverse' : '')}>
                    <AgentAvatar agent={reply.sender as Profile} size="sm" />
                    <div className={cn('rounded-xl p-3.5 max-w-[80%]', reply.sender_role === 'admin' ? 'bg-[#1a4731]/5 border border-[#1a4731]/10' : 'bg-slate-50 border border-slate-100')}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">{reply.sender?.full_name}</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(reply.created_at), 'MMM d, h:mm a')}</span>
                        {reply.sender_role === 'admin' && (
                          <span className="text-[10px] font-semibold text-[#1a4731] bg-[#1a4731]/10 px-1.5 py-0.5 rounded">Staff</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  </div>
                ))}

                {/* Internal Notes */}
                {selectedTicket.notes && selectedTicket.notes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Info className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Internal Notes</span>
                    </div>
                    {selectedTicket.notes.map(note => (
                      <div key={note.id} className="bg-amber-50 rounded-xl p-3 border border-amber-100 ml-4">
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.note}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{note.admin?.full_name} &middot; {formatTime(note.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ratings */}
                {selectedTicket.ratings && selectedTicket.ratings.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('h-4 w-4', i < selectedTicket.ratings![0].rating ? 'fill-current' : 'text-slate-300')} />
                      ))}
                    </div>
                    {selectedTicket.ratings[0].feedback && (
                      <p className="text-xs text-slate-600 mt-1">{selectedTicket.ratings[0].feedback}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Reply & Note Input */}
              <div className="border-t border-slate-100 p-4 space-y-3">
                {/* Internal Note */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ticketNoteInput}
                    onChange={e => setTicketNoteInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTicketNote()}
                    placeholder="Add internal note..."
                    className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/50"
                  />
                  <button onClick={addTicketNote} className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors">
                    Add Note
                  </button>
                </div>
                {/* Reply */}
                <div className="flex gap-2">
                  <textarea
                    value={ticketReplyInput}
                    onChange={e => setTicketReplyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTicketReply(); } }}
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20 focus:border-[#1a4731] transition-all resize-none"
                  />
                  <button
                    onClick={sendTicketReply}
                    disabled={!ticketReplyInput.trim() || sendingTicketReply}
                    className="px-4 py-2 bg-[#1a4731] text-white rounded-xl text-sm font-semibold hover:bg-[#2d6a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingTicketReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Ticket className="h-7 w-7 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a ticket</h3>
                <p className="text-sm max-w-xs">Choose a ticket from the list to view details and manage.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ ANALYTICS TAB ============ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tickets" value={analytics?.totalTickets || 0} icon={Ticket} color="text-[#1a4731]" bg="bg-[#1a4731]/10" />
            <StatCard label="Open Tickets" value={analytics?.openTickets || 0} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" />
            <StatCard label="Resolved" value={analytics?.resolvedTickets || 0} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Avg CSAT" value={analytics?.avgRating ? analytics.avgRating.toFixed(1) + '/5' : 'N/A'} icon={Star} color="text-amber-600" bg="bg-amber-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Priority */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-display font-bold text-[#1a4731] mb-4">By Priority</h3>
              {priorityData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {priorityData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available.</div>
              )}
            </div>

            {/* By Status */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-display font-bold text-[#1a4731] mb-4">By Status</h3>
              {statusData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ReTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available.</div>
              )}
            </div>

            {/* Avg Resolution Time */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-[#1a4731]">Avg Resolution Time</h3>
                </div>
              </div>
              <p className="text-4xl font-display font-bold text-slate-900 mt-4">
                {formatResolutionTime(analytics?.avgResolutionTime || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Average time to resolve support tickets</p>
            </div>

            {/* CSAT Rating */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-[#1a4731]">CSAT Rating</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <p className="text-4xl font-display font-bold text-slate-900">
                  {analytics?.avgRating ? analytics.avgRating.toFixed(1) : 'N/A'}
                </p>
                <div className="flex items-center gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-5 w-5',
                        i < Math.round(analytics?.avgRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Customer satisfaction score from ticket ratings</p>
            </div>
          </div>

          {/* Raw Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-lg font-display font-bold text-[#1a4731]">Full Breakdown</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">By Priority</h4>
                  <div className="space-y-2">
                    {priorityData.length > 0 ? priorityData.map(item => (
                      <div key={item.name} className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">{item.name}</span>
                        <span className="text-xs font-bold text-slate-900">{item.value}</span>
                      </div>
                    )) : <p className="text-xs text-slate-400">No data</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">By Status</h4>
                  <div className="space-y-2">
                    {statusData.length > 0 ? statusData.map(item => (
                      <div key={item.name} className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">{item.name}</span>
                        <span className="text-xs font-bold text-slate-900">{item.value}</span>
                      </div>
                    )) : <p className="text-xs text-slate-400">No data</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Totals</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Total Created</span>
                      <span className="text-xs font-bold text-slate-900">{analytics?.totalTickets || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Resolved</span>
                      <span className="text-xs font-bold text-slate-900">{analytics?.resolvedTickets || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Open</span>
                      <span className="text-xs font-bold text-slate-900">{analytics?.openTickets || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Avg Rating</span>
                      <span className="text-xs font-bold text-slate-900">{analytics?.avgRating ? analytics.avgRating.toFixed(2) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Resolution Rate</span>
                      <span className="text-xs font-bold text-slate-900">
                        {analytics?.totalTickets && analytics.totalTickets > 0
                          ? `${Math.round(((analytics.resolvedTickets || 0) / analytics.totalTickets) * 100)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">Avg Time</span>
                      <span className="text-xs font-bold text-slate-900">{formatResolutionTime(analytics?.avgResolutionTime || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
