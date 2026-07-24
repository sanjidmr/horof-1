'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notifications';

export async function submitContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  file?: { name: string; url: string };
}) {
  const supabase = await createSupabaseServerClient();

  let fileInfo = '';
  if (data.file) {
    fileInfo = `\n\nAttached File: ${data.file.name}\nFile URL: ${data.file.url}`;
  }

  const { error } = await supabase.from('contact_messages').insert([
    {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message + fileInfo,
      is_read: false,
    },
  ]);

  if (error) {
    console.error('Error submitting contact message:', error);
    return { success: false, error: 'Failed to send message. Please try again later.' };
  }

  createNotification('New Contact Message', `${data.name} sent: ${data.subject}`, 'customer');
  revalidatePath('/admin/messages');
  return { success: true };
}

export async function uploadContactFile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { url: null, error: 'Not authenticated' };

  const file = formData.get('file') as File;
  if (!file) return { url: null, error: 'No file' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `contact/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from('support-files')
    .upload(fileName, buffer, { contentType: file.type, upsert: false });

  if (error) return { url: null, error: error.message };

  const { data: { publicUrl } } = supabase.storage.from('support-files').getPublicUrl(fileName);
  return { url: publicUrl, name: file.name, error: null };
}
