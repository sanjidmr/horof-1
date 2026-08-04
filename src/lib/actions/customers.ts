'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getCustomerFull(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.view');
  } catch {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('user_type', 'customer')
    .eq('role', 'customer')
    .eq('is_warehouse_staff', false)
    .single();

  if (!profile) return null;

  const [addressesRes, tagsRes, ordersRes, requestsRes, ticketsRes, timelineRes, invoicesRes, notificationsRes] = await Promise.all([
    supabase.from('addresses').select('*').or(`user_id.eq.${id},customer_id.eq.${id}`),
    supabase.from('customer_tag_assignments').select('*, tag:tag_id(*)').eq('customer_id', id),
    supabase.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('order_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('support_tickets').select('*, category:category_id(name, color), assigned:assigned_admin_id(full_name, email)').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('customer_timeline').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('customer_invoices').select('*, order:order_id(order_number)').eq('order_id', id),
    supabase.from('notifications').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
  ]);

  return {
    profile,
    addresses: addressesRes.data || [],
    tags: tagsRes.data || [],
    orders: (ordersRes.data || []).map(o => ({ ...o, is_request: false })),
    orderRequests: (requestsRes.data || []).map(r => ({ ...r, is_request: true })),
    tickets: ticketsRes.data || [],
    timeline: timelineRes.data || [],
    invoices: invoicesRes.data || [],
    notifications: notificationsRes.data || [],
  };
}

export async function getCustomerOrdersOnly(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.view');
  } catch {
    return [];
  }
  const { data } = await supabase.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false });
  return (data || []).map(o => ({ ...o, is_request: false }));
}

export async function getAllTags() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.view');
  } catch {
    return [];
  }
  const { data } = await supabase.from('customer_tags').select('*').order('name');
  return data || [];
}

export async function assignTag(customerId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.edit');
  } catch {
    return { error: 'Forbidden' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('customer_tag_assignments').insert({
    customer_id: customerId,
    tag_id: tagId,
    assigned_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { error: null };
}

export async function removeTag(customerId: string, tagId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.edit');
  } catch {
    return { error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('customer_tag_assignments')
    .delete()
    .eq('customer_id', customerId)
    .eq('tag_id', tagId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { error: null };
}

export async function createTag(name: string, color: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated', tag: null };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.edit');
  } catch {
    return { error: 'Forbidden', tag: null };
  }

  const { data, error } = await supabase.from('customer_tags').insert({ name, color }).select().single();
  if (error) return { error: error.message, tag: null };
  return { error: null, tag: data };
}

export async function addCustomerTimelineNote(customerId: string, description: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.edit');
  } catch {
    return { error: 'Forbidden' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('customer_timeline').insert({
    customer_id: customerId,
    event_type: 'note_added',
    description,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { error: null };
}

export async function getCustomerInvoices(customerId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  try {
    const { requirePermission } = await import('./security');
    await requirePermission('customers.view');
  } catch {
    return [];
  }
  const { data } = await supabase
    .from('customer_invoices')
    .select('*, order:order_id(order_number)')
    .eq('order_id', customerId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateCustomerNotes(customerId: string, notes: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('profiles').update({ notes }).eq('id', customerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { error: null };
}

export async function toggleBanCustomer(customerId: string, isBanned: boolean) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: 'Not authenticated' };

  const { error } = await supabase.from('profiles').update({ is_banned: isBanned }).eq('id', customerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/customers/${customerId}`);
  return { error: null };
}
