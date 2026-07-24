'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, DollarSign,
  TrendingUp, User, Shield, ShieldAlert, Info, Clock, Eye, FileText,
  UserPlus, XCircle, RotateCcw, Ticket, Star, Key, LogIn, LogOut,
  Headphones, Percent, Plus, X, Tag, ChevronDown, ChevronUp, Search,
  AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, Zap,
  ExternalLink, Loader2, MessageSquare, Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Label } from '@/components/shadcn/label';
import { formatPrice } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  getCustomerFull, getAllTags, assignTag, removeTag, createTag,
  addCustomerTimelineNote, updateCustomerNotes, toggleBanCustomer
} from '@/lib/actions/customers';
import { updateTicketStatus, assignTicket } from '@/lib/actions/tickets';

const timelineIcons: Record<string, React.ElementType> = {
  account_created: UserPlus, order_placed: ShoppingBag, order_cancelled: XCircle,
  order_returned: RotateCcw, payment_received: DollarSign, refund_processed: RotateCcw,
  ticket_opened: Ticket, ticket_closed: Ticket, review_submitted: Star,
  password_changed: Key, profile_updated: User, address_added: MapPin,
  address_updated: MapPin, login: LogIn, logout: LogOut, support_contacted: Headphones,
  coupon_used: Percent, account_suspended: ShieldAlert, account_reactivated: Shield,
  note_added: FileText,
};

const timelineColors: Record<string, string> = {
  account_created: 'bg-blue-100 text-blue-600', order_placed: 'bg-green-100 text-green-600',
  order_cancelled: 'bg-red-100 text-red-600', order_returned: 'bg-orange-100 text-orange-600',
  payment_received: 'bg-emerald-100 text-emerald-600', refund_processed: 'bg-amber-100 text-amber-600',
  ticket_opened: 'bg-purple-100 text-purple-600', ticket_closed: 'bg-indigo-100 text-indigo-600',
  review_submitted: 'bg-yellow-100 text-yellow-600', password_changed: 'bg-slate-100 text-slate-600',
  profile_updated: 'bg-cyan-100 text-cyan-600', address_added: 'bg-teal-100 text-teal-600',
  address_updated: 'bg-teal-100 text-teal-600', login: 'bg-gray-100 text-gray-600',
  logout: 'bg-gray-100 text-gray-600', support_contacted: 'bg-pink-100 text-pink-600',
  coupon_used: 'bg-rose-100 text-rose-600', account_suspended: 'bg-red-100 text-red-700',
  account_reactivated: 'bg-green-100 text-green-700', note_added: 'bg-slate-100 text-slate-700',
};

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === 'delivered') return <Badge className="bg-[#E6F0EB] text-[#1B4332] border-[#CDE0D6] hover:bg-[#E6F0EB] font-bold capitalize">Delivered</Badge>;
  if (s === 'shipped') return <Badge className="bg-[#EAF2FF] text-[#0A58CA] border-[#CFE2FF] hover:bg-[#EAF2FF] font-bold capitalize">Shipped</Badge>;
  if (s === 'processing') return <Badge className="bg-[#FFF3CD] text-[#664D03] border-[#FFE69C] hover:bg-[#FFF3CD] font-bold capitalize">Processing</Badge>;
  if (s === 'pending') return <Badge className="bg-[#F8F9FA] text-[#212529] border-[#DEE2E6] hover:bg-[#F8F9FA] font-bold capitalize">Pending</Badge>;
  if (s.includes('pending')) return <Badge className="bg-[#FFF3CD] text-[#664D03] border-[#FFE69C] hover:bg-[#FFF3CD] font-bold capitalize">{status.replace('_', ' ')}</Badge>;
  if (s === 'cancelled') return <Badge className="bg-[#F8D7DA] text-[#842029] border-[#F5C2C7] hover:bg-[#F8D7DA] font-bold capitalize">Cancelled</Badge>;
  if (s === 'returned') return <Badge className="bg-[#E2D9F3] text-[#4A1D96] border-[#D1C2EB] hover:bg-[#E2D9F3] font-bold capitalize">Returned</Badge>;
  if (s === 'refunded') return <Badge className="bg-[#E2D9F3] text-[#4A1D96] border-[#D1C2EB] hover:bg-[#E2D9F3] font-bold capitalize">Refunded</Badge>;
  return <Badge className="capitalize font-bold">{status}</Badge>;
}

function getPaymentBadge(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'paid') return <Badge className="bg-[#E6F0EB] text-[#1B4332] hover:bg-[#E6F0EB] font-semibold border-none">Paid</Badge>;
  if (s === 'pending') return <Badge className="bg-[#FFF3CD] text-[#664D03] hover:bg-[#FFF3CD] font-semibold border-none">Pending</Badge>;
  if (s === 'failed') return <Badge className="bg-[#F8D7DA] text-[#842029] hover:bg-[#F8D7DA] font-semibold border-none">Failed</Badge>;
  if (s === 'refunded') return <Badge className="bg-[#E2D9F3] text-[#4A1D96] hover:bg-[#E2D9F3] font-semibold border-none">Refunded</Badge>;
  return <Badge className="font-semibold border-none">{status || 'Pending'}</Badge>;
}

function getTicketPriorityIcon(priority: string) {
  const p = priority?.toLowerCase() || '';
  if (p === 'urgent') return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  if (p === 'high') return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
  if (p === 'medium') return <HelpCircle className="h-3.5 w-3.5 text-yellow-500" />;
  return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
}

function getTicketStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'open') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (s === 'in_progress') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (s === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'closed') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-700';
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1a4731');
  const [creatingTag, setCreatingTag] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getCustomerFull(id);
    if (result) {
      setData(result);
      setAdminNotes(result.profile.notes || '');
    } else {
      toast.error('Customer not found');
    }
    const tags = await getAllTags();
    setAllTags(tags);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#2D6A4F] mx-auto" />
          <p className="text-slate-500 text-sm">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href="/admin/customers">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Customer Not Found</h2>
          <p className="text-slate-500">The customer you are looking for does not exist or has been removed.</p>
        </Card>
      </div>
    );
  }

  const { profile, addresses, tags, orders, tickets, timeline, invoices, notifications } = data;

  const allOrders = [...orders, ...(data.orderRequests || [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const nonCancelled = allOrders.filter((o: any) => !['cancelled', 'rejected'].includes(o.status));
  const totalSpent = nonCancelled.reduce((sum: number, o: any) => sum + Number(o.total || o.total_price || o.final_total_price || 0), 0);
  const avgOrderValue = nonCancelled.length > 0 ? totalSpent / nonCancelled.length : 0;

  const assignedTagIds = new Set(tags.map((t: any) => t.tag_id));

  const handleAssignTag = async (tagId: string) => {
    toast.loading('Assigning tag...');
    const res = await assignTag(id, tagId);
    toast.dismiss();
    if (res.error) toast.error(res.error);
    else { toast.success('Tag assigned'); fetchData(); }
  };

  const handleRemoveTag = async (tagId: string) => {
    toast.loading('Removing tag...');
    const res = await removeTag(id, tagId);
    toast.dismiss();
    if (res.error) toast.error(res.error);
    else { toast.success('Tag removed'); fetchData(); }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    toast.loading('Creating tag...');
    const res = await createTag(newTagName.trim(), newTagColor);
    toast.dismiss();
    if (res.error) toast.error(res.error);
    else {
      toast.success('Tag created');
      setAllTags(prev => [...prev, res.tag]);
      setNewTagName('');
      setShowNewTagInput(false);
    }
    setCreatingTag(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await addCustomerTimelineNote(id, noteText.trim());
    if (res.error) toast.error(res.error);
    else {
      toast.success('Note added');
      setNoteText('');
      fetchData();
    }
    setAddingNote(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await updateCustomerNotes(id, adminNotes);
    if (res.error) toast.error(res.error);
    else toast.success('Notes updated');
    setSavingNotes(false);
  };

  const handleBanToggle = async () => {
    const confirmMsg = profile.is_banned
      ? 'Reactivate this customer account?'
      : 'Ban/suspend this customer account? This will prevent them from accessing the platform.';
    if (!confirm(confirmMsg)) return;
    const res = await toggleBanCustomer(id, !profile.is_banned);
    if (res.error) toast.error(res.error);
    else {
      toast.success(profile.is_banned ? 'Account reactivated' : 'Account suspended');
      fetchData();
    }
  };

  const handleTicketStatusChange = async (ticketId: string, status: string) => {
    toast.loading('Updating ticket...');
    const res = await updateTicketStatus(ticketId, status);
    toast.dismiss();
    if (res.error) toast.error(res.error);
    else { toast.success('Ticket updated'); fetchData(); }
  };

  const handleTicketAssign = async (ticketId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    toast.loading('Assigning ticket...');
    const res = await assignTicket(ticketId, user.id);
    toast.dismiss();
    if (res.error) toast.error(res.error);
    else { toast.success('Ticket assigned to you'); fetchData(); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/customers">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Details</h1>
          <p className="text-sm text-slate-500">View customer profile, activity, orders, and manage settings.</p>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6 flex-wrap md:flex-nowrap">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-[#E6F0EB] text-[#1B4332] flex items-center justify-center font-bold text-2xl md:text-3xl shadow-inner border border-slate-50 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || 'Unnamed User'}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F0EB] text-[#1B4332] text-xs font-bold capitalize">
                    <Shield className="h-3 w-3" /> {profile.role}
                  </span>
                  {profile.is_banned || profile.is_blocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F8D7DA] text-[#842029] text-xs font-bold">
                      <ShieldAlert className="h-3 w-3" /> Banned / Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                      Active Account
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile.email}
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {tags.map((t: any) => (
                      <span
                        key={t.tag_id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: t.tag?.color + '20', color: t.tag?.color, borderColor: t.tag?.color + '40', borderWidth: 1 }}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {t.tag?.name || 'Unknown'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBanToggle}
                className={`text-xs font-bold h-9 px-4 rounded-xl ${profile.is_banned ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
              >
                {profile.is_banned ? 'Reactivate' : 'Suspend'}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <ShoppingBag className="h-4 w-4 text-[#2D6A4F]" /> Total Orders
              </div>
              <p className="text-xl font-bold text-slate-900">{allOrders.length}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <DollarSign className="h-4 w-4 text-[#2D6A4F]" /> Lifetime Spend
              </div>
              <p className="text-xl font-bold text-[#1B4332]">{formatPrice(totalSpent)}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <TrendingUp className="h-4 w-4 text-[#2D6A4F]" /> Avg. Order Value
              </div>
              <p className="text-xl font-bold text-slate-900">{formatPrice(avgOrderValue)}</p>
            </div>
            <div className="space-y-1 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Calendar className="h-4 w-4 text-[#2D6A4F]" /> Customer Since
              </div>
              <p className="text-base font-bold text-slate-900">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap gap-1 bg-transparent p-0 border-b border-slate-200 rounded-none h-auto">
          {[
            { value: 'overview', label: 'Overview', icon: User },
            { value: 'orders', label: `Orders (${allOrders.length})`, icon: ShoppingBag },
            { value: 'timeline', label: `Timeline (${timeline.length})`, icon: Clock },
            { value: 'tickets', label: `Tickets (${tickets.length})`, icon: Ticket },
            { value: 'invoices', label: `Invoices (${invoices.length})`, icon: DollarSign },
            { value: 'tags', label: 'Tags', icon: Tag },
            { value: 'notes', label: 'Notes', icon: FileText },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-500 data-[state=active]:text-[#1B4332] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#1B4332] rounded-none bg-transparent data-[state=active]:bg-transparent hover:text-slate-700 transition-colors"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-[#2D6A4F]" /> Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
                    <p className="text-sm font-medium text-slate-900">{profile.full_name || 'Not provided'}</p>
                  </div>
                  {(profile.first_name || profile.last_name) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">First Name</span>
                        <p className="text-sm font-medium text-slate-900">{profile.first_name || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Name</span>
                        <p className="text-sm font-medium text-slate-900">{profile.last_name || '—'}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                    <p className="text-sm font-medium text-slate-900">{profile.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {profile.phone || 'Not provided'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account ID</span>
                    <p className="text-sm font-mono text-slate-500">{profile.id}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#2D6A4F]" /> Addresses
                  </CardTitle>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-bold border-none">{addresses.length} Saved</Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
                  {addresses.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      No addresses saved.
                    </div>
                  ) : (
                    addresses.map((addr: any) => (
                      <div key={addr.id} className="p-4 rounded-xl border border-slate-100 hover:border-[#CDE0D6] hover:bg-slate-50/50 transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-900">{addr.label || addr.full_name || addr.name || 'Address'}</p>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 bg-[#E6F0EB] text-[#1B4332] rounded text-[10px] font-bold border border-[#CDE0D6]">Default</span>
                          )}
                        </div>
                        {addr.phone && <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> {addr.phone}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {addr.address_line || addr.address}{addr.city ? `, ${addr.city}` : ''}{addr.district ? `, ${addr.district}` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#2D6A4F]" /> Recent Activity
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-[#2D6A4F]" onClick={() => setActiveTab('timeline')}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-0 max-h-[420px] overflow-y-auto">
                  {timeline.slice(0, 10).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No activity recorded yet.</div>
                  ) : (
                    timeline.slice(0, 10).map((event: any) => {
                      const Icon = timelineIcons[event.event_type] || Clock;
                      const colorClass = timelineColors[event.event_type] || 'bg-slate-100 text-slate-500';
                      return (
                        <div key={event.id} className="flex gap-4 pb-6 last:pb-0 relative">
                          <div className="flex flex-col items-center">
                            <div className={`h-8 w-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="w-px flex-1 bg-slate-200 mt-2" />
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="text-sm font-medium text-slate-900 capitalize">{event.event_type.replace(/_/g, ' ')}</p>
                            {event.description && <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>}
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              {new Date(event.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-[#2D6A4F]" /> Recent Orders
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-[#2D6A4F]" onClick={() => setActiveTab('orders')}>
                    View All ({allOrders.length})
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {allOrders.slice(0, 5).length === 0 ? (
                    <div className="text-center py-12 text-slate-400"><ShoppingBag className="h-12 w-12 text-slate-100 mx-auto mb-2" /><p className="text-sm">No orders yet.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4">Order</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allOrders.slice(0, 5).map((order: any) => {
                            const orderNum = `#${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;
                            const amount = Number(order.total || order.total_price || order.final_total_price || 0);
                            const viewHref = order.is_request ? `/admin/order-requests` : `/admin/orders/${order.id}`;
                            return (
                              <tr key={`${order.is_request ? 'req' : 'ord'}-${order.id}`} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <span className="font-mono text-xs font-bold text-slate-900">{orderNum}</span>
                                  {order.is_request && <div className="text-[10px] text-amber-600 font-bold">Request</div>}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatPrice(amount)}</td>
                                <td className="px-6 py-4">{getStatusBadge(order.status || 'pending')}</td>
                                <td className="px-6 py-4 text-right">
                                  <Link href={viewHref}>
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold">
                                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#2D6A4F]" /> Order History
              </CardTitle>
              <Badge className="bg-slate-100 text-slate-700 font-bold border-none">{allOrders.length} Total</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {allOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingBag className="h-16 w-16 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No orders yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">Order</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Payment</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allOrders.map((order: any) => {
                        const orderNum = `#${String(order.order_number || order.id).slice(0, 8).toUpperCase()}`;
                        const amount = Number(order.total || order.total_price || order.final_total_price || 0);
                        const viewHref = order.is_request ? `/admin/order-requests` : `/admin/orders/${order.id}`;
                        return (
                          <tr key={`${order.is_request ? 'req' : 'ord'}-${order.id}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-bold text-slate-900">{orderNum}</span>
                              {order.is_request && <div className="text-[10px] text-amber-600 font-bold uppercase">Order Request</div>}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatPrice(amount)}</td>
                            <td className="px-6 py-4">{getStatusBadge(order.status || 'pending')}</td>
                            <td className="px-6 py-4 space-y-0.5">
                              {getPaymentBadge(order.payment_status || 'pending')}
                              {order.payment_method && <div className="text-[10px] text-slate-400 uppercase font-bold">{order.payment_method}</div>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link href={viewHref}>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold hover:bg-[#E6F0EB] hover:text-[#1B4332] transition-all">
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-6">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#2D6A4F]" /> Activity Timeline
              </CardTitle>
              <CardDescription className="text-slate-500 text-sm">All recorded events for this customer</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {timeline.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="h-12 w-12 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-medium">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 space-y-0">
                  {timeline.map((event: any) => {
                    const Icon = timelineIcons[event.event_type] || Clock;
                    const colorClass = timelineColors[event.event_type] || 'bg-slate-100 text-slate-500';
                    return (
                      <div key={event.id} className="flex gap-4 pb-8 last:pb-0 relative">
                        <div className="flex flex-col items-center">
                          <div className={`h-10 w-10 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="w-0.5 flex-1 bg-slate-200 mt-2" />
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 capitalize">{event.event_type.replace(/_/g, ' ')}</p>
                            <span className="text-[10px] text-slate-400 font-medium">{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                          {event.description && <p className="text-sm text-slate-600 mt-1">{event.description}</p>}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <pre className="text-[10px] text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg overflow-x-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          )}
                          {event.created_by && (
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">by: {event.created_by.slice(0, 8)}...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-6">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[#2D6A4F]" /> Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Ticket className="h-16 w-16 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No support tickets.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{ticket.ticket_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTicketStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                              {getTicketPriorityIcon(ticket.priority)} {ticket.priority}
                            </span>
                            {ticket.category && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                                {ticket.category.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-900 truncate">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ticket.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                            {ticket.assigned ? (
                              <span>Assigned to: {ticket.assigned.full_name || ticket.assigned.email}</span>
                            ) : (
                              <span className="text-amber-500">Unassigned</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 flex-shrink-0">
                          <Link href={`/admin/support/tickets/${ticket.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg">
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleTicketStatusChange(ticket.id, e.target.value)}
                          className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 outline-none focus:border-[#2D6A4F]"
                        >
                          <option value="open">Open</option>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                        {!ticket.assigned_admin_id && (
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-[#2D6A4F]" onClick={() => handleTicketAssign(ticket.id)}>
                            Assign to me
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#2D6A4F]" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <DollarSign className="h-16 w-16 text-slate-100 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No invoices generated.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">Invoice #</th>
                        <th className="px-6 py-4">Order</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4">Created</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">{inv.invoice_number}</td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-mono">{inv.order?.order_number || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <Badge className={`font-bold capitalize ${
                              inv.status === 'paid' ? 'bg-[#E6F0EB] text-[#1B4332]' :
                              inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                              inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              inv.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {inv.invoice_url && (
                              <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg">
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                                </Button>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#2D6A4F]" /> Current Tags
                </CardTitle>
                <Badge className="bg-slate-100 text-slate-700 font-bold border-none">{tags.length} Assigned</Badge>
              </CardHeader>
              <CardContent className="p-6">
                {tags.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <Tag className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p>No tags assigned yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t: any) => (
                      <span
                        key={t.tag_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold group"
                        style={{ backgroundColor: t.tag?.color + '15', color: t.tag?.color, border: `1px solid ${t.tag?.color || '#1a4731'}30` }}
                      >
                        <Tag className="h-3 w-3" />
                        {t.tag?.name || 'Unknown'}
                        <button onClick={() => handleRemoveTag(t.tag_id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#2D6A4F]" /> Available Tags
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[#2D6A4F]" onClick={() => setShowNewTagInput(!showNewTagInput)}>
                  {showNewTagInput ? 'Cancel' : 'New Tag'}
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {showNewTagInput && (
                  <div className="flex items-end gap-3 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tag Name</Label>
                      <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="e.g. VIP, Wholesale..." className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="h-9 w-10 rounded-lg border border-slate-200 cursor-pointer" />
                        <Button size="sm" onClick={handleCreateTag} disabled={creatingTag || !newTagName.trim()} className="h-9 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs">
                          {creatingTag ? '...' : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {allTags.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No tags created yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag: any) => {
                      const isAssigned = assignedTagIds.has(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => isAssigned ? handleRemoveTag(tag.id) : handleAssignTag(tag.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            isAssigned
                              ? 'opacity-50 cursor-not-allowed line-through'
                              : 'hover:scale-105 cursor-pointer'
                          }`}
                          style={{ backgroundColor: tag.color + '15', color: tag.color, border: `1px solid ${tag.color}30` }}
                          disabled={isAssigned}
                        >
                          <Tag className="h-3 w-3" />
                          {tag.name}
                          {!isAssigned && <Plus className="h-3 w-3 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#2D6A4F]" /> Internal Admin Notes
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm">Private notes visible only to admins (stored on profile)</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Enter internal notes about this customer..."
                  className="min-h-[200px] text-sm border-slate-200"
                />
                <Button onClick={handleSaveNotes} disabled={savingNotes} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold">
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#2D6A4F]" /> Timeline Notes
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm">Add timestamped notes to the activity timeline</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Enter a note to add to the customer's timeline..."
                  className="min-h-[120px] text-sm border-slate-200"
                />
                <Button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold">
                  {addingNote ? 'Adding...' : 'Add Note to Timeline'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Timeline notes only */}
          {timeline.filter(e => e.event_type === 'note_added').length > 0 && (
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden mt-6">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#2D6A4F]" /> Recent Timeline Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 max-h-[400px] overflow-y-auto">
                {timeline.filter(e => e.event_type === 'note_added').map((event: any) => (
                  <div key={event.id} className="flex gap-3 pb-4 last:pb-0 border-b border-slate-50 last:border-0 mb-4 last:mb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">{event.description}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {new Date(event.created_at).toLocaleString()}
                        {event.metadata?.admin_name && ` — by ${event.metadata.admin_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
