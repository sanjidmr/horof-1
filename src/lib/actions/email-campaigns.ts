'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CampaignStatus, CampaignType } from '@/types/database';

export type EmailCampaignRow = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  sender_name: string | null;
  sender_email: string | null;
  reply_to: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  template_id: string | null;
  html_body: string;
  plain_text: string | null;
  dynamic_variables: Record<string, any>;
  product_ids: string[];
  audience: Record<string, any>;
  segment_type: string;
  segment_filter: Record<string, any>;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  complaint_count: number;
  unsubscribe_count: number;
  automation_trigger: string | null;
  automation_delay_minutes: number | null;
  provider: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listEmailCampaigns(): Promise<EmailCampaignRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.view');
  } catch {
    return [];
  }
  const { data } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as EmailCampaignRow[]) || [];
}

export async function saveEmailCampaign(
  c: Partial<EmailCampaignRow> & { name: string; subject: string; html_body: string }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { ...c, created_by: user?.id || c.created_by };
  if (payload.id) {
    const { error } = await supabase
      .from('email_campaigns')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', payload.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/marketing/email-campaigns');
    return { ok: true, id: payload.id };
  }
  const { id, ...insert } = payload;
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert(insert)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/email-campaigns');
  return { ok: true, id: data.id };
}

export async function deleteEmailCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.delete');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/email-campaigns');
  return { ok: true };
}

export async function duplicateEmailCampaign(id: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { data: original } = await supabase.from('email_campaigns').select('*').eq('id', id).single();
  if (!original) return { ok: false, error: 'Campaign not found' };
  const { id: _id, created_at, updated_at, sent_at, status, open_count, click_count, bounce_count, complaint_count, unsubscribe_count, delivered_count, ...rest } = original;
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({ ...rest, name: `${rest.name} (Copy)`, status: 'draft' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/email-campaigns');
  return { ok: true, id: data.id };
}

export async function toggleEmailCampaignStatus(id: string, status: CampaignStatus): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.manage');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const update: any = { status, updated_at: new Date().toISOString() };
  if (status === 'sent') update.sent_at = new Date().toISOString();
  const { error } = await supabase.from('email_campaigns').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing/email-campaigns');
  return { ok: true };
}

export async function getEmailCampaignStats(id: string): Promise<{
  recipient_count: number; delivered_count: number; open_count: number; click_count: number;
  bounce_count: number; complaint_count: number; unsubscribe_count: number;
  open_rate: number; click_rate: number; delivery_rate: number;
} | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.view');
  } catch {
    return null;
  }
  const { data } = await supabase.from('email_campaigns').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const rc = data.recipient_count || 1;
  return {
    recipient_count: data.recipient_count, delivered_count: data.delivered_count, open_count: data.open_count,
    click_count: data.click_count, bounce_count: data.bounce_count, complaint_count: data.complaint_count,
    unsubscribe_count: data.unsubscribe_count,
    open_rate: Math.round((data.open_count / rc) * 100),
    click_rate: Math.round((data.click_count / rc) * 100),
    delivery_rate: Math.round((data.delivered_count / rc) * 100),
  };
}

export async function sendTestCampaign(id: string, testEmail: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Service unavailable' };
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.edit');
  } catch {
    return { ok: false, error: 'Permission denied' };
  }
  const { data: campaign } = await supabase.from('email_campaigns').select('*').eq('id', id).single();
  if (!campaign) return { ok: false, error: 'Campaign not found' };
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}) },
      body: JSON.stringify({
        to: testEmail,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.html_body.replace(/\{\{customer_name\}\}/g, 'Test User'),
        provider: campaign.provider || 'resend',
      }),
    });
    if (!res.ok) return { ok: false, error: 'Failed to send test email' };
    await supabase.from('email_logs').insert({
      campaign_id: id, recipient_email: testEmail, subject: `[TEST] ${campaign.subject}`, status: 'sent',
      sent_at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function getAudienceCount(segmentType: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;
  const { requirePermission } = await import('./security');
  try {
    await requirePermission('offer_campaign.view');
  } catch {
    return 0;
  }
  if (segmentType === 'all' || segmentType === 'customers') {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer');
    return count || 0;
  }
  if (segmentType === 'customers') {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer');
    return count || 0;
  }
  return 0;
}
