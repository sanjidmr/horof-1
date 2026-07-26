'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/lib/supabase/public-env';
import { revalidatePath } from 'next/cache';

// ============================================================
// HELPERS
// ============================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/svg+xml', 'image/vnd.adobe.photoshop', 'image/x-eps', 'application/postscript', 'application/x-zip-compressed', 'application/zip'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'ai', 'psd', 'svg', 'eps', 'zip'];
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
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
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

  if (!fullName || !phoneNumber || !email || !description) {
    return { error: 'All required fields must be filled' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Invalid email address' };
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
    if (file.size > MAX_FILE_SIZE) {
      uploadErrors.push(`${file.name}: File exceeds 50MB limit`);
      continue;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      uploadErrors.push(`${file.name}: File type not allowed (${ext})`);
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = `requests/${request.id}/${Date.now()}-${sanitizeFileName(file.name)}`;

      const { error: uploadErr } = await storageClient.storage
        .from('design-files')
        .upload(filePath, buffer, { contentType: file.type, upsert: false });

      if (uploadErr) {
        uploadErrors.push(`${file.name}: ${uploadErr.message}`);
        continue;
      }

      const { data: { publicUrl } } = storageClient.storage.from('design-files').getPublicUrl(filePath);

      await supabase.from('design_request_files').insert({
        request_id: request.id,
        uploaded_by: customerId,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_type: 'customer_upload',
      });

      uploadedFiles.push({ url: publicUrl, name: file.name, size: file.size, mime: file.type });
    } catch (err: any) {
      uploadErrors.push(`${file.name}: ${err.message}`);
    }
  }

  // Record status history
  await supabase.from('design_request_status_history').insert({
    request_id: request.id,
    from_status: null,
    to_status: 'pending',
    changed_by: customerId,
  });

  // Notify admin
  try {
    const notificationText = `New design request from ${fullName} (${uploadedFiles.length} files)`;
    const { createNotification } = await import('./notifications');
    await createNotification('New Design Request', notificationText, 'customer');
  } catch {}

  // Email admin
  try {
    const adminHtml = `
      <h2>New Design Request</h2>
      <p><strong>From:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      ${productName ? `<p><strong>Product:</strong> ${productName}</p>` : ''}
      <p><strong>Description:</strong></p>
      <p>${description.replace(/\n/g, '<br>')}</p>
      ${uploadedFiles.length > 0 ? `<p><strong>Files (${uploadedFiles.length}):</strong></p><ul>${uploadedFiles.map(f => `<li><a href="${f.url}">${f.name}</a></li>`).join('')}</ul>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/design-requests/${request.id}" style="display:inline-block;padding:12px 24px;background:#1a4731;color:#fff;text-decoration:none;border-radius:8px;">View Request</a></p>
    `;
    await sendEmail(email, 'New Design Request Received', `
      <h2>Thank You, ${fullName}!</h2>
      <p>We have received your custom design request. Our team will review it and get back to you soon.</p>
      <p><strong>Request ID:</strong> ${request.id.slice(0, 8).toUpperCase()}</p>
      ${productName ? `<p><strong>Product:</strong> ${productName}</p>` : ''}
      <p>You will receive email updates as your request progresses.</p>
    `);

    // Also try to send to site email
    await sendEmail(process.env.EMAIL_FROM || 'admin@horof.com', `New Design Request: ${fullName}`, adminHtml);
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
}) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('design_requests')
    .select('*, files:design_request_files(count)', { count: 'exact' });

  query = query.order(options?.sort === 'updated' ? 'updated_at' : 'created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
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
// GET SINGLE DESIGN REQUEST (with files, comments, history)
// ============================================================

export async function getDesignRequest(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: request, error: reqErr } = await supabase
    .from('design_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (reqErr || !request) {
    return { request: null, files: [], comments: [], history: [], error: reqErr?.message || 'Not found' };
  }

  const { data: files } = await supabase
    .from('design_request_files')
    .select('*')
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { error: 'Access denied' };

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

  // Notify customer
  try {
    const { createNotification } = await import('./notifications');
    await createNotification(
      `Design Request Updated: ${status.replace(/_/g, ' ')}`,
      `Your design request #${id.slice(0, 8).toUpperCase()} has been updated to "${status.replace(/_/g, ' ')}".${comment ? ` Note: ${comment}` : ''}`,
      'customer'
    );
  } catch {}

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { error: 'Access denied' };

  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file provided' };

  if (file.size > MAX_FILE_SIZE) return { error: 'File exceeds 50MB limit' };

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) return { error: `File type .${ext} not allowed` };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `requests/${requestId}/admin/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error: uploadErr } = await supabase.storage
      .from('design-files')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) return { error: uploadErr.message };

    const { data: { publicUrl } } = supabase.storage.from('design-files').getPublicUrl(filePath);

    const { error: dbErr } = await supabase.from('design_request_files').insert({
      request_id: requestId,
      uploaded_by: user.id,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      file_type: 'design_file',
    });

    if (dbErr) return { error: dbErr.message };

    revalidatePath(`/admin/design-requests/${requestId}`);
    revalidatePath(`/design-requests/${requestId}`);

    return { error: null, url: publicUrl, name: file.name };
  } catch (err: any) {
    return { error: err.message };
  }
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

  const { error } = await supabase.from('design_request_comments').insert({
    request_id: requestId,
    user_id: user.id,
    comment: comment.trim(),
  });

  if (error) return { error: error.message };

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { error: 'Access denied' };

  const { data: request } = await supabase
    .from('design_requests')
    .select('email, full_name')
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

  // Notify customer
  try {
    const { createNotification } = await import('./notifications');
    await createNotification(
      'Design Ready for Approval',
      `Your design for request #${requestId.slice(0, 8).toUpperCase()} is ready. Please review and approve.`,
      'order'
    );
  } catch {}

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

  // Notify admin
  try {
    const { createNotification } = await import('./notifications');
    const actionLabels: Record<string, string> = {
      approved: 'has been APPROVED by the customer',
      revision_requested: 'has REVISION REQUESTED by the customer',
      rejected: 'has been REJECTED by the customer',
    };
    await createNotification(
      `Design ${actionLabels[action] || action}`,
      `Request #${requestId.slice(0, 8).toUpperCase()} ${actionLabels[action] || action}.${comment ? ` Comment: ${comment}` : ''}`,
      'order'
    );
  } catch {}

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { error: 'Access denied' };

  const { data: file } = await supabase
    .from('design_request_files')
    .select('id, request_id')
    .eq('id', fileId)
    .single();

  if (!file) return { error: 'File not found' };

  const { error: delErr } = await supabase
    .from('design_request_files')
    .delete()
    .eq('id', fileId);

  if (delErr) return { error: delErr.message };

  revalidatePath(`/admin/design-requests/${file.request_id}`);

  return { error: null };
}
