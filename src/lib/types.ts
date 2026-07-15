export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
  subcategory?: string;
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
  isNew?: boolean;
  isFeatured?: boolean;
  is_best_selling?: boolean;
  is_new_arrival?: boolean;
  is_product_of_the_day?: boolean;
  specification?: string;
  perfect_for?: string;
  createdAt?: string;
  order_config?: {
    quantity_discounts: { quantity: number; discount_percent: number }[];
    specification_steps: {
      id: string;
      name: string;
      description: string;
      type: 'select' | 'radio' | 'text' | 'file';
      additional_price?: number;
      required: boolean;
      active: boolean;
      options: { name: string; price_modifier: number }[];
    }[];
    design_charge: {
      enabled: boolean;
      amount: number;
      description: string;
    };
    customer_notes_settings: {
      enabled: boolean;
      title: string;
      placeholder: string;
    };
    pricing_config: {
      min_order_qty: number;
      max_order_qty?: number | null;
    };
    order_request_settings: {
      enable_order_requests: boolean;
      enable_add_to_cart: boolean;
      enable_direct_order: boolean;
      auto_approval: boolean;
    };
    display_controls: {
      show_discount_table: boolean;
      show_specifications: boolean;
      show_customer_notes: boolean;
      show_quantity_selector: boolean;
      show_design_charge: boolean;
      show_total_price: boolean;
      show_send_request: boolean;
      show_add_to_cart: boolean;
    };
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: {
    size?: string;
    acrylicColor?: string;
    letterColor?: string;
    lighting?: string;
  };
  customPrice?: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: 'bkash' | 'nagad' | 'cod';
  transactionId?: string;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  joinedDate: string;
  orders: number;
  totalSpent: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order: number;
  max_discount: number | null;
  max_uses: number | null;
  per_user_limit: number;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  first_order_only: boolean;
  applicable_products: string[];
  applicable_categories: string[];
  is_active: boolean;
  created_at: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discount?: number;
  message: string;
}

// -------------------------------------------------------------------
// Inventory Types
// -------------------------------------------------------------------
export interface Warehouse {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  payment_terms: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string | null;
  status: 'draft' | 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total_cost: number;
  created_by: string | null;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string | null;
  movement_type: string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes: string | null;
  requested_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface InventoryReservation {
  id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string | null;
  quantity: number;
  order_id: string | null;
  order_request_id: string | null;
  reserved_at: string;
  expires_at: string | null;
  released_at: string | null;
  status: 'active' | 'released' | 'consumed';
}

export interface InventoryStats {
  total_products: number;
  active_products: number;
  total_stock: number;
  reserved_stock: number;
  incoming_stock: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number;
}
