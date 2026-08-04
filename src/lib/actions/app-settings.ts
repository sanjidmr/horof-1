'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/actions/security';
import {
  SETTINGS_KEYS,
  DEFAULT_GENERAL,
  DEFAULT_SHIPPING,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_EMAIL,
  DEFAULT_SOCIAL,
  type AppSettings,
  type GeneralSettings,
  type ShippingSettings,
  type NotificationSettings,
  type EmailSettings,
  type SocialSettings,
} from '@/lib/settings/types';
import {
  generalSettingsSchema,
  shippingSettingsSchema,
  notificationSettingsSchema,
  emailSettingsSchema,
  socialSettingsSchema,
  passwordChangeSchema,
} from '@/lib/settings/validation';
import { getCompanyInfo } from '@/lib/invoice/company';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { mergeSettingsWithDefaults } from '@/lib/utils/safe-json';
import { isSettingsAdminRole } from '@/lib/auth/roles';

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !isSettingsAdminRole(profile.role)) throw new Error('Super admin access required');
  return { supabase, user, profile };
}

function mergeWithDefaults<T extends Record<string, unknown>>(stored: unknown, defaults: T): T {
  return mergeSettingsWithDefaults<T>(stored, defaults);
}

// ============================================================
// READ
// ============================================================

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      general: { ...DEFAULT_GENERAL },
      shipping: { ...DEFAULT_SHIPPING },
      notifications: { ...DEFAULT_NOTIFICATIONS },
      email: { ...DEFAULT_EMAIL },
      social: { ...DEFAULT_SOCIAL },
    };
  }

  const keys = Object.values(SETTINGS_KEYS);
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', keys);

  const map: Record<string, unknown> = {};
  (data || []).forEach((row: any) => { map[row.key] = row.value; });

  return {
    general: mergeWithDefaults<GeneralSettings>(map.general, DEFAULT_GENERAL),
    shipping: mergeWithDefaults<ShippingSettings>(map.shipping, DEFAULT_SHIPPING),
    notifications: mergeWithDefaults<NotificationSettings>(map.notifications, DEFAULT_NOTIFICATIONS),
    email: mergeWithDefaults<EmailSettings>(map.email, DEFAULT_EMAIL),
    social: mergeWithDefaults<SocialSettings>(map.social, DEFAULT_SOCIAL),
  };
}

/**
 * Public-safe settings used by the storefront (Footer, Navbar, checkout, SEO).
 * Never exposes notifications or email/SMTP config.
 */
export async function getPublicSettings() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      general: { ...DEFAULT_GENERAL },
      shipping: { ...DEFAULT_SHIPPING },
      social: { ...DEFAULT_SOCIAL },
    };
  }

  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['general', 'shipping', 'social']);

  const map: Record<string, unknown> = {};
  (data || []).forEach((row: any) => { map[row.key] = row.value; });

  return {
    general: mergeWithDefaults<GeneralSettings>(map.general, DEFAULT_GENERAL),
    shipping: mergeWithDefaults<ShippingSettings>(map.shipping, DEFAULT_SHIPPING),
    social: mergeWithDefaults<SocialSettings>(map.social, DEFAULT_SOCIAL),
  };
}

/**
 * Whether password reset emails are enabled (Email Settings toggle).
 * Read via service-role since the 'email' key is admin-only under RLS.
 */
export async function isPasswordResetEnabled(): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return true;
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'email')
      .maybeSingle();
    const email = mergeSettingsWithDefaults<EmailSettings>(data?.value, { ...DEFAULT_EMAIL });
    return email.password_reset_enabled !== false;
  } catch {
    return true;
  }
}

// ============================================================
// SAVE (per group, validated, audited)
// ============================================================

async function persistSettings(key: string, value: unknown, description: string) {
  const { supabase, user } = await requireAdmin();

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    await logAudit('settings_save_error', 'site_settings', key, `${description} — ${error.message}`, { key, error: error.message }, 'error');
    throw new Error(error.message);
  }

  await logAudit('settings_save', 'site_settings', key, description, { key });
  revalidatePath('/admin/settings');
  revalidatePath('/');
  revalidatePath('/admin/marketing');
  return { ok: true, user };
}

export async function saveGeneralSettings(values: GeneralSettings) {
  const parsed = generalSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid general settings' };
  }
  try {
    await persistSettings(SETTINGS_KEYS.GENERAL, parsed.data, 'Updated general settings');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function saveShippingSettings(values: ShippingSettings) {
  const parsed = shippingSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid shipping settings' };
  }
  try {
    await persistSettings(SETTINGS_KEYS.SHIPPING, parsed.data, 'Updated shipping settings');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function saveNotificationSettings(values: NotificationSettings) {
  const parsed = notificationSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid notification settings' };
  }
  try {
    await persistSettings(SETTINGS_KEYS.NOTIFICATIONS, parsed.data, 'Updated notification settings');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function saveEmailSettings(values: EmailSettings) {
  const parsed = emailSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid email settings' };
  }
  try {
    await persistSettings(SETTINGS_KEYS.EMAIL, parsed.data, 'Updated email settings');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function saveSocialSettings(values: SocialSettings) {
  const parsed = socialSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid social settings' };
  }
  try {
    await persistSettings(SETTINGS_KEYS.SOCIAL, parsed.data, 'Updated social settings');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// SUPER ADMIN SECURITY — CHANGE PASSWORD
// ============================================================

export async function changeSuperAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid password input' };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !isSettingsAdminRole(profile.role)) {
    return { ok: false, error: 'Super admin access required' };
  }

  // Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email || '',
    password: input.currentPassword,
  });
  if (signInError) {
    await logAudit('password_change_failed', 'profiles', user.id, 'Current password verification failed', { reason: 'invalid_current_password' }, 'warning');
    return { ok: false, error: 'Current password is incorrect' };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: input.newPassword });
  if (updateError) {
    await logAudit('password_change_failed', 'profiles', user.id, 'Password update failed', { error: updateError.message }, 'error');
    return { ok: false, error: updateError.message };
  }

  // Revoke other sessions (keep current one)
  await supabase.auth.signOut({ scope: 'others' });

  await logAudit('password_changed', 'profiles', user.id, 'Super admin changed their password', {}, 'info');
  return { ok: true };
}

export async function testSmtpConnection() {
  const settings = await getAppSettings();
  const email = settings.email;
  if (!email.smtp_enabled) {
    return { ok: false, error: 'SMTP is not enabled. Enable it first.' };
  }

  try {
    if (email.smtp_provider === 'custom' && email.smtp_host) {
      const { createTransport } = await import('nodemailer');
      const transporter = createTransport({
        host: email.smtp_host,
        port: email.smtp_port,
        secure: email.smtp_secure,
        auth: email.smtp_user ? { user: email.smtp_user, pass: email.smtp_pass } : undefined,
      });
      await transporter.verify();
      await logAudit('smtp_test_ok', 'site_settings', 'email', 'SMTP connection verified');
      return { ok: true };
    }

    if (email.smtp_provider === 'resend' && process.env.RESEND_API_KEY) {
      return { ok: true, note: 'Resend API key present — connection configured via env.' };
    }
    if (email.smtp_provider === 'brevo' && process.env.BREVO_API_KEY) {
      return { ok: true, note: 'Brevo API key present — connection configured via env.' };
    }
    if (email.smtp_provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      return { ok: true, note: 'SendGrid API key present — connection configured via env.' };
    }

    return { ok: false, error: `No credentials configured for provider "${email.smtp_provider}". Add the API key to environment variables or configure custom SMTP.` };
  } catch (e: any) {
    await logAudit('smtp_test_failed', 'site_settings', 'email', `SMTP connection failed — ${e.message}`, { error: e.message }, 'error');
    return { ok: false, error: e.message };
  }
}

export async function sendTestEmailAction(to: string) {
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { ok: false, error: 'Enter a valid test recipient email' };
  }
  const settings = await getAppSettings();
  const email = settings.email;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: `Test email from ${email.sender_name || 'Horof'}`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px">
          <h2 style="color:#1a4731">Test email — everything works!</h2>
          <p>This is a test email sent from the Horof Settings Center.</p>
          <p style="color:#888">Sender: ${email.sender_name} &lt;${email.sender_email}&gt;</p>
        </div>`,
        provider: email.smtp_enabled ? email.smtp_provider : undefined,
        from: email.smtp_enabled ? { name: email.sender_name, email: email.sender_email } : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send test email' };
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Builds company info for invoices/orders using DB settings, falling back
 * to the static defaults in src/lib/invoice/company.ts.
 */
export async function getSettingsCompanyInfo() {
  const pub = await getPublicSettings();
  const company = getCompanyInfo();
  const g = pub.general;
  return {
    ...company,
    brand: g.website_name?.toUpperCase() || company.brand,
    address: g.business_address || company.address,
    email: g.support_email || company.email,
    phone: g.phone || company.phone,
    logoUrl: g.company_logo || company.logoUrl,
  };
}

// ============================================================
// LEGAL PAGES
// ============================================================

/**
 * Revalidates the public legal pages so saved content appears instantly.
 * Call from the client after writing to legal_pages.
 */
export async function revalidateLegalPages(pageType?: string) {
  const { supabase } = await requireAdmin();
  revalidatePath('/terms');
  revalidatePath('/privacy-policy');
  await logAudit('settings_save', 'legal_pages', pageType || 'all', `Legal page updated (${pageType || 'all'})`);
  return { ok: true };
}
