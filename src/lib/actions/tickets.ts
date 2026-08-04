'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isInternalAdminRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notifications';

export async function createTicket(data: {
  subject: string;
  description: string;
  categoryId?: string;
  priority?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated', ticket: null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', ticket: null };

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      customer_id: user.id,
      subject: data.subject,
      description: data.description,
      category_id: data.categoryId || null,
      priority: data.priority || 'medium',
      source: 'portal',
    })
    .select('*, category:category_id(name)')
    .single();

  if (error) return { error: error.message, ticket: null };

  await createNotification({
    title: 'New Support Ticket',
    message: `Ticket ${ticket.ticket_number}: ${data.subject}`,
    type: 'customer',
  });

  revalidatePath('/customer/support');
  revalidatePath('/admin/support');
  return { error: null, ticket };
}

export async function getTickets(role: 'admin' | 'customer', userId?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      customer:customer_id(id, full_name, email, avatar_url),
      assigned:assigned_admin_id(id, full_name, email),
      category:category_id(id, name, color)
    `)
    .order('created_at', { ascending: false });

  if (role === 'customer' && userId) {
    query = query.eq('customer_id', userId);
  }

  const { data, error } = await query;
  if (error) { console.error('getTickets error:', error); return []; }
  return data || [];
}

export async function getTicket(ticketId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      customer:customer_id(id, full_name, email, avatar_url),
      assigned:assigned_admin_id(id, full_name, email),
      category:category_id(id, name, color),
      replies:ticket_replies(*, sender:sender_id(id, full_name, email, avatar_url)),
      notes:ticket_notes(*, admin:admin_id(id, full_name, email)),
      attachments:ticket_attachments(*),
      ratings:ticket_ratings(*)
    `)
    .eq('id', ticketId)
    .single();

  if (error) { console.error('getTicket error:', error); return null; }
  return data;
}

export async function addTicketReply(ticketId: string, message: string, isInternalNote: boolean = false) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const senderRole = isInternalAdminRole(profile?.role) ? 'admin' : 'customer';

  const { error } = await supabase
    .from('ticket_replies')
    .insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_role: senderRole,
      message,
      is_internal_note: isInternalNote,
    });

  if (error) return { error: error.message };

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('customer_id, ticket_number')
    .eq('id', ticketId)
    .single();

  if (ticket && senderRole === 'customer') {
    await supabase.from('support_tickets').update({ is_read_by_admin: false }).eq('id', ticketId);
    await createNotification({ title: 'New Ticket Reply', message: `Customer replied to ticket ${ticket.ticket_number}`, type: 'customer' });
  } else if (ticket && senderRole === 'admin' && !isInternalNote) {
    await supabase.from('support_tickets').update({ is_read_by_customer: false }).eq('id', ticketId);
  }

  revalidatePath(`/admin/support/tickets/${ticketId}`);
  revalidatePath(`/customer/support`);
  return { error: null };
}

export async function addTicketNote(ticketId: string, note: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('ticket_notes')
    .insert({ ticket_id: ticketId, admin_id: user.id, note });

  if (error) return { error: error.message };
  revalidatePath(`/admin/support/tickets/${ticketId}`);
  return { error: null };
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const updateData: any = { status };
  if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
  if (status === 'closed') updateData.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', ticketId);

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  revalidatePath('/customer/support');
  return { error: null };
}

export async function updateTicketPriority(ticketId: string, priority: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('support_tickets')
    .update({ priority })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { error: null };
}

export async function assignTicket(ticketId: string, adminId: string | null) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('support_tickets')
    .update({ assigned_admin_id: adminId })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { error: null };
}

export async function getTicketCategories() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('ticket_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return data || [];
}

export async function submitTicketRating(ticketId: string, rating: number, feedback?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('ticket_ratings')
    .upsert({
      ticket_id: ticketId,
      customer_id: user.id,
      rating,
      feedback,
    }, { onConflict: 'ticket_id,customer_id' });

  if (error) return { error: error.message };
  return { error: null };
}

export async function uploadTicketAttachment(ticketId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `tickets/${ticketId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const bucketName = 'support-files';
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from('ticket_attachments')
    .insert({
      ticket_id: ticketId,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    });

  if (insertError) return { error: insertError.message };
  return { error: null, url: publicUrl };
}

export async function getTicketAnalytics() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const now = new Date().toISOString();

  const [totalTickets, openTickets, resolvedTickets, ratings] = await Promise.all([
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'pending', 'in_progress']),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('ticket_ratings').select('rating'),
  ]);

  const avgRating = ratings.data && ratings.data.length > 0
    ? ratings.data.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.data.length
    : 0;

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('created_at, resolved_at, status, priority')
    .not('status', 'eq', 'closed');

  const avgResolutionTime = tickets && tickets.length > 0
    ? tickets
        .filter((t: any) => t.resolved_at)
        .reduce((sum: number, t: any) => sum + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()), 0)
        / (tickets.filter((t: any) => t.resolved_at).length || 1)
    : 0;

  const byPriority = (tickets || []).reduce((acc: any, t: any) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});

  const byStatus = (tickets || []).reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalTickets: totalTickets.count || 0,
    openTickets: openTickets.count || 0,
    resolvedTickets: resolvedTickets.count || 0,
    avgRating,
    avgResolutionTime,
    byPriority,
    byStatus,
  };
}
