'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('contact_messages').insert([
    {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      is_read: false,
    },
  ]);

  if (error) {
    console.error('Error submitting contact message:', error);
    return { success: false, error: 'Failed to send message. Please try again later.' };
  }
  
  // Optionally notify admins, etc.
  revalidatePath('/admin/messages');
  return { success: true };
}
