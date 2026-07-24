'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type NotificationType = 'order' | 'customer' | 'stock' | 'product' | 'security' | 'backup';

export async function createNotification(
  title: string,
  message: string,
  type: NotificationType
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };

  const { error } = await supabase.from('notifications').insert({
    title,
    message,
    type,
    is_read: false,
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
      // Check if a low stock notification already exists for this product in the last 24h
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'stock')
        .ilike('message', `%${product.name}%`)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!existing || existing.length === 0) {
        await createNotification(
          'Low Stock Alert',
          `Product "${product.name}" is running low on stock (${product.stock} left).`,
          'stock'
        );
      }
    }
  }
}
