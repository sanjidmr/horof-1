'use server';

import {
  sendOrderStatusUpdateEmail,
  sendShippedEmail,
  sendDeliveredEmail,
  sendCancelledEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendAdminNewOrderEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from '@/lib/email/send-email';
import type { BrevoSendResult } from '@/lib/email/brevo-service';
import type { OrderEmailData } from '@/lib/email/templates';

/**
 * Backward-compatible wrapper for the existing sendOrderStatusEmail calls.
 * Delegates to the unified email sender with the new templates.
 * Non-throwing — email failures never break the calling operation.
 */
export async function sendOrderStatusEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
}): Promise<BrevoSendResult> {
  const data: OrderEmailData = {
    customerName: params.customerName,
    orderNumber: params.orderNumber,
    total: 0,
    status: params.status,
    note: params.note,
    trackingNumber: params.trackingNumber,
    courierName: params.courierName,
    estimatedDelivery: params.estimatedDelivery,
  };

  // Use specialized templates for shipped/delivered/cancelled
  switch (params.status) {
    case 'shipped':
      return sendShippedEmail({ to: params.to, data });
    case 'delivered':
      return sendDeliveredEmail({ to: params.to, data });
    case 'cancelled':
      return sendCancelledEmail({ to: params.to, data });
    default:
      return sendOrderStatusUpdateEmail({ to: params.to, data });
  }
}

// Re-export the new email functions for use in other modules
export {
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendAdminNewOrderEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
