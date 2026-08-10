'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isInternalAdminRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notifications';

export async function createConversation(customerId: string, subject?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('id, status')
    .eq('customer_id', customerId)
    .in('status', ['active', 'waiting'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return { id: existing.id, error: null };
  }

  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ customer_id: customerId, subject, status: 'active' })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id, error: null };
}

export async function sendMessage(conversationId: string, message: string, messageType: 'text' | 'image' | 'file' = 'text', fileUrl?: string, fileName?: string, fileSize?: number, mimeType?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const senderRole = isInternalAdminRole(profile?.role) ? 'admin' : 'customer';

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: senderRole,
      message,
      message_type: messageType,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      is_read: false,
    })
    .select('id, created_at')
    .single();

  if (error) return { error: error.message };

  if (senderRole === 'customer') {
    await createNotification({
      title: 'New Chat Message',
      message: `A customer sent a message in conversation ${conversationId.slice(0, 8)}...`,
      type: 'customer',
    });
  }

  return { id: data.id, error: null };
}

export async function getConversations(role: 'admin' | 'customer', userId?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from('chat_conversations')
    .select(`
      *,
      customer:customer_id(id, full_name, email, avatar_url),
      assigned:assigned_admin_id(id, full_name, email, avatar_url),
      participants:chat_participants(*),
      tags:chat_conversation_tags(tag:tag_id(id, name, color))
    `)
    .order('last_message_at', { ascending: false });

  if (role === 'customer' && userId) {
    query = query.eq('customer_id', userId);
  }

  const { data, error } = await query;
  if (error) { return []; }
  return data || [];
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) { return []; }
  return data || [];
}

export async function markConversationRead(conversationId: string, role: 'admin' | 'customer') {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const updateField = role === 'admin' ? { is_read_by_admin: true, unread_count: 0 } : { is_read_by_customer: true };
  const { error } = await supabase
    .from('chat_conversations')
    .update(updateField)
    .eq('id', conversationId);

  if (error) return;
}

export async function updateConversationStatus(conversationId: string, status: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('chat_conversations')
    .update({ status })
    .eq('id', conversationId);

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { error: null };
}

export async function assignConversation(conversationId: string, adminId: string | null) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('chat_conversations')
    .update({ assigned_admin_id: adminId })
    .eq('id', conversationId);

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { error: null };
}

export async function addChatNote(conversationId: string, note: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('chat_notes')
    .insert({ conversation_id: conversationId, admin_id: user.id, note });

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { error: null };
}

export async function getChatNotes(conversationId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('chat_notes')
    .select('*, admin:admin_id(id, full_name, email)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function addConversationTag(conversationId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('chat_conversation_tags')
    .insert({ conversation_id: conversationId, tag_id: tagId });

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeConversationTag(conversationId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('chat_conversation_tags')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('tag_id', tagId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function getChatTags() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase.from('chat_tags').select('*').order('name');
  return data || [];
}

export async function uploadChatFile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated', url: null };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided', url: null };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `chat/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) return { error: error.message, url: null };

  const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(fileName);
  return { error: null, url: publicUrl, name: file.name, size: file.size, type: file.type };
}

export async function getOnlineAgents() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('support_agents')
    .select('*, profile:profile_id(id, full_name, email, avatar_url)')
    .eq('is_online', true)
    .eq('is_available', true);

  return data || [];
}

export async function updateAgentPresence(isOnline: boolean) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('support.edit');
  } catch {
    return;
  }

  const updateData: any = { is_online: isOnline, last_seen_at: new Date().toISOString() };
  if (!isOnline) updateData.is_available = false;

  const { data: existing } = await supabase
    .from('support_agents')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    await supabase.from('support_agents').update(updateData).eq('profile_id', user.id);
  } else {
    await supabase.from('support_agents').insert({ profile_id: user.id, ...updateData });
  }
}

export async function getSupportStats() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { activeChats: 0, waitingCustomers: 0, onlineAgents: 0, openTickets: 0 };

  const now = new Date().toISOString();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [activeChats, waitingCustomers, onlineAgents, openTickets] = await Promise.all([
    supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('support_agents').select('id', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).not('status', 'in', '("resolved","closed")'),
  ]);

  return {
    activeChats: activeChats.count || 0,
    waitingCustomers: waitingCustomers.count || 0,
    onlineAgents: onlineAgents.count || 0,
    openTickets: openTickets.count || 0,
  };
}
