/**
 * Invoice module — normalized types shared by the invoice template,
 * the customer invoice page, the admin print page, and the PDF route.
 */

export type InvoiceItem = {
  productId: string | null;
  name: string;
  sku: string;
  category: string;
  variant: Record<string, string>;
  quantity: number;
  unitPrice: number;
  designCharge: number;
  lineTotal: number;
  imageUrl: string | null;
};

export type InvoiceStatus = {
  orderStatus: string;
  paymentStatus: string;
};

export type InvoicePricing = {
  subtotal: number;
  shipping: number;
  discount: number;
  couponDiscount: number;
  couponCode: string;
  grandTotal: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  invoiceDate: string;
  statuses: InvoiceStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  shipping: {
    name: string;
    address: string;
  };
  payment: {
    method: string;
    status: string;
    transactionId: string | null;
  };
  fulfillment: {
    courier: string;
    tracking: string;
    estimatedDelivery: string | null;
  };
  items: InvoiceItem[];
  pricing: InvoicePricing;
  notes: {
    customer: string;
    internal: string;
  };
  trackingUrl: string;
};
