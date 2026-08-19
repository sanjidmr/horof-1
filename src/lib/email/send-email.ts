'use server';

/**
 * Unified transactional email sender.
 * 
 * This module provides typed, safe email-sending functions for all
 * transactional email types. It uses the existing /api/email/send route
 * (which respects the settings-center provider configuration) with a
 * direct Brevo fallback.
 * 
 * All functions are non-throwing — email failures are logged and never
 * break the calling operation (order, payment, auth, etc.).
 */

import {
  sendTransactionalEmail,
  type BrevoEmailOptions,
  type BrevoSendResult,
} from './brevo-service';

import {
  buildWelcomeEmail,
  buildPasswordResetEmail,
  buildOrderConfirmationEmail,
  buildPaymentConfirmationEmail,
  buildOrderStatusEmail,
  buildShippedEmail,
  buildDeliveredEmail,
  buildCancelledEmail,
  buildAdminNewOrderEmail,
  type OrderEmailData,
} from './templates';
import { loadEmailSettingsForGate, loadNotificationSettings } from '@/lib/actions/notifications';

/**
 * Check whether transactional emails are globally enabled.
 * Respects the Settings Center toggles.
 */
async function isEmailEnabled(): Promise<boolean> {
  try {
    const notifications = await loadNotificationSettings();
    const email = await loadEmailSettingsForGate();
    return notifications.email_enabled !== false && email.order_email_enabled !== false;
  } catch (err) {
    console.error('[Email] Failed to load settings, sending anyway:', err);
    return true;
  }
}

/**
 * Send a welcome email after registration.
 * Non-throwing — never breaks the signup flow.
 */
export async function sendWelcomeEmail(params: {
  to: string;
  customerName: string;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildWelcomeEmail({ customerName: params.customerName, email: params.to });
    return await sendTransactionalEmail({
      to: params.to,
      subject: 'Welcome to Horof! 🎉',
      html,
      tags: ['welcome', 'registration'],
      metadata: { emailType: 'welcome' },
    });
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send a password reset email.
 * Non-throwing — never breaks the reset flow.
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  customerName: string;
  resetLink: string;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildPasswordResetEmail({
      customerName: params.customerName,
      resetLink: params.resetLink,
    });
    return await sendTransactionalEmail({
      to: params.to,
      subject: 'Reset Your Horof Password',
      html,
      tags: ['password-reset'],
      metadata: { emailType: 'password-reset' },
    });
  } catch (err) {
    console.error('[Email] Failed to send password reset email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send an order confirmation email to the customer.
 * Non-throwing — never breaks the order flow.
 */
export async function sendOrderConfirmationEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildOrderConfirmationEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Order Confirmed — ${params.data.orderNumber}`,
      html,
      tags: ['order-confirmation'],
      metadata: { emailType: 'order-confirmation', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send order confirmation email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send a payment confirmation email to the customer.
 * Non-throwing — never breaks the payment flow.
 */
export async function sendPaymentConfirmationEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildPaymentConfirmationEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Payment Confirmed — ${params.data.orderNumber}`,
      html,
      tags: ['payment-confirmation'],
      metadata: { emailType: 'payment-confirmation', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send payment confirmation email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send an order status update email to the customer.
 * Non-throwing — never breaks the status update flow.
 */
export async function sendOrderStatusUpdateEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildOrderStatusEmail(params.data);
    const label = (params.data.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Order ${label} — ${params.data.orderNumber}`,
      html,
      tags: ['order-status'],
      metadata: { emailType: 'order-status', orderNumber: params.data.orderNumber, status: params.data.status || '' },
    });
  } catch (err) {
    console.error('[Email] Failed to send order status email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send a shipped email to the customer.
 * Non-throwing — never breaks the shipping flow.
 */
export async function sendShippedEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildShippedEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Your Order Has Been Shipped! 🚚 — ${params.data.orderNumber}`,
      html,
      tags: ['shipped'],
      metadata: { emailType: 'shipped', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send shipped email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send a delivered email to the customer.
 * Non-throwing — never breaks the delivery flow.
 */
export async function sendDeliveredEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildDeliveredEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Your Order Has Been Delivered! 🎉 — ${params.data.orderNumber}`,
      html,
      tags: ['delivered'],
      metadata: { emailType: 'delivered', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send delivered email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send a cancelled email to the customer.
 * Non-throwing — never breaks the cancellation flow.
 */
export async function sendCancelledEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildCancelledEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `Order Cancelled — ${params.data.orderNumber}`,
      html,
      tags: ['cancelled'],
      metadata: { emailType: 'cancelled', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send cancelled email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send an admin notification when a new order is created.
 * Non-throwing — never breaks the order creation flow.
 */
export async function sendAdminNewOrderEmail(params: {
  to: string;
  data: OrderEmailData;
}): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    const html = buildAdminNewOrderEmail(params.data);
    return await sendTransactionalEmail({
      to: params.to,
      subject: `🛒 New Order Received — ${params.data.orderNumber}`,
      html,
      tags: ['admin-new-order'],
      metadata: { emailType: 'admin-new-order', orderNumber: params.data.orderNumber },
    });
  } catch (err) {
    console.error('[Email] Failed to send admin new order email:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Generic low-level send for any custom email.
 * Non-throwing.
 */
export async function sendCustomEmail(options: BrevoEmailOptions): Promise<BrevoSendResult> {
  try {
    if (!(await isEmailEnabled())) return { ok: true, skipped: true };
    return await sendTransactionalEmail(options);
  } catch (err) {
    console.error('[Email] Failed to send custom email:', err);
    return { ok: false, error: String(err) };
  }
}
