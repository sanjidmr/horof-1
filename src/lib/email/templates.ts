/**
 * Email HTML templates for transactional emails.
 * All templates are server-side only (imported by server actions / API routes).
 */

export interface OrderItemTemplate {
  name: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  orderId?: string;
  total: number;
  subtotal?: number;
  deliveryCharge?: number;
  discount?: number;
  items?: OrderItemTemplate[];
  status?: string;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
  paymentMethod?: string;
  customerAddress?: string;
  customerPhone?: string;
  createdAt?: string;
}

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
  admin_approved: 'Order Approved',
  pending_approval: 'Pending Approval',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://horof.com';
}

function formatCurrency(amount: number): string {
  return `৳${(amount || 0).toLocaleString('en-US')}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function buildEmailShell(title: string, content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8faf9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<!--[if !mso]><!--><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}</div><!--<![endif]-->` : ''}
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.04);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1a4731,#2d6a4f);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:0.5px;">${title}</h1>
        <p style="color:#a7f3d0;font-size:13px;margin:8px 0 0;font-weight:500;">Horof — Premium Handcrafted Pieces</p>
      </div>
      <!-- Content -->
      <div style="padding:32px 40px;">
        ${content}
      </div>
      <!-- Footer -->
      <div style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;background:#fafbfc;">
        <p style="color:#94a3b8;font-size:11px;margin:0 0 4px;">Horof — Premium Handcrafted Pieces</p>
        <p style="color:#cbd5e1;font-size:10px;margin:0;">
          <a href="${getSiteUrl()}" style="color:#2d6a4f;text-decoration:none;">Visit our store</a>
          &nbsp;·&nbsp;
          <a href="${getSiteUrl()}/contact" style="color:#2d6a4f;text-decoration:none;">Contact us</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:10px;margin:16px 0 0;">© ${new Date().getFullYear()} Horof. All rights reserved.</p>
  </div>
</body>
</html>`;
}

function buildButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1a4731;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${label}</a>`;
}

function buildOrderItemsTable(items: OrderItemTemplate[]): string {
  if (!items || items.length === 0) return '';
  const rows = items.map((item) => {
    const lineTotal = item.total ?? (item.unit_price * item.quantity);
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:13px;font-weight:600;">${item.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:13px;text-align:right;font-weight:600;">${formatCurrency(lineTotal)}</td>
    </tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Item</th>
        <th style="text-align:center;padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Qty</th>
        <th style="text-align:right;padding:8px 0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildOrderSummary(data: OrderEmailData): string {
  const parts: string[] = [];
  if (data.subtotal !== undefined) {
    parts.push(`<div style="display:flex;justify-content:space-between;padding:4px 0;color:#64748b;font-size:13px;"><span>Subtotal</span><span style="font-weight:600;color:#334155;">${formatCurrency(data.subtotal)}</span></div>`);
  }
  if (data.discount && data.discount > 0) {
    parts.push(`<div style="display:flex;justify-content:space-between;padding:4px 0;color:#16a34a;font-size:13px;"><span>Discount</span><span style="font-weight:600;">-${formatCurrency(data.discount)}</span></div>`);
  }
  if (data.deliveryCharge !== undefined) {
    parts.push(`<div style="display:flex;justify-content:space-between;padding:4px 0;color:#64748b;font-size:13px;"><span>Delivery Charge</span><span style="font-weight:600;color:#334155;">${formatCurrency(data.deliveryCharge)}</span></div>`);
  }
  parts.push(`<div style="display:flex;justify-content:space-between;padding:8px 0 0;border-top:2px solid #e2e8f0;color:#1a4731;font-size:16px;font-weight:800;"><span>Total</span><span>${formatCurrency(data.total)}</span></div>`);
  return `<div style="background:#f8faf9;border-radius:10px;padding:16px 20px;margin:16px 0;">${parts.join('')}</div>`;
}

// ─── Welcome / Registration Email ────────────────────────────────────────────

export function buildWelcomeEmail(params: {
  customerName: string;
  email: string;
}): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${params.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Welcome to <strong>Horof</strong>! We're thrilled to have you join our community of premium handcrafted piece lovers.
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Your account has been created successfully with <strong>${params.email}</strong>. You can now browse our collection, track your orders, and enjoy exclusive member benefits.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/products`, 'Start Shopping')}
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="color:#166534;font-size:13px;margin:0;line-height:1.6;">
        <strong>💡 Tip:</strong> Complete your profile to get personalized recommendations and faster checkout.
      </p>
    </div>
  `;
  return buildEmailShell('Welcome to Horof!', content, 'Your account has been created successfully.');
}

// ─── Password Reset Email ────────────────────────────────────────────────────

export function buildPasswordResetEmail(params: {
  customerName: string;
  resetLink: string;
}): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${params.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(params.resetLink, 'Reset Password')}
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:16px 0 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${params.resetLink}" style="color:#2d6a4f;word-break:break-all;">${params.resetLink}</a>
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="color:#92400e;font-size:12px;margin:0;line-height:1.6;">
        <strong>⚠️ Security note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support.
      </p>
    </div>
  `;
  return buildEmailShell('Reset Your Password', content, 'Reset your Horof account password.');
}

// ─── Order Confirmation Email ────────────────────────────────────────────────

export function buildOrderConfirmationEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 8px;">
      Thank you for your order! Your order has been <strong style="color:#16a34a;">confirmed</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="color:#166534;font-size:14px;margin:0 0 4px;"><strong>Order Number:</strong> ${data.orderNumber}</p>
      ${data.createdAt ? `<p style="color:#166534;font-size:13px;margin:0;"><strong>Placed on:</strong> ${formatDate(data.createdAt)}</p>` : ''}
    </div>
    ${data.items && data.items.length > 0 ? buildOrderItemsTable(data.items) : ''}
    ${buildOrderSummary(data)}
    ${data.paymentMethod ? `<p style="color:#64748b;font-size:13px;margin:8px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>` : ''}
    ${data.customerAddress ? `<p style="color:#64748b;font-size:13px;margin:4px 0;"><strong>Delivery Address:</strong> ${data.customerAddress}</p>` : ''}
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/track-order?order=${data.orderNumber}`, 'Track Your Order')}
    </div>
  `;
  return buildEmailShell('Order Confirmed!', content, `Your order ${data.orderNumber} has been confirmed.`);
}

// ─── Payment Confirmation Email ──────────────────────────────────────────────

export function buildPaymentConfirmationEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      We're pleased to confirm that your payment for order <strong>${data.orderNumber}</strong> has been received successfully.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="color:#166534;font-size:14px;margin:0 0 4px;"><strong>Payment Status:</strong> Paid ✓</p>
      <p style="color:#166534;font-size:13px;margin:0;"><strong>Amount:</strong> ${formatCurrency(data.total)}</p>
    </div>
    ${data.items && data.items.length > 0 ? buildOrderItemsTable(data.items) : ''}
    ${buildOrderSummary(data)}
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/track-order?order=${data.orderNumber}`, 'Track Your Order')}
    </div>
  `;
  return buildEmailShell('Payment Confirmed', content, `Payment received for order ${data.orderNumber}.`);
}

// ─── Order Status Update Email ───────────────────────────────────────────────

export function buildOrderStatusEmail(data: OrderEmailData): string {
  const label = getStatusLabel(data.status || '');
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your order <strong>${data.orderNumber}</strong> has been updated.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
      <p style="color:#166534;font-size:22px;font-weight:800;margin:0;text-transform:uppercase;letter-spacing:1px;">${label}</p>
    </div>
    ${data.note ? `<p style="color:#475569;font-size:13px;line-height:1.5;margin:0 0 16px;padding:12px 16px;background:#f8faf9;border-radius:8px;border-left:3px solid #2d6a4f;">${data.note}</p>` : ''}
    ${data.courierName ? `<p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Courier:</strong> ${data.courierName}</p>` : ''}
    ${data.trackingNumber ? `<p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Tracking:</strong> ${data.trackingNumber}</p>` : ''}
    ${data.estimatedDelivery ? `<p style="color:#475569;font-size:13px;margin:0 0 20px;"><strong>Est. Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/track-order?order=${data.orderNumber}`, 'Track Order')}
    </div>
  `;
  return buildEmailShell(`Order ${label}`, content, `Your order ${data.orderNumber} is now ${label.toLowerCase()}.`);
}

// ─── Shipped Email ───────────────────────────────────────────────────────────

export function buildShippedEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Great news! Your order <strong>${data.orderNumber}</strong> has been <strong style="color:#16a34a;">shipped</strong> and is on its way to you! 🚚
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;">
      ${data.courierName ? `<p style="color:#166534;font-size:13px;margin:0 0 6px;"><strong>Courier:</strong> ${data.courierName}</p>` : ''}
      ${data.trackingNumber ? `<p style="color:#166534;font-size:13px;margin:0 0 6px;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
      ${data.estimatedDelivery ? `<p style="color:#166534;font-size:13px;margin:0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
    </div>
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/track-order?order=${data.orderNumber}`, 'Track Your Package')}
    </div>
  `;
  return buildEmailShell('Your Order Has Been Shipped!', content, `Order ${data.orderNumber} is on its way!`);
}

// ─── Delivered Email ─────────────────────────────────────────────────────────

export function buildDeliveredEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your order <strong>${data.orderNumber}</strong> has been <strong style="color:#16a34a;">delivered</strong>! 🎉
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:center;">
      <p style="color:#166534;font-size:18px;font-weight:800;margin:0;">Thank you for shopping with Horof!</p>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      We hope you love your new handcrafted pieces. If you have any questions or need assistance, our support team is always here to help.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/products`, 'Shop More')}
    </div>
  `;
  return buildEmailShell('Order Delivered!', content, `Order ${data.orderNumber} has been delivered.`);
}

// ─── Cancelled Email ─────────────────────────────────────────────────────────

export function buildCancelledEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>${data.customerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your order <strong>${data.orderNumber}</strong> has been <strong style="color:#dc2626;">cancelled</strong>.
    </p>
    ${data.note ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="color:#991b1b;font-size:13px;margin:0;line-height:1.6;"><strong>Reason:</strong> ${data.note}</p>
    </div>` : ''}
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      If you have any questions about this cancellation, please don't hesitate to contact our support team.
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/products`, 'Continue Shopping')}
    </div>
  `;
  return buildEmailShell('Order Cancelled', content, `Order ${data.orderNumber} has been cancelled.`);
}

// ─── Admin New Order Notification ────────────────────────────────────────────

export function buildAdminNewOrderEmail(data: OrderEmailData): string {
  const content = `
    <p style="color:#334155;font-size:15px;margin:0 0 16px;line-height:1.6;">Hi <strong>Admin</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      A new order has been placed on the store.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="color:#166534;font-size:14px;margin:0 0 4px;"><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p style="color:#166534;font-size:13px;margin:0 0 4px;"><strong>Customer:</strong> ${data.customerName}</p>
      ${data.customerPhone ? `<p style="color:#166534;font-size:13px;margin:0 0 4px;"><strong>Phone:</strong> ${data.customerPhone}</p>` : ''}
      ${data.customerAddress ? `<p style="color:#166534;font-size:13px;margin:0 0 4px;"><strong>Address:</strong> ${data.customerAddress}</p>` : ''}
      <p style="color:#166534;font-size:13px;margin:0;"><strong>Total:</strong> ${formatCurrency(data.total)}</p>
    </div>
    ${data.items && data.items.length > 0 ? buildOrderItemsTable(data.items) : ''}
    <div style="text-align:center;margin:24px 0;">
      ${buildButton(`${getSiteUrl()}/admin/orders`, 'View Order in Admin')}
    </div>
  `;
  return buildEmailShell('New Order Received', content, `New order ${data.orderNumber} from ${data.customerName}.`);
}