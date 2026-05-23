'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteMessage(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('contact_messages').delete().eq('id', id);
  if (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: 'Failed to delete message.' };
  }
  revalidatePath('/admin/messages');
  return { success: true };
}

export async function toggleMessageReadStatus(id: string, currentStatus: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('contact_messages').update({ is_read: !currentStatus }).eq('id', id);
  if (error) {
    console.error('Error updating message status:', error);
    return { success: false, error: 'Failed to update status.' };
  }
  revalidatePath('/admin/messages');
  return { success: true };
}
