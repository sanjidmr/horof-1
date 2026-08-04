'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isInternalAdminRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { DEFAULT_EMAIL, DEFAULT_NOTIFICATIONS, type EmailSettings, type NotificationSettings } from '@/lib/settings/types';

export type NotificationType = 'order' | 'customer' | 'stock' | 'product' | 'security' | 'backup' | 'design' | 'warehouse' | 'assignment';

/**
 * Reads the global notification settings (service-role so any server action
 * can apply the gate regardless of the calling user's role / RLS).
 */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return DEFAULT_NOTIFICATIONS;
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();
    return { ...DEFAULT_NOTIFICATIONS, ...((data?.value as Partial<NotificationSettings>) || {}) };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

/**
 * Reads the global email settings (service-role; used to gate transactional emails).
 */
export async function loadEmailSettingsForGate(): Promise<EmailSettings> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return DEFAULT_EMAIL;
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'email')
      .maybeSingle();
    return { ...DEFAULT_EMAIL, ...((data?.value as Partial<EmailSettings>) || {}) };
  } catch {
    return DEFAULT_EMAIL;
  }
}

/**
 * Maps a notification type to the global enable/disable toggle that controls it.
 */
const TYPE_GATES: Record<NotificationType, keyof NotificationSettings> = {
  order: 'order_update_enabled',
  customer: 'customer_enabled',
  stock: 'low_stock_enabled',
  product: 'admin_enabled',
  security: 'admin_enabled',
  backup: 'admin_enabled',
  design: 'design_request_enabled',
  warehouse: 'warehouse_enabled',
  assignment: 'warehouse_enabled',
};

interface CreateNotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  user_id?: string | null;
  order_id?: string | number | null;
  order_request_id?: string | null;
  action_url?: string | null;
  design_request_id?: string | null;
  warehouse_id?: string | null;
  warehouse_assignment_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export async function createNotification(options: CreateNotificationOptions) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  // Global notification gate — respects the toggles in Settings Center.
  const notif = await loadNotificationSettings();
  const channelGate = TYPE_GATES[options.type];
  if (!notif.browser_enabled || (channelGate && !notif[channelGate])) {
    return { ok: true, skipped: true };
  }

  const { error } = await supabase.from('notifications').insert({
    title: options.title,
    message: options.message,
    type: options.type,
    is_read: false,
    ...(options.user_id ? { user_id: options.user_id } : {}),
    ...(options.order_id ? { order_id: options.order_id } : {}),
    ...(options.order_request_id ? { order_request_id: options.order_request_id } : {}),
    ...(options.action_url ? { action_url: options.action_url } : {}),
    ...(options.design_request_id ? { design_request_id: options.design_request_id } : {}),
    ...(options.warehouse_id ? { warehouse_id: options.warehouse_id } : {}),
    ...(options.warehouse_assignment_id ? { warehouse_assignment_id: options.warehouse_assignment_id } : {}),
    ...(options.entity_type ? { entity_type: options.entity_type } : {}),
    ...(options.entity_id ? { entity_id: options.entity_id } : {}),
  });

  if (error) {
    console.error('Failed to create notification:', error);
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function checkLowStock() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const notif = await loadNotificationSettings();
  if (!notif.low_stock_enabled) return;

  const { data: products } = await supabase
    .from('products')
    .select('id, name, stock')
    .lt('stock', 5);

  if (products) {
    for (const product of products) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'stock')
        .ilike('message', `%${product.name}%`)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!existing || existing.length === 0) {
        await createNotification({
          title: 'Low Stock Alert',
          message: `Product "${product.name}" is running low on stock (${product.stock} left).`,
          type: 'stock',
        });
      }
    }
  }
}

/**
 * Mark a notification as read (admin or the notification owner, or warehouse staff of target warehouse).
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Unauthorized' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Mark all notifications as read for current user or their warehouse.
 */
export async function markAllNotificationsRead() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Unauthorized' };

  // Get user's warehouse
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_warehouse_staff, assigned_warehouse_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { ok: false, message: 'Profile not found' };

  const isAdmin = isInternalAdminRole(profile.role);
  const isWarehouseStaff = profile.is_warehouse_staff === true;

  // Admin marks all as read
  if (isAdmin) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  // Warehouse staff marks their own + their warehouse's as read
  if (isWarehouseStaff) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},warehouse_id.eq.${profile.assigned_warehouse_id || '00000000-0000-0000-0000-000000000000'}`)
      .eq('is_read', false);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/admin/warehouse/orders');
    return { ok: true };
  }

  // Regular customer marks their own
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Get unread count for notifications (works across roles).
 */
export async function getUnreadNotificationCount() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_warehouse_staff, assigned_warehouse_id')
    .eq('id', user.id)
    .single();

  if (!profile) return 0;

  if (isInternalAdminRole(profile.role)) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    return count || 0;
  }

  if (profile.is_warehouse_staff === true) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},warehouse_id.eq.${profile.assigned_warehouse_id || '00000000-0000-0000-0000-000000000000'}`)
      .eq('is_read', false)
      .limit(100);
    return count || 0;
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  return count || 0;
}