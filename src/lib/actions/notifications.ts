'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type NotificationType = 'order' | 'customer' | 'stock' | 'product' | 'security' | 'backup';

interface CreateNotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  user_id?: string | null;
  order_id?: string | number | null;
  order_request_id?: string | null;
  action_url?: string | null;
}

export async function createNotification(options: CreateNotificationOptions) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { error } = await supabase.from('notifications').insert({
    title: options.title,
    message: options.message,
    type: options.type,
    is_read: false,
    ...(options.user_id ? { user_id: options.user_id } : {}),
    ...(options.order_id ? { order_id: options.order_id } : {}),
    ...(options.order_request_id ? { order_request_id: options.order_request_id } : {}),
    ...(options.action_url ? { action_url: options.action_url } : {}),
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
