'use server';

import { loadEmailSettingsForGate, loadNotificationSettings } from './notifications';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  ready_for_pickup: 'Ready for Pickup',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
  warehouse_assigned: 'Warehouse Assigned',
  warehouse_reviewing: 'Warehouse Reviewing',
  order_confirmed: 'Order Confirmed',
  ready_for_dispatch: 'Ready for Dispatch',
};

function buildOrderStatusEmail(params: {
  customerName: string;
  orderNumber: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
}): string {
  const label = STATUS_LABELS[params.status] || params.status.replace(/_/g, ' ');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a4731,#2d6a4f);padding:28px 32px;">
      <h1 style="color:#fff;font-size:20px;margin:0;">Order Update</h1>
      <p style="color:#a7f3d0;font-size:13px;margin:6px 0 0;">${params.orderNumber}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi ${params.customerName},</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your order <strong>${params.orderNumber}</strong> has been updated.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:0 0 20px;">
        <p style="color:#166534;font-size:22px;font-weight:800;margin:0;text-transform:uppercase;letter-spacing:1px;">${label}</p>
      </div>
      ${params.note ? `<p style="color:#475569;font-size:13px;line-height:1.5;margin:0 0 16px;padding:12px 16px;background:#f8faf9;border-radius:8px;border-left:3px solid #2d6a4f;">${params.note}</p>` : ''}
      ${params.courierName ? `<p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Courier:</strong> ${params.courierName}</p>` : ''}
      ${params.trackingNumber ? `<p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Tracking:</strong> ${params.trackingNumber}</p>` : ''}
      ${params.estimatedDelivery ? `<p style="color:#475569;font-size:13px;margin:0 0 20px;"><strong>Est. Delivery:</strong> ${params.estimatedDelivery}</p>` : ''}
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://horof.com'}/track-order?order=${params.orderNumber}" style="display:inline-block;background:#1a4731;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.5px;">Track Order</a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">Horof — Premium Handcrafted Pieces</p>
    </div>
  </div>
</body>
</html>`;
}

async function isOrderEmailEnabled(): Promise<boolean> {
  try {
    const notifications = await loadNotificationSettings();
    const email = await loadEmailSettingsForGate();
    return notifications.email_enabled !== false &&
      notifications.order_update_enabled !== false &&
      email.order_email_enabled !== false;
  } catch (err) {
    console.error('[Email] Failed to load settings, sending anyway:', err);
    return true;
  }
}

export async function sendOrderStatusEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
}) {
  try {
    if (!(await isOrderEmailEnabled())) {
      return { ok: true, skipped: true };
    }

    const html = buildOrderStatusEmail(params);
    const label = STATUS_LABELS[params.status] || params.status.replace(/_/g, ' ');

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.to,
        subject: `Order ${label} — ${params.orderNumber}`,
        html,
      }),
    });

    const result = await res.json();
    if (!result.ok) {
      console.error('[Email] Failed to send order status email:', result.error);
    }
    return result;
  } catch (err) {
    console.error('[Email] Error sending order status email:', err);
    return { ok: false, error: String(err) };
  }
}
