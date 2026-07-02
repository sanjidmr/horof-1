export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
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
