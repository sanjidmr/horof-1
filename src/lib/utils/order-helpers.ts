/**
 * Shared order utility helpers.
 * This file has NO 'use server' directive — it is safe to import from
 * both Server Components and Client Components.
 */

/** Extract line-items and the metadata sentinel from a product_details JSONB array. */
export function parseProductDetails(productDetails: any) {
  const details = Array.isArray(productDetails) ? productDetails : [];
  const items = details.filter((d: any) => !d.is_metadata);
  const metadata = details.find((d: any) => d.is_metadata) || {
    is_metadata: true,
    discount: 0,
    subtotal: 0,
    coupon_code: '',
    internal_notes: '',
    customer_notes: '',
    courier_name: '',
    tracking_number: '',
    estimated_delivery: null,
    fulfillment_status: 'Unfulfilled',
    return_status: 'None',
    return_reason: '',
    return_notes: '',
    return_admin_note: '',
    refund_status: 'None',
    refund_reason: ''
  };
  return { items, metadata };
}

/** Rebuild the product_details JSONB array with an updated metadata sentinel. */
export function buildProductDetails(items: any[], metadata: any) {
  return [
    ...items,
    {
      ...metadata,
      is_metadata: true
    }
  ];
}
