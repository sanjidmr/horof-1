'use server';

/**
 * Password reset via Brevo.
 *
 * Generates a Supabase recovery link server-side (admin API) and sends it
 * through the Brevo transactional email pipeline. Falls back to Supabase's
 * native reset email if Brevo is not configured or link generation fails.
 * Non-throwing for the caller — a reset email failure never reveals whether
 * an account exists (enumeration safety) and never breaks the page flow.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/lib/email/send-email';
import { isBrevoConfigured } from '@/lib/email/brevo-service';

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
    return { success: true };
  }

  const { isPasswordResetEnabled } = await import('./app-settings');
  let enabled = true;
  try {
    enabled = await isPasswordResetEnabled();
  } catch {
    enabled = true;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectTo = `${siteUrl}/reset-password`;

  // 1. Brevo path — generate a recovery link and send it via Brevo.
  if (isBrevoConfigured()) {
    try {
      const admin = createSupabaseAdminClient();
      if (admin) {
        const { data, error } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: cleanEmail,
          options: { redirectTo },
        });

        if (!error && data?.properties?.action_link) {
          const link = data.properties.action_link as string;
          const customerName =
            data.user?.user_metadata?.full_name ||
            data.user?.user_metadata?.first_name ||
            cleanEmail.split('@')[0] ||
            'Customer';

          const result = await sendPasswordResetEmail({
            to: cleanEmail,
            customerName,
            resetLink: link,
          });

          // Never reveal whether the account exists.
          if (result.ok || result.skipped) return { success: true };
          console.warn('[PasswordReset] Brevo send failed, falling back to Supabase email.');
        }
      }
    } catch (err) {
      console.warn('[PasswordReset] Brevo reset failed, falling back to Supabase email:', err);
    }
  }

  // 2. Fallback — Supabase native reset email (respects the settings toggle).
  if (!enabled) {
    // If password reset is globally disabled, do nothing silently.
    return { success: true };
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  } catch (err) {
    console.error('[PasswordReset] Fallback reset failed:', err);
  }

  // Always report success — do not leak whether the account exists.
  return { success: true };
}
