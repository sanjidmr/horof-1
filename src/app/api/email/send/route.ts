import { NextRequest, NextResponse } from 'next/server';

/** Lightweight email send endpoint.
 *  Integrates with Resend, Brevo, SendGrid, SES, or Mailchimp.
 *  Currently logs to console. Configure env vars and provider logic for production.
 */
export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, provider } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Email] Sending via ${provider || 'resend'} to ${to}: ${subject.substring(0, 60)}`);

    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'noreply@horof.com',
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

    if (process.env.BREVO_API_KEY) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: process.env.EMAIL_FROM || 'noreply@horof.com', name: 'Horof' },
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

    if (process.env.SENDGRID_API_KEY) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_FROM || 'noreply@horof.com' },
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

    return NextResponse.json({
      ok: true,
      note: 'No email provider configured. Email logged to console. Set RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY in env.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
