/**
 * Secure server-side Brevo transactional email service.
 * 
 * IMPORTANT: This module is server-only. It must never be imported
 * from client components. The BREVO_API_KEY is only accessible
 * server-side via process.env.
 * 
 * Uses the Brevo v3 SMTP API directly (no SDK dependency needed).
 * All failures are caught and logged — they never throw, so email
 * failures can never break a successful order/payment operation.
 */

export interface BrevoEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface BrevoSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Get Brevo configuration from environment variables.
 * Falls back to the settings-center values if env vars are not set.
 */
export function getBrevoConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@horof.com',
    senderName: process.env.BREVO_SENDER_NAME || 'Horof',
  };
}

/**
 * Check if Brevo is configured.
 */
export function isBrevoConfigured(): boolean {
  const { apiKey } = getBrevoConfig();
  return Boolean(apiKey);
}

/**
 * Send a transactional email via Brevo.
 * 
 * This function NEVER throws. It always returns a result object.
 * Email failures are logged but never propagated, ensuring that
 * a failed email can never cancel or break a successful order/payment.
 */
export async function sendBrevoEmail(options: BrevoEmailOptions): Promise<BrevoSendResult> {
  try {
    const { apiKey, senderEmail, senderName } = getBrevoConfig();

    if (!apiKey) {
      console.warn('[Brevo] BREVO_API_KEY not configured. Email not sent.');
      return { ok: false, skipped: true, error: 'BREVO_API_KEY not configured' };
    }

    if (!options.to || !options.subject || !options.html) {
      console.warn('[Brevo] Missing required email fields (to, subject, html).');
      return { ok: false, error: 'Missing required email fields' };
    }

    const fromEmail = options.fromEmail || senderEmail;
    const fromName = options.fromName || senderName;

    const payload: Record<string, unknown> = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    };

    if (options.replyTo) {
      payload.replyTo = { email: options.replyTo };
    }

    if (options.tags && options.tags.length > 0) {
      payload.tags = options.tags;
    }

    if (options.metadata) {
      payload.headers = {
        'X-Email-Type': options.metadata.emailType || 'transactional',
        ...Object.entries(options.metadata).reduce((acc, [k, v]) => {
          acc[`X-${k}`] = v;
          return acc;
        }, {} as Record<string, string>),
      };
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Brevo] API error (${response.status}):`, errorText);
      return { ok: false, error: `Brevo API error: ${response.status} ${errorText}` };
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[Brevo] Email sent to ${options.to}: ${options.subject.substring(0, 60)}`);
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error('[Brevo] Unexpected error sending email:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send an email using the existing /api/email/send route.
 * This is the preferred path because it respects the settings-center
 * provider configuration (custom SMTP, Resend, Brevo, SendGrid).
 * 
 * Falls back to direct Brevo if the API route is unavailable.
 */
export async function sendTransactionalEmail(options: BrevoEmailOptions): Promise<BrevoSendResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {}),
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        from: {
          name: options.fromName,
          email: options.fromEmail,
        },
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      }),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok || !result.ok) {
      console.warn('[Email] API route failed, falling back to direct Brevo:', result.error || res.status);
      // Fall back to direct Brevo
      return sendBrevoEmail(options);
    }

    return { ok: true, messageId: result.id };
  } catch (err) {
    console.warn('[Email] API route unavailable, falling back to direct Brevo:', err);
    // Fall back to direct Brevo
    return sendBrevoEmail(options);
  }
}