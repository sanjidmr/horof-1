'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Smile,
  ChevronDown,
  Check,
  CheckCheck,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  ImageIcon,
  FileText,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ScrollArea } from '@/components/shadcn/scroll-area';

import {
  createConversation,
  sendMessage,
  getConversations,
  getConversationMessages,
  uploadChatFile,
  getOnlineAgents,
} from '@/lib/actions/chat';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'admin' | 'customer';
  message: string;
  message_type: 'text' | 'image' | 'file';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_read: boolean;
  created_at: string;
};

type Conversation = {
  id: string;
  customer_id: string;
  subject: string | null;
  status: string;
  created_at: string;
  last_message_at: string;
};

const EMOJIS = [
  '😊', '😂', '❤️', '👍', '😍', '🙏', '😢', '😡',
  '🔥', '💯', '🎉', '💪', '🤔', '😎', '🥺', '👋',
  '✨', '🌟', '💀', '😭', '😴', '🥰', '😘', '🤗',
  '😇', '🙌', '🤞', '✌️', '🫶', '💖', '💔', '😅',
  '😩', '🤷', '💀', '👀', '🍀', '🎂', '🚀', '✅',
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return formatTime(dateStr);
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (isToday) return `Today at ${formatTime(dateStr)}`;
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileText;
  if (mimeType.startsWith('image/')) return ImageIcon;
  return FileText;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChatWidget = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineAgents, setOnlineAgents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [fileAttachment, setFileAttachment] = useState<{ file: File; preview: string } | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [initialMessage, setInitialMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isAdminPath = pathname?.startsWith('/admin');
  const isDashboardPath = pathname?.startsWith('/dashboard') || pathname?.startsWith('/customer');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowEmojiPicker(false);
      setFileAttachment(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkOnlineStatus = useCallback(async () => {
    try {
      const agents = await getOnlineAgents();
      setOnlineAgents(agents.length);
      setIsOnline(agents.length > 0);
    } catch {
      setIsOnline(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getConversations('customer', user.id);
      setConversations(data as unknown as Conversation[]);
      const active = (data as unknown as Conversation[]).find(
        (c) => c.status === 'active' || c.status === 'waiting'
      );
      if (active) {
        setActiveConversationId(active.id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await getConversationMessages(conversationId);
      setMessages(data as unknown as Message[]);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user || isAdminPath || isDashboardPath) return;
    fetchConversations();
    checkOnlineStatus();
  }, [isAuthenticated, user, isAdminPath, isDashboardPath, fetchConversations, checkOnlineStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(checkOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, [isOpen, checkOnlineStatus]);

  useEffect(() => {
    if (!supabase || !isOpen) return;

    const channel = supabase
      .channel('chat-widget-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const agents = Object.values(state).flat() as any[];
        setIsOnline(agents.length > 0);
        setOnlineAgents(agents.length);
      })
      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isOpen]);

  useEffect(() => {
    if (!supabase || !activeConversationId || !isOpen) return;

    const channel = supabase
      .channel(`chat-messages-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeConversationId, isOpen]);

  useEffect(() => {
    if (!supabase || !isOpen) return;

    const channel = supabase
      .channel('chat-support-online')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_agents',
        },
        () => {
          checkOnlineStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isOpen, checkOnlineStatus]);

  const handleStartNewConversation = async () => {
    if (!user) return;
    try {
      const result = await createConversation(user.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setActiveConversationId(result.id!);
      setView('chat');
      setMessages([]);
      setConversations((prev) => [
        {
          id: result.id!,
          customer_id: user.id,
          subject: null,
          status: 'active',
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setView('chat');
    fetchMessages(id);
  };

  const handleSend = async () => {
    const text = initialMessage || newMessage;
    if (!text.trim() && !fileAttachment) return;
    if (!activeConversationId || !user) return;

    setIsSending(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let mimeType: string | undefined;
      let messageType: 'text' | 'image' | 'file' = 'text';

      if (fileAttachment) {
        const formData = new FormData();
        formData.append('file', fileAttachment.file);
        const uploadResult = await uploadChatFile(formData);
        if (uploadResult.error) {
          toast.error(uploadResult.error);
          setIsSending(false);
          return;
        }
        fileUrl = uploadResult.url!;
        fileName = uploadResult.name;
        fileSize = uploadResult.size;
        mimeType = uploadResult.type;
        messageType = mimeType?.startsWith('image/') ? 'image' : 'file';
      }

      const result = await sendMessage(
        activeConversationId,
        text.trim() || (fileName || 'File'),
        messageType,
        fileUrl,
        fileName,
        fileSize,
        mimeType
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const optimisticMsg: Message = {
        id: result.id!,
        conversation_id: activeConversationId,
        sender_id: user.id,
        sender_role: 'customer',
        message: text.trim() || (fileName || 'File'),
        message_type: messageType,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        mime_type: mimeType || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setNewMessage('');
      setInitialMessage('');
      setFileAttachment(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileAttachment({ file, preview: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setFileAttachment({ file, preview: '' });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    if (view === 'list') {
      setInitialMessage((prev) => prev + emoji);
    } else {
      setNewMessage((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleBack = () => {
    setView('list');
    setActiveConversationId(null);
    setMessages([]);
  };

  const unreadCount = 0;

  if (!isAuthenticated || !user || authLoading) return null;
  if (isAdminPath || isDashboardPath) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 flex flex-col bg-white shadow-2xl overflow-hidden',
              'sm:bottom-24 sm:right-6 sm:w-96 sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl sm:border sm:border-border-forest',
              'bottom-0 right-0 left-0 top-0 sm:top-auto sm:left-auto rounded-none sm:rounded-2xl'
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-accent-primary text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {view === 'chat' && (
                  <button onClick={handleBack} className="sm:hidden p-1 -ml-1 hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronDown className="w-5 h-5 rotate-90" />
                  </button>
                )}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-accent-primary rounded-full',
                      isOnline ? 'bg-success' : 'bg-text-muted'
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">Customer Support</p>
                  <p className="text-xs text-white/70 truncate">
                    {isOnline
                      ? onlineAgents > 0
                        ? `Online (${onlineAgents})`
                        : 'Online'
                      : 'Offline'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isConnected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Connection lost. Reconnecting...</span>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              {view === 'list' ? (
                <ChatConversationList
                  conversations={conversations}
                  isLoadingConversations={isLoading}
                  onSelect={handleSelectConversation}
                  onStartNew={handleStartNewConversation}
                  user={user}
                  initialMessage={initialMessage}
                  onInitialMessageChange={setInitialMessage}
                  onSendInitial={handleStartNewConversation}
                  isSending={isSending}
                  handleEmojiSelect={handleEmojiSelect}
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                  emojiPickerRef={emojiPickerRef}
                  inputRef={inputRef}
                />
              ) : (
                <ChatMessagesView
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  user={user}
                  newMessage={newMessage}
                  onNewMessageChange={setNewMessage}
                  onSend={handleSend}
                  onKeyDown={handleKeyDown}
                  isSending={isSending}
                  fileAttachment={fileAttachment}
                  onFileSelect={handleFileSelect}
                  onRemoveFile={() => setFileAttachment(null)}
                  fileInputRef={fileInputRef}
                  handleEmojiSelect={handleEmojiSelect}
                  showEmojiPicker={showEmojiPicker}
                  setShowEmojiPicker={setShowEmojiPicker}
                  emojiPickerRef={emojiPickerRef}
                  inputRef={inputRef}
                  messagesEndRef={messagesEndRef}
                  isOnline={isOnline}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40 bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-shadow',
          isOnline
            ? 'bg-accent-primary hover:shadow-accent-primary/30'
            : 'bg-text-muted hover:shadow-text-muted/30',
          'shadow-lg hover:shadow-xl'
        )}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        <span
          className={cn(
            'absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full',
            isOnline ? 'bg-success' : 'bg-text-muted'
          )}
        />
      </motion.button>
    </>
  );
};

function ChatConversationList({
  conversations,
  isLoadingConversations,
  onSelect,
  onStartNew,
  user,
  initialMessage,
  onInitialMessageChange,
  onSendInitial,
  isSending,
  handleEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  inputRef,
}: {
  conversations: Conversation[];
  isLoadingConversations: boolean;
  onSelect: (id: string) => void;
  onStartNew: () => void;
  user: any;
  initialMessage: string;
  onInitialMessageChange: (v: string) => void;
  onSendInitial: () => void;
  isSending: boolean;
  handleEmojiSelect: (emoji: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const hasExisting = conversations.length > 0 && conversations.some((c) => c.status === 'active' || c.status === 'waiting');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!hasExisting && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-accent-primary/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-accent-primary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Need help?</h3>
              <p className="text-sm text-text-muted mb-4">
                Send us a message and we'll get back to you as soon as possible.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={initialMessage}
                    onChange={(e) => onInitialMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (initialMessage.trim()) onSendInitial();
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full h-11 rounded-xl border border-border-forest bg-bg-secondary px-4 pr-20 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onSendInitial}
                      disabled={!initialMessage.trim() || isSending}
                      className="p-2 text-white bg-accent-primary hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {showEmojiPicker && (
                  <EmojiPicker
                    emojiPickerRef={emojiPickerRef}
                    onSelect={handleEmojiSelect}
                  />
                )}
              </div>
            </div>
          )}

          {isLoadingConversations ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-2 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasExisting ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Your Conversations</h3>
                <button
                  onClick={onStartNew}
                  className="text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors"
                >
                  + New chat
                </button>
              </div>
              {conversations
                .filter((c) => c.status === 'active' || c.status === 'waiting')
                .map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-bg-secondary transition-colors border border-border-forest/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-accent-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {conv.subject || 'Support Conversation'}
                        </p>
                        <p className="text-xs text-text-muted truncate mt-0.5">
                          {conv.last_message_at
                            ? formatDate(conv.last_message_at)
                            : 'Just now'}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 -rotate-90 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </button>
                ))}
              {conversations.filter((c) => c.status === 'resolved' || c.status === 'closed').length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text-primary pt-2">Past Conversations</h3>
                  {conversations
                    .filter((c) => c.status === 'resolved' || c.status === 'closed')
                    .map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => onSelect(conv.id)}
                        className="w-full text-left p-3 rounded-xl hover:bg-bg-secondary transition-colors border border-border-forest/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-5 h-5 text-text-muted" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {conv.subject || 'Support Conversation'}
                            </p>
                            <p className="text-xs text-text-muted truncate mt-0.5">{formatDate(conv.created_at)}</p>
                          </div>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </button>
                    ))}
                </>
              )}
            </>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatMessagesView({
  messages,
  isLoadingMessages,
  user,
  newMessage,
  onNewMessageChange,
  onSend,
  onKeyDown,
  isSending,
  fileAttachment,
  onFileSelect,
  onRemoveFile,
  fileInputRef,
  handleEmojiSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  inputRef,
  messagesEndRef,
  isOnline,
}: {
  messages: Message[];
  isLoadingMessages: boolean;
  user: any;
  newMessage: string;
  onNewMessageChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isSending: boolean;
  fileAttachment: { file: File; preview: string } | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleEmojiSelect: (emoji: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isOnline: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isLoadingMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center mb-3">
            <MessageCircle className="w-6 h-6 text-accent-primary" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">No messages yet</p>
          <p className="text-xs text-text-muted">
            Send a message to start the conversation.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-4 py-3 space-y-3">
            {messages.map((msg, idx) => {
              const isCustomer = msg.sender_role === 'customer';
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showDateSeparator =
                !prevMsg ||
                new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-border-forest" />
                      <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider shrink-0">
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-border-forest" />
                    </div>
                  )}
                  <div className={cn('flex', isCustomer ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] space-y-1', isCustomer ? 'items-end' : 'items-start')}>
                      {msg.message_type === 'image' && msg.file_url && (
                        <div className="rounded-xl overflow-hidden border border-border-forest">
                          <Image
                            src={msg.file_url}
                            alt={msg.file_name || 'Image'}
                            width={240}
                            height={180}
                            className="object-cover w-full h-auto max-h-48"
                          />
                        </div>
                      )}
                      {msg.message_type === 'file' && msg.file_url && (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors',
                            isCustomer
                              ? 'bg-accent-primary text-white hover:bg-accent-hover'
                              : 'bg-bg-secondary text-text-primary hover:bg-border-forest'
                          )}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[150px]">{msg.file_name || 'File'}</span>
                          {msg.file_size && (
                            <span className="opacity-70 shrink-0">({formatFileSize(msg.file_size)})</span>
                          )}
                        </a>
                      )}
                      {(msg.message_type === 'text' || (msg.message_type === 'image' && msg.message)) && (
                        <div
                          className={cn(
                            'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                            isCustomer
                              ? 'bg-accent-primary text-white rounded-br-md'
                              : 'bg-bg-secondary text-text-primary rounded-bl-md'
                          )}
                        >
                          {msg.message}
                        </div>
                      )}
                      <div className={cn('flex items-center gap-1.5 px-1', isCustomer ? 'justify-end' : 'justify-start')}>
                        <span className="text-[10px] text-text-muted">{formatTime(msg.created_at)}</span>
                        {isCustomer && (
                          msg.is_read ? (
                            <CheckCheck className="w-3 h-3 text-success" />
                          ) : (
                            <Check className="w-3 h-3 text-text-muted" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {fileAttachment && (
        <div className="px-4 py-2 border-t border-border-forest">
          <div className="flex items-center gap-2 bg-bg-secondary rounded-lg p-2 pr-3">
            {fileAttachment.preview ? (
              <Image
                src={fileAttachment.preview}
                alt="Preview"
                width={40}
                height={40}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-accent-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-accent-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{fileAttachment.file.name}</p>
              <p className="text-[10px] text-text-muted">{formatFileSize(fileAttachment.file.size)}</p>
            </div>
            <button
              onClick={onRemoveFile}
              className="p-1 text-text-muted hover:text-error transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-border-forest p-3 bg-white">
        {showEmojiPicker && (
          <EmojiPicker emojiPickerRef={emojiPickerRef} onSelect={handleEmojiSelect} />
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message..."
              className="w-full h-11 rounded-xl border border-border-forest bg-bg-secondary px-4 pr-20 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-text-muted hover:text-accent-primary transition-colors"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={(!newMessage.trim() && !fileAttachment) || isSending}
            className="h-11 w-11 flex items-center justify-center rounded-xl bg-accent-primary text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

function EmojiPicker({
  emojiPickerRef,
  onSelect,
}: {
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (emoji: string) => void;
}) {
  return (
    <div
      ref={emojiPickerRef}
      className="bg-white border border-border-forest rounded-xl shadow-lg p-3 mb-2"
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-bg-secondary rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
