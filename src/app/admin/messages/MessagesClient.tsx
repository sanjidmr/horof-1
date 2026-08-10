'use client';

import { useState } from 'react';
import { MailOpen, Mail, Trash2, Search, Calendar, ChevronDown, CheckCircle2, MoreVertical, X, Paperclip, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { deleteMessage, toggleMessageReadStatus } from '@/lib/actions/messages';

type ContactAttachment = {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments?: ContactAttachment[] | string | null;
  is_read: boolean;
  created_at: string;
};

export function MessagesClient({ initialMessages }: { initialMessages: ContactMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(search.toLowerCase()) || 
      msg.email.toLowerCase().includes(search.toLowerCase()) ||
      msg.subject.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || (filter === 'unread' && !msg.is_read) || (filter === 'read' && msg.is_read);
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    const res = await deleteMessage(id);
    if (res.success) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      toast.success('Message deleted');
    } else {
      toast.error(res.error || 'Failed to delete message');
    }
  };

  const handleToggleRead = async (id: string, currentStatus: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const res = await toggleMessageReadStatus(id, currentStatus);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: !currentStatus } : m))
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: !currentStatus });
      }
      toast.success(currentStatus ? 'Marked as unread' : 'Marked as read');
    } else {
      toast.error(res.error || 'Failed to update status');
    }
  };

  const handleViewMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.is_read) {
      handleToggleRead(msg.id, false);
    }
  };

  // Normalize the attachments field which may arrive as a JSON string
  // (legacy rows) or as a parsed array.
  const getAttachments = (msg: ContactMessage): ContactAttachment[] => {
    if (!msg.attachments) return [];
    if (Array.isArray(msg.attachments)) return msg.attachments as ContactAttachment[];
    try {
      const parsed = JSON.parse(msg.attachments);
      return Array.isArray(parsed) ? (parsed as ContactAttachment[]) : [];
    } catch {
      return [];
    }
  };

  const isImage = (mimeType?: string, name?: string) => {
    if (mimeType?.startsWith('image/')) return true;
    const ext = name?.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Messages List */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 space-y-4 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731]/20 focus:border-[#1a4731] transition-all"
            />
          </div>
          
          <div className="flex bg-slate-100/50 p-1 rounded-xl">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-[#1a4731] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MailOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm">No messages found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleViewMessage(msg)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                    selectedMessage?.id === msg.id ? 'bg-[#1a4731]/5 border-l-2 border-l-[#1a4731]' : 'border-l-2 border-l-transparent'
                  } ${!msg.is_read ? 'bg-white' : 'opacity-70 bg-slate-50/30'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold text-sm truncate pr-4 ${!msg.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {msg.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {format(new Date(msg.created_at), 'MMM d, p')}
                    </span>
                  </div>
                  <p className={`text-xs truncate mb-2 ${!msg.is_read ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                    {msg.subject}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2">
                      {!msg.is_read && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Details */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full">
        {selectedMessage ? (
          <>
            <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{selectedMessage.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{selectedMessage.name}</span>
                  <span className="text-slate-300">&bull;</span>
                  <a href={`mailto:${selectedMessage.email}`} className="text-blue-600 hover:underline">
                    {selectedMessage.email}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(selectedMessage.created_at), 'MMMM d, yyyy \at h:mm a')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.is_read)}
                  title={selectedMessage.is_read ? "Mark as unread" : "Mark as read"}
                  className="p-2 text-slate-400 hover:text-[#1a4731] hover:bg-[#1a4731]/10 rounded-lg transition-colors"
                >
                  {selectedMessage.is_read ? <Mail className="h-5 w-5" /> : <MailOpen className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => handleDelete(selectedMessage.id)}
                  title="Delete message"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-medium">
                {selectedMessage.message}
              </div>

              {/* Attachments */}
              {(() => {
                const attachments = getAttachments(selectedMessage);
                if (attachments.length === 0) return null;
                return (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Attachment{attachments.length > 1 ? 's' : ''}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {attachments.map((att, idx) => {
                        const img = isImage(att.mimeType, att.name);
                        return (
                          <div
                            key={`${att.url}-${idx}`}
                            className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2"
                          >
                            {img ? (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAiIHk9IjUwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSJtaWRkbGUiPlBvc2l0aW9uIGZhaWxlZDwvdGV4dD48L3N2Zz4=';
                                  }}
                                />
                              </a>
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                                <Paperclip className="h-8 w-8 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate" title={att.name}>
                                {att.name}
                              </p>
                              {att.size ? (
                                <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                              ) : null}
                            </div>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.name}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1a4731] hover:text-accent-primary hover:bg-accent-primary/10 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                            >
                              {img ? 'Preview' : 'Open'}
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-[#1a4731] text-white rounded-xl text-sm font-semibold hover:bg-forest-800 transition-colors shadow-sm shadow-forest-900/20"
              >
                Reply via Email
              </a>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Mail className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a message</h3>
            <p className="text-sm text-center max-w-sm">
              Choose a message from the list on the left to read its full content and reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
