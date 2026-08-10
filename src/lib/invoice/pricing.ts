/**
 * Invoice pricing — computed strictly from real order values.
 * Source of truth precedence:
 *   - Items:  `order_items` rows (when present), else `product_details` JSONB items.
 *   - Subtotal: the `orders.subtotal` column when > 0, otherwise the item sum.
 *   - Shipping: `orders.delivery_charge` / `orders.shipping_charge`.
 *   - Coupon:  `orders.coupon_discount` (fallback to the product_details metadata `discount`
 *              when a coupon code is present).
 *   - Discount: `orders.discount`.
 *   - Grand total: the billed `orders.total` / `orders.amount` when > 0, otherwise the
 *              recomputed sum. This guarantees the invoice matches what the customer paid.
 */
import type { InvoiceItem, InvoicePricing } from './types';

export type OrderLike = {
  subtotal?: number | string | null;
  delivery_charge?: number | string | null;
  shipping_charge?: number | string | null;
  discount?: number | string | null;
  coupon_discount?: number | string | null;
  coupon_code?: string | null;
  total?: number | string | null;
  amount?: number | string | null;
  total_price?: number | string | null;
  product_details?: unknown;
};

export function parseProductDetails(productDetails: unknown): {
  items: any[];
  metadata: Record<string, any>;
} {
  const details = Array.isArray(productDetails) ? productDetails : [];
  const items = details.filter((d: any) => !d?.is_metadata);
  const metadata =
    details.find((d: any) => d?.is_metadata) ||
    ({
      discount: 0,
      subtotal: 0,
      coupon_code: '',
      customer_notes: '',
      internal_notes: '',
    } as Record<string, any>);
  return { items, metadata };
}

function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePricing(order: OrderLike, items: InvoiceItem[]): InvoicePricing {
  const { metadata } = parseProductDetails(order.product_details);

  // 1. Item-level subtotal (authoritative from real line items).
  const itemSum = round2(items.reduce((sum, it) => sum + it.lineTotal, 0));

  // 2. Prefer the stored subtotal when the order actually recorded one.
  const storedSubtotal = num(order.subtotal);
  const subtotal = round2(storedSubtotal > 0 ? storedSubtotal : itemSum > 0 ? itemSum : itemSum);

  // 3. Shipping.
  const shipping = round2(num(order.delivery_charge) > 0 ? num(order.delivery_charge) : num(order.shipping_charge));

  // 4. Coupon discount (order column, else metadata discount when coupon present).
  let couponDiscount = round2(num(order.coupon_discount));
  const couponCode = String(order.coupon_code || metadata.coupon_code || '');
  if (couponDiscount === 0 && couponCode && num(metadata.discount) > 0) {
    couponDiscount = round2(num(metadata.discount));
  }

  // 5. General / admin discount (avoid double counting with coupon).
  let discount = round2(num(order.discount));
  if (discount === 0 && !couponCode && num(metadata.discount) > 0) {
    discount = round2(num(metadata.discount));
  }

  // 6. Grand total — prefer the real billed amount.
  const storedTotal = num(order.total) > 0 ? num(order.total) : num(order.amount);
  const computedTotal = round2(subtotal + shipping - discount - couponDiscount);
  const grandTotal = storedTotal > 0 ? round2(storedTotal) : Math.max(0, computedTotal);

  return {
    subtotal,
    shipping,
    discount,
    couponDiscount,
    couponCode,
    grandTotal,
  };
}
