'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/lib/supabase/public-env';
import { revalidatePath } from 'next/cache';
import { loadNotificationSettings, loadEmailSettingsForGate } from '@/lib/actions/notifications';

// ============================================================
// HELPERS
// ============================================================

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf', 'image/vnd.adobe.photoshop', 'image/x-eps',
  'application/postscript', 'application/x-zip-compressed', 'application/zip',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/x-7z-compressed', 'application/x-rar-compressed',
  'image/tiff', 'image/bmp', 'image/x-icon',
];
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'ai', 'psd', 'eps',
  'zip', 'doc', 'docx', 'xls', 'xlsx', '7z', 'rar', 'tif', 'tiff', 'bmp', 'ico',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function createAdminClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createClient(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const notifications = await loadNotificationSettings();
    const email = await loadEmailSettingsForGate();
    if (notifications.email_enabled === false || notifications.design_request_enabled === false) return;

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}) },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

function isAllowedFile(file: File): { ok: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `${file.name}: File exceeds 50MB limit` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `${file.name}: File type .${ext || 'unknown'} not allowed` };
  }

  // Also check MIME type if available
  if (file.type && !ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    // Some browsers report empty MIME for certain files - only reject if we have a non-empty, non-allowed type
    return { ok: false, error: `${file.name}: File type ${file.type} not allowed` };
  }

  return { ok: true };
}

async function uploadFileToStorage(
  storageClient: any,
  requestId: string,
  file: File,
  subfolder: string,
): Promise<{ url: string; path: string; error?: string }> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `requests/${requestId}/${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(file.name)}`;

    const { error: uploadErr } = await storageClient.storage
      .from('design-files')
      .upload(filePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });

    if (uploadErr) {
      return { url: '', path: '', error: `${file.name}: ${uploadErr.message}` };
    }

    const { data: { publicUrl } } = storageClient.storage.from('design-files').getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  } catch (err: any) {
    return { url: '', path: '', error: `${file.name}: ${err.message}` };
  }
}

async function createNotification(options: {
  title: string;
  message: string;
  type: string;
  user_id?: string | null;
  action_url?: string | null;
  design_request_id?: string | null;
}) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from('notifications').insert({
      title: options.title,
      message: options.message,
      type: options.type,
      is_read: false,
      ...(options.user_id ? { user_id: options.user_id } : {}),
      ...(options.action_url ? { action_url: options.action_url } : {}),
      ...(options.design_request_id ? { design_request_id: options.design_request_id } : {}),
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

// ============================================================
// SUBMIT NEW DESIGN REQUEST (public - no auth required)
// ============================================================

export async function submitDesignRequest(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createAdminClient();

  const fullName = formData.get('full_name') as string;
  const phoneNumber = formData.get('phone_number') as string;
  const email = formData.get('email') as string;
  const productName = formData.get('product_name') as string || null;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as string || 'normal';

  if (!fullName || !phoneNumber || !email || !description) {
    return { error: 'All required fields must be filled' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email address' };
  }

  if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
    return { error: 'Invalid priority' };
  }

  // Get current user if logged in
  const { data: { user } } = await supabase.auth.getUser();
  const customerId = user?.id || null;

  // Create the design request
  const { data: request, error: reqErr } = await supabase
    .from('design_requests')
    .insert({
      customer_id: customerId,
      full_name: fullName,
      phone_number: phoneNumber,
      email,
      product_name: productName,
      description,
      status: 'pending',
      priority,
    })
    .select('id')
    .single();

  if (reqErr || !request) {
    return { error: reqErr?.message || 'Failed to submit request' };
  }

  // Upload files
  const fileEntries: { name: string; file: File }[] = [];
  for (let i = 0; ; i++) {
    const file = formData.get(`file_${i}`) as File | null;
    if (!file || file.size === 0) break;
    fileEntries.push({ name: `file_${i}`, file });
  }

  const uploadedFiles: { url: string; name: string; size: number; mime: string }[] = [];
  const uploadErrors: string[] = [];

  const storageClient = adminClient || supabase;

  for (const { file } of fileEntries) {
    const validation = isAllowedFile(file);
    if (!validation.ok) {
      uploadErrors.push(validation.error!);
      continue;
    }

    const result = await uploadFileToStorage(storageClient, request.id, file, 'customer');
    if (result.error) {
      uploadErrors.push(result.error);
      continue;
    }

    // Insert file record in database
    const { error: dbErr } = await supabase.from('design_request_files').insert({
      request_id: request.id,
      uploaded_by: customerId,
      file_url: result.url,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_type: 'customer_upload',
    });

    if (dbErr) {
      uploadErrors.push(`${file.name}: Failed to save file record: ${dbErr.message}`);
      continue;
    }

    uploadedFiles.push({ url: result.url, name: file.name, size: file.size, mime: file.type });
  }

  // Record status history
  await supabase.from('design_request_status_history').insert({
    request_id: request.id,
    from_status: null,
    to_status: 'pending',
    changed_by: customerId,
  });

  // Create initial system message in the conversation thread
  await supabase.from('design_request_messages').insert({
    request_id: request.id,
    sender_id: customerId,
    sender_role: customerId ? 'customer' : 'customer',
    message: `New design request submitted${productName ? ` for ${productName}` : ''}. ${uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) uploaded.` : ''}`,
    message_type: 'system',
  });

  // Notify admin
  await createNotification({
    title: 'New Design Request',
    message: `New design request from ${fullName} (${uploadedFiles.length} files)`,
    type: 'design',
    action_url: `/admin/design-requests/${request.id}`,
    design_request_id: request.id,
  });

  // Notify customer if logged in
  if (customerId) {
    await createNotification({
      title: 'Design Request Submitted',
      message: `Your design request #${request.id.slice(0, 8).toUpperCase()} has been submitted successfully.`,
      type: 'design',
      user_id: customerId,
      action_url: `/design-requests/${request.id}`,
      design_request_id: request.id,
    });
  }

  // Email admin
  try {
    const adminHtml = `
      <h2>New Design Request</h2>
      <p><strong>From:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      ${productName ? `<p><strong>Product:</strong> ${productName}</p>` : ''}
      <p><strong>Priority:</strong> ${priority}</p>
      <p><strong>Description:</strong></p>
      <p>${description.replace(/\n/g, '<br>')}</p>
      ${uploadedFiles.length > 0 ? `<p><strong>Files (${uploadedFiles.length}):</strong></p><ul>${uploadedFiles.map(f => `<li><a href="${f.url}">${f.name}</a></li>`).join('')}</ul>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/design-requests/${request.id}" style="display:inline-block;padding:12px 24px;background:#1a4731;color:#fff;text-decoration:none;border-radius:8px;">View Request</a></p>
    `;
    await sendEmail(process.env.EMAIL_FROM || 'admin@horof.com', `New Design Request: ${fullName}`, adminHtml);
  } catch {}

  // Email customer confirmation
  try {
    await sendEmail(email, 'New Design Request Received', `
      <h2>Thank You, ${fullName}!</h2>
      <p>We have received your custom design request. Our team will review it and get back to you soon.</p>
      <p><strong>Request ID:</strong> ${request.id.slice(0, 8).toUpperCase()}</p>
      ${productName ? `<p><strong>Product:</strong> ${productName}</p>` : ''}
      <p>You will receive email updates as your request progresses.</p>
    `);
  } catch {}

  revalidatePath('/admin/design-requests');

  return {
    success: true,
    id: request.id,
    uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
  };
}

// ============================================================
// GET DESIGN REQUESTS
// ============================================================

export async function getDesignRequests(options?: {
  search?: string;
  status?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  priority?: string;
}) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('design_requests')
    .select('*, files:design_request_files(count), messages:design_request_messages(count)', { count: 'exact' });

  query = query.order(options?.sort === 'updated' ? 'updated_at' : 'created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.priority && options.priority !== 'all') {
    query = query.eq('priority', options.priority);
  }

  if (options?.search) {
    query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone_number.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return { data: data || [], total: count || 0, error: null };
}

// ============================================================
// GET SINGLE DESIGN REQUEST (with files, messages, history)
// ============================================================

export async function getDesignRequest(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: request, error: reqErr } = await supabase
    .from('design_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (reqErr || !request) {
    return { request: null, files: [], messages: [], comments: [], history: [], error: reqErr?.message || 'Not found' };
  }

  const { data: files } = await supabase
    .from('design_request_files')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const { data: messages } = await supabase
    .from('design_request_messages')
    .select('*, files:design_request_message_files(*)')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const { data: comments } = await supabase
    .from('design_request_comments')
    .select('*, user:user_id(id, full_name, avatar_url)')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const { data: history } = await supabase
    .from('design_request_status_history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  return {
    request,
    files: files || [],
    messages: messages || [],
    comments: comments || [],
    history: history || [],
    error: null,
  };
}

// ============================================================
// UPDATE DESIGN REQUEST STATUS
// ============================================================

export async function updateDesignRequestStatus(
  id: string,
  status: string,
  comment?: string,
) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('design_requests.edit');
  } catch {
    return { error: 'Access denied' };
  }

  const validStatuses = ['pending', 'under_review', 'design_in_progress', 'design_ready', 'waiting_approval', 'approved', 'revision_requested', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) return { error: 'Invalid status' };

  // Get previous status
  const { data: current } = await supabase
    .from('design_requests')
    .select('status, email, full_name, customer_id')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Request not found' };

  const fromStatus = current.status;

  // Update the request
  const { error: updateErr } = await supabase
    .from('design_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) return { error: updateErr.message };

  // Record history
  await supabase.from('design_request_status_history').insert({
    request_id: id,
    from_status: fromStatus,
    to_status: status,
    changed_by: user.id,
    comment: comment || null,
  });

  // Add admin notes as comment if provided
  if (comment) {
    await supabase.from('design_request_comments').insert({
      request_id: id,
      user_id: user.id,
      comment: `[Status: ${status}] ${comment}`,
    });
  }

  // Add system message to conversation
  await supabase.from('design_request_messages').insert({
    request_id: id,
    sender_id: user.id,
    sender_role: 'admin',
    message: `Status changed to "${status.replace(/_/g, ' ')}"${comment ? `: ${comment}` : ''}`,
    message_type: 'system',
  });

  // Notify customer
  if (current.customer_id) {
    await createNotification({
      title: `Design Request Updated: ${status.replace(/_/g, ' ')}`,
      message: `Your design request #${id.slice(0, 8).toUpperCase()} has been updated to "${status.replace(/_/g, ' ')}".${comment ? ` Note: ${comment}` : ''}`,
      type: 'design',
      user_id: current.customer_id,
      action_url: `/design-requests/${id}`,
      design_request_id: id,
    });
  }

  // Email customer
  try {
    const statusLabels: Record<string, string> = {
      under_review: 'Under Review',
      design_in_progress: 'Design In Progress',
      design_ready: 'Design Ready',
      waiting_approval: 'Waiting for Your Approval',
      approved: 'Approved',
      revision_requested: 'Revision Requested',
      rejected: 'Rejected',
      completed: 'Completed',
    };

    const statusEmojis: Record<string, string> = {
      under_review: '🔍',
      design_in_progress: '🎨',
      design_ready: '✅',
      waiting_approval: '📋',
      approved: '👍',
      revision_requested: '🔄',
      rejected: '❌',
      completed: '🎉',
    };

    await sendEmail(
      current.email,
      `Design Request Status Update: ${statusLabels[status] || status}`,
      `
        <h2>${statusEmojis[status] || '📝'} Status Update</h2>
        <p>Dear ${current.full_name},</p>
        <p>Your design request <strong>#${id.slice(0, 8).toUpperCase()}</strong> has been updated to: <strong>${statusLabels[status] || status.replace(/_/g, ' ')}</strong></p>
        ${comment ? `<p><strong>Note from admin:</strong> ${comment}</p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/design-requests/${id}" style="display:inline-block;padding:12px 24px;background:#1a4731;color:#fff;text-decoration:none;border-radius:8px;">View Details</a>
      `
    );
  } catch {}

  revalidatePath(`/admin/design-requests/${id}`);
  revalidatePath('/admin/design-requests');
  revalidatePath(`/design-requests/${id}`);
  revalidatePath('/design-requests');

  return { error: null };
}

// ============================================================
// UPLOAD ADMIN DESIGN FILE
// ============================================================

export async function uploadDesignFile(requestId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('design_requests.edit');
  } catch {
    return { error: 'Access denied' };
  }

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file provided' };

  const validation = isAllowedFile(file);
  if (!validation.ok) return { error: validation.error };

  const storageClient = adminClient || supabase;

  const result = await uploadFileToStorage(storageClient, requestId, file, 'admin');
  if (result.error) return { error: result.error };

  const { error: dbErr } = await supabase.from('design_request_files').insert({
    request_id: requestId,
    uploaded_by: user.id,
    file_url: result.url,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    file_type: 'design_file',
  });

  if (dbErr) return { error: dbErr.message };

  // Add system message to conversation
  await supabase.from('design_request_messages').insert({
    request_id: requestId,
    sender_id: user.id,
    sender_role: 'admin',
    message: `Design file uploaded: ${file.name}`,
    message_type: 'file',
  });

  // Notify customer
  const { data: request } = await supabase
    .from('design_requests')
    .select('customer_id')
    .eq('id', requestId)
    .single();

  if (request?.customer_id) {
    await createNotification({
      title: 'New Design File',
      message: `A new design file "${file.name}" has been uploaded to your request #${requestId.slice(0, 8).toUpperCase()}.`,
      type: 'design',
      user_id: request.customer_id,
      action_url: `/design-requests/${requestId}`,
      design_request_id: requestId,
    });
  }

  revalidatePath(`/admin/design-requests/${requestId}`);
  revalidatePath(`/design-requests/${requestId}`);

  return { error: null, url: result.url, name: file.name };
}

// ============================================================
// SEND MESSAGE (customer or admin)
// ============================================================

export async function sendDesignRequestMessage(
  requestId: string,
  message: string,
  files?: File[],
) {
  const supabase = await createSupabaseServerClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  let isAdmin = false;
  try {
    await requirePermission('design_requests.edit');
    isAdmin = true;
  } catch {
    // not an admin — fall through to owner-scoped path
  }

  // Verify access
  const { data: request } = await supabase
    .from('design_requests')
    .select('customer_id, email, full_name')
    .eq('id', requestId)
    .single();

  if (!request) return { error: 'Request not found' };

  if (!isAdmin && request.customer_id !== user.id) {
    return { error: 'You can only message on your own requests' };
  }

  if (!message?.trim() && (!files || files.length === 0)) {
    return { error: 'Message or file is required' };
  }

  // Create the message
  const messageType = files && files.length > 0 ? 'file' : 'text';
  const { data: msg, error: msgErr } = await supabase
    .from('design_request_messages')
    .insert({
      request_id: requestId,
      sender_id: user.id,
      sender_role: isAdmin ? 'admin' : 'customer',
      message: message?.trim() || null,
      message_type: messageType,
    })
    .select('id')
    .single();

  if (msgErr || !msg) return { error: msgErr?.message || 'Failed to send message' };

  // Upload files if any
  const storageClient = adminClient || supabase;
  const uploadedFiles: { url: string; name: string; size: number; mime: string }[] = [];
  const uploadErrors: string[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const validation = isAllowedFile(file);
      if (!validation.ok) {
        uploadErrors.push(validation.error!);
        continue;
      }

      const result = await uploadFileToStorage(storageClient, requestId, file, isAdmin ? 'admin' : 'customer');
      if (result.error) {
        uploadErrors.push(result.error);
        continue;
      }

      const { error: dbErr } = await supabase.from('design_request_message_files').insert({
        message_id: msg.id,
        request_id: requestId,
        uploaded_by: user.id,
        file_url: result.url,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_type: isAdmin ? 'design_file' : 'customer_upload',
      });

      if (dbErr) {
        uploadErrors.push(`${file.name}: Failed to save file record: ${dbErr.message}`);
        continue;
      }

      uploadedFiles.push({ url: result.url, name: file.name, size: file.size, mime: file.type });
    }
  }

  // Notify the other party
  if (isAdmin) {
    if (request.customer_id) {
      await createNotification({
        title: 'New Admin Reply',
        message: `Admin replied to your design request #${requestId.slice(0, 8).toUpperCase()}.`,
        type: 'design',
        user_id: request.customer_id,
        action_url: `/design-requests/${requestId}`,
        design_request_id: requestId,
      });
    }
  } else {
    await createNotification({
      title: 'New Customer Message',
      message: `New message from ${request.full_name} on design request #${requestId.slice(0, 8).toUpperCase()}.`,
      type: 'design',
      action_url: `/admin/design-requests/${requestId}`,
      design_request_id: requestId,
    });
  }

  revalidatePath(`/admin/design-requests/${requestId}`);
  revalidatePath(`/design-requests/${requestId}`);

  return {
    error: null,
    messageId: msg.id,
    uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
  };
}

// ============================================================
// MARK MESSAGES AS READ
// ============================================================

export async function markDesignRequestMessagesRead(requestId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('design_request_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .eq('is_read', false)
    .neq('sender_id', user.id);

  if (error) return { error: error.message };

  return { error: null };
}

// ============================================================
// ADD COMMENT
// ============================================================

export async function addDesignComment(requestId: string, comment: string) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (!comment?.trim()) return { error: 'Comment cannot be empty' };

  const { data: request } = await supabase
    .from('design_requests')
    .select('customer_id, email, full_name')
    .eq('id', requestId)
    .single();

  if (!request) return { error: 'Request not found' };

  const { requirePermission } = await import('./security');
  let isAdmin = false;
  try {
    await requirePermission('design_requests.edit');
    isAdmin = true;
  } catch {
    // not an admin — fall through to owner-scoped path
  }

  if (!isAdmin && request.customer_id !== user.id) {
    return { error: 'You can only comment on your own requests' };
  }

  const { error } = await supabase.from('design_request_comments').insert({
    request_id: requestId,
    user_id: user.id,
    comment: comment.trim(),
  });

  if (error) return { error: error.message };

  // Also add to messages for the conversation thread
  await supabase.from('design_request_messages').insert({
    request_id: requestId,
    sender_id: user.id,
    sender_role: isAdmin ? 'admin' : 'customer',
    message: comment.trim(),
    message_type: 'text',
  });

  // Notify the other party
  if (isAdmin) {
    if (request.customer_id) {
      await createNotification({
        title: 'New Admin Reply',
        message: `Admin replied to your design request #${requestId.slice(0, 8).toUpperCase()}.`,
        type: 'design',
        user_id: request.customer_id,
        action_url: `/design-requests/${requestId}`,
        design_request_id: requestId,
      });
    }
  } else {
    await createNotification({
      title: 'New Customer Message',
      message: `New message from ${request.full_name} on design request #${requestId.slice(0, 8).toUpperCase()}.`,
      type: 'design',
      action_url: `/admin/design-requests/${requestId}`,
      design_request_id: requestId,
    });
  }

  revalidatePath(`/admin/design-requests/${requestId}`);
  revalidatePath(`/design-requests/${requestId}`);

  return { error: null };
}

// ============================================================
// SEND FOR APPROVAL (admin uploads designs + sends to customer)
// ============================================================

export async function sendForApproval(
  requestId: string,
  data: {
    comment?: string;
    estimatedQuantity?: number;
    estimatedPrice?: number;
  }
) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('design_requests.edit');
  } catch {
    return { error: 'Access denied' };
  }

  const { data: request } = await supabase
    .from('design_requests')
    .select('email, full_name, customer_id')
    .eq('id', requestId)
    .single();

  if (!request) return { error: 'Request not found' };

  // Update status + estimated values
  const updateData: any = {
    status: 'waiting_approval',
    updated_at: new Date().toISOString(),
  };
  if (data.estimatedQuantity) updateData.estimated_quantity = data.estimatedQuantity;
  if (data.estimatedPrice) updateData.estimated_price = data.estimatedPrice;

  const { error: updateErr } = await supabase
    .from('design_requests')
    .update(updateData)
    .eq('id', requestId);

  if (updateErr) return { error: updateErr.message };

  // Record history
  await supabase.from('design_request_status_history').insert({
    request_id: requestId,
    from_status: 'design_ready',
    to_status: 'waiting_approval',
    changed_by: user.id,
    comment: data.comment || null,
  });

  // Add comment
  if (data.comment) {
    await supabase.from('design_request_comments').insert({
      request_id: requestId,
      user_id: user.id,
      comment: `[Sent for approval] ${data.comment}`,
    });
  }

  // Add system message to conversation
  await supabase.from('design_request_messages').insert({
    request_id: requestId,
    sender_id: user.id,
    sender_role: 'admin',
    message: `Design sent for approval${data.comment ? `: ${data.comment}` : ''}${data.estimatedQuantity ? ` (Qty: ${data.estimatedQuantity})` : ''}${data.estimatedPrice ? ` (Price: $${Number(data.estimatedPrice).toFixed(2)})` : ''}`,
    message_type: 'system',
  });

  // Notify customer
  if (request.customer_id) {
    await createNotification({
      title: 'Design Ready for Approval',
      message: `Your design for request #${requestId.slice(0, 8).toUpperCase()} is ready. Please review and approve.`,
      type: 'design',
      user_id: request.customer_id,
      action_url: `/design-requests/${requestId}`,
      design_request_id: requestId,
    });
  }

  // Email customer
  try {
    await sendEmail(
      request.email,
      'Your Custom Design is Ready for Review',
      `
        <h2>🎨 Your Design is Ready!</h2>
        <p>Dear ${request.full_name},</p>
        <p>Your custom design is ready for review. Please log in to approve, request revisions, or reject the design.</p>
        ${data.estimatedQuantity ? `<p><strong>Estimated Quantity:</strong> ${data.estimatedQuantity}</p>` : ''}
        ${data.estimatedPrice ? `<p><strong>Estimated Price:</strong> $${Number(data.estimatedPrice).toFixed(2)}</p>` : ''}
        ${data.comment ? `<p><strong>Admin Note:</strong> ${data.comment}</p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/design-requests/${requestId}" style="display:inline-block;padding:12px 24px;background:#1a4731;color:#fff;text-decoration:none;border-radius:8px;">Review Design</a>
      `
    );
  } catch {}

  revalidatePath(`/admin/design-requests/${requestId}`);
  revalidatePath(`/design-requests/${requestId}`);

  return { error: null };
}

// ============================================================
// CUSTOMER RESPOND (approve, request revision, reject)
// ============================================================

export async function customerRespond(
  requestId: string,
  action: 'approved' | 'revision_requested' | 'rejected',
  comment?: string,
) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: request } = await supabase
    .from('design_requests')
    .select('customer_id, email, full_name, status')
    .eq('id', requestId)
    .single();

  if (!request) return { error: 'Request not found' };

  if (request.status !== 'waiting_approval') return { error: 'This request is not waiting for approval' };

  if (user?.id !== request.customer_id) return { error: 'You can only respond to your own requests' };

  const targetStatus = action;

  // Update status
  const { error: updateErr } = await supabase
    .from('design_requests')
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateErr) return { error: updateErr.message };

  // Record history
  await supabase.from('design_request_status_history').insert({
    request_id: requestId,
    from_status: 'waiting_approval',
    to_status: targetStatus,
    changed_by: user?.id,
    comment: comment || null,
  });

  // Add comment
  if (comment) {
    await supabase.from('design_request_comments').insert({
      request_id: requestId,
      user_id: user?.id,
      comment: `[${action === 'approved' ? 'Approved' : action === 'revision_requested' ? 'Revision Requested' : 'Rejected'}] ${comment}`,
    });
  }

  // Add system message to conversation
  await supabase.from('design_request_messages').insert({
    request_id: requestId,
    sender_id: user?.id,
    sender_role: 'customer',
    message: `Design ${action === 'approved' ? 'approved' : action === 'revision_requested' ? 'revision requested' : 'rejected'}${comment ? `: ${comment}` : ''}`,
    message_type: 'system',
  });

  // Notify admin
  await createNotification({
    title: `Design ${action === 'approved' ? 'Approved' : action === 'revision_requested' ? 'Revision Requested' : 'Rejected'}`,
    message: `Request #${requestId.slice(0, 8).toUpperCase()} was ${action === 'approved' ? 'approved' : action === 'revision_requested' ? 'revision requested' : 'rejected'} by the customer.${comment ? ` Comment: ${comment}` : ''}`,
    type: 'design',
    action_url: `/admin/design-requests/${requestId}`,
    design_request_id: requestId,
  });

  // Email admin
  try {
    const actionLabels: Record<string, string> = {
      approved: 'Approved',
      revision_requested: 'Revision Requested',
      rejected: 'Rejected',
    };
    await sendEmail(
      process.env.EMAIL_FROM || 'admin@horof.com',
      `Design ${actionLabels[action] || action}: #${requestId.slice(0, 8).toUpperCase()}`,
      `
        <h2>Customer Response: ${actionLabels[action] || action}</h2>
        <p>Customer <strong>${request.full_name}</strong> has ${action === 'approved' ? 'approved' : action === 'revision_requested' ? 'requested revisions on' : 'rejected'} their design request.</p>
        ${comment ? `<p><strong>Customer comment:</strong> ${comment}</p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/design-requests/${requestId}" style="display:inline-block;padding:12px 24px;background:#1a4731;color:#fff;text-decoration:none;border-radius:8px;">View Request</a>
      `
    );
  } catch {}

  // Email customer confirmation
  try {
    await sendEmail(
      request.email,
      `Design ${action === 'approved' ? 'Approved' : action === 'revision_requested' ? 'Revision Requested' : 'Rejected'}`,
      `<h2>Thank You for Your Response</h2><p>Your design request <strong>#${requestId.slice(0, 8).toUpperCase()}</strong> has been marked as <strong>${action.replace(/_/g, ' ')}</strong>.</p>`
    );
  } catch {}

  revalidatePath(`/admin/design-requests/${requestId}`);
  revalidatePath(`/design-requests/${requestId}`);

  return { error: null };
}

// ============================================================
// DELETE FILE
// ============================================================

export async function deleteDesignFile(fileId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('design_requests.delete');
  } catch {
    return { error: 'Access denied' };
  }

  const { data: file } = await supabase
    .from('design_request_files')
    .select('id, request_id, file_url')
    .eq('id', fileId)
    .single();

  if (!file) return { error: 'File not found' };

  // Delete from storage
  try {
    const adminClient = createAdminClient();
    const storageClient = adminClient || supabase;
    const url = new URL(file.file_url);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('design-files');
    if (bucketIndex >= 0) {
      const storagePath = pathParts.slice(bucketIndex + 1).join('/');
      await storageClient.storage.from('design-files').remove([storagePath]);
    }
  } catch (err) {
    console.error('Failed to delete file from storage:', err);
  }

  const { error: delErr } = await supabase
    .from('design_request_files')
    .delete()
    .eq('id', fileId);

  if (delErr) return { error: delErr.message };

  revalidatePath(`/admin/design-requests/${file.request_id}`);

  return { error: null };
}

// ============================================================
// UPDATE PRIORITY
// ============================================================

export async function updateDesignRequestPriority(id: string, priority: string) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { requirePermission } = await import('./security');
  try {
    await requirePermission('design_requests.edit');
  } catch {
    return { error: 'Access denied' };
  }

  if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
    return { error: 'Invalid priority' };
  }

  const { error } = await supabase
    .from('design_requests')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/design-requests/${id}`);
  revalidatePath('/admin/design-requests');

  return { error: null };
}