import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEFAULT_EMAIL, type EmailSettings } from '@/lib/settings/types';

/**
 * Gate the email relay so anonymous callers can't burn the store's SMTP /
 * Resend / Brevo / SendGrid credentials to spam arbitrary recipients.
 * Two trusted paths:
 *   1. Server-side callers pass x-internal-key == INTERNAL_API_KEY.
 *   2. Browser callers carry a Supabase session holding
 *      offer_campaign.edit (via has_permission RPC).
 * Everything else is rejected fail-closed.
 */
async function assertAllowed(req: NextRequest): Promise<string | null> {
  const internalKey = process.env.INTERNAL_API_KEY;
  const keyHeader = req.headers.get('x-internal-key');
  if (internalKey && keyHeader === internalKey) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return 'Server configuration error';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'Unauthorized';
  const { data: allowed } = await supabase.rpc('has_permission', {
    p_code: 'offer_campaign.edit',
  });
  if (allowed !== true) return 'Forbidden';
  return null;
}

async function loadEmailSettings(): Promise<EmailSettings> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return DEFAULT_EMAIL;
    const { data } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'email')
      .maybeSingle();
    return { ...DEFAULT_EMAIL, ...((data?.value as Partial<EmailSettings>) || {}) };
  } catch {
    return DEFAULT_EMAIL;
  }
}

/** Send via a custom SMTP server using nodemailer. */
async function sendCustomSmtp(settings: EmailSettings, opts: {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
}) {
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure,
    auth: settings.smtp_user && settings.smtp_pass
      ? { user: settings.smtp_user, pass: settings.smtp_pass }
      : undefined,
  });
  await transporter.sendMail({
    from: { name: opts.fromName, address: opts.fromEmail },
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function POST(req: NextRequest) {
  try {
    const guardError = await assertAllowed(req);
    if (guardError) {
      return NextResponse.json({ error: guardError }, { status: guardError === 'Unauthorized' ? 401 : 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { to, subject, html, provider } = body || {};
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await loadEmailSettings();
    const senderName = body?.from?.name || settings.sender_name || 'Horof';
    const senderEmail = body?.from?.email || settings.sender_email || process.env.EMAIL_FROM || 'noreply@horof.com';

    // 1. Custom SMTP configured in Settings Center
    const wantCustom = settings.smtp_enabled && (provider === 'custom' || !provider);
    if (wantCustom && settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
      try {
        await sendCustomSmtp(settings, { to, subject, html, fromName: senderName, fromEmail: senderEmail });
        return NextResponse.json({ ok: true, provider: 'custom-smtp' });
      } catch (err: any) {
        return NextResponse.json({ error: `SMTP error: ${err.message}` }, { status: 500 });
      }
    }

    console.log(`[Email] Sending via ${provider || 'resend'} to ${to}: ${subject.substring(0, 60)}`);

    // 2. Resend
    if (process.env.RESEND_API_KEY && (provider === 'resend' || !provider)) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Resend error: ${err}` }, { status: 500 });
      }
      const data = await res.json();
      return NextResponse.json({ ok: true, id: data.id });
    }

    // 3. Brevo
    if (process.env.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Brevo error: ${err}` }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 4. SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: senderEmail, name: senderName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `SendGrid error: ${err}` }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // 5. No provider configured — log for the console mailer
    console.log(`[Email][logged-only] to=${to} subject=${subject}`);
    return NextResponse.json({
      ok: true,
      note: 'No email provider configured. Email logged to console. Set custom SMTP in Settings Center or configure RESEND_API_KEY/BREVO_API_KEY/SENDGRID_API_KEY in env.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
