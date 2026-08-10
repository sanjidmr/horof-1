/**
 * Invoice formatting helpers. Pure functions — safe for both server and client.
 */

/** Escape a string for safe HTML embedding. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Format a numeric amount as BDT with the ৳ symbol. */
export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value ?? 0);
  if (!Number.isFinite(n)) return '৳0';
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `৳${formatted}`;
}

/** Format a date string into a long human-readable date. */
export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

/** Map order status values to friendly labels. */
export function orderStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    packed: 'Packed',
    ready_for_pickup: 'Ready for Pickup',
    admin_approved: 'Admin Approved',
    warehouse_assigned: 'Warehouse Assigned',
    warehouse_reviewing: 'Warehouse Reviewing',
    warehouse_rejected: 'Warehouse Rejected',
    waiting_for_warehouse: 'Awaiting Warehouse',
    accepted: 'Warehouse Accepted',
    preparing: 'Preparing',
    ready_for_dispatch: 'Ready for Dispatch',
    order_confirmed: 'Order Confirmed',
    shipped: 'Shipped',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    returned: 'Returned',
    refunded: 'Refunded',
  };
  const key = String(status ?? '').toLowerCase();
  return map[key] || (key ? key.replace(/_/g, ' ') : '—');
}

/** Map payment status values to friendly labels. */
export function paymentStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    unpaid: 'Unpaid',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    partial: 'Partially Paid',
    cod: 'Cash on Delivery',
  };
  const key = String(status ?? '').toLowerCase();
  return map[key] || (key ? key.replace(/_/g, ' ') : '—');
}

/** Map payment method values to friendly labels. */
export function paymentMethodLabel(method: string | null | undefined): string {
  const key = String(method ?? '').toLowerCase();
  const map: Record<string, string> = {
    cod: 'Cash on Delivery',
    sslcommerz: 'SSLCommerz',
    bkas: 'bKash',
    bkash: 'bKash',
    nagad: 'Nagad',
    card: 'Card Payment',
    online: 'Online Payment',
    bank: 'Bank Transfer',
    rocket: 'Rocket',
  };
  return map[key] || (key ? key.replace(/_/g, ' ') : 'Cash on Delivery');
}
