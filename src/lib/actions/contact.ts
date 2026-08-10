'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createNotification } from './notifications';

export type ContactAttachment = {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
};

export async function submitContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  file?: { name: string; url: string };
  attachments?: ContactAttachment[];
}) {
  const supabase = await createSupabaseServerClient();

  // Structured attachments take priority; fall back to the legacy
  // `file` param for backward compatibility with the old flow.
  const attachments: ContactAttachment[] = data.attachments?.length
    ? data.attachments
    : data.file
      ? [{ name: data.file.name, url: data.file.url }]
      : [];

  // Keep a human-readable mention of the attachment in the message
  // body too, so the plain-text reply email and older views still
  // indicate a file exists — but the authoritative structured data
  // lives in the `attachments` column for the Admin Panel.
  let fileInfo = '';
  if (attachments.length > 0) {
    fileInfo = `\n\nAttached File${attachments.length > 1 ? 's' : ''}: ${attachments.map((a) => a.name).join(', ')}`;
  }

  const { error } = await supabase.from('contact_messages').insert([
    {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message + fileInfo,
      attachments,
      is_read: false,
    },
  ]);

  if (error) {
    console.error('Error submitting contact message:', error);
    return { success: false, error: 'Failed to send message. Please try again later.' };
  }

  createNotification({ title: 'New Contact Message', message: `${data.name} sent: ${data.subject}`, type: 'customer' });
  revalidatePath('/admin/messages');
  return { success: true };
}

export async function uploadContactFile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { url: null, error: 'Not authenticated' };

  const file = formData.get('file') as File;
  if (!file) return { url: null, error: 'No file' };

  if (file.size > 5 * 1024 * 1024) {
    return { url: null, error: 'File size must be under 5MB' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `contact/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from('support-files')
    .upload(fileName, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading contact file:', error);
    return { url: null, error: error.message };
  }

  const { data: { publicUrl } } = supabase.storage.from('support-files').getPublicUrl(fileName);

  return {
    url: publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    error: null,
  };
}