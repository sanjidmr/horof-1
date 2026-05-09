import type { OrderStatus } from '../types';

export type DbOrderRow = {
  id: string;
  user_id: string;
  status: string;
  /** Some schemas use `total`, others `total_price` */
  total?: number | string | null;
  total_price?: number | string | null;
  created_at: string;
  shipping_address?: string | null;
  shipping_city?: string | null;
};

export type DbOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number | string;
};

export type DbProductRow = {
  id: string;
  name: string;
  price: number | string;
  images?: unknown;
};

export type DbWishlistRow = {
  id: string;
  user_id: string;
  product_id: string;
  created_at?: string | null;
};

export type DbAddressRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  is_default: boolean;
};

export type DbProfileRow = {
  id: string;
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
};

export type OrderWithItems = DbOrderRow & {
  items: Array<
    DbOrderItemRow & {
      product?: DbProductRow | null;
      imageUrl?: string | null;
    }
  >;
};

export function normalizeOrderStatus(raw: string | null | undefined): OrderStatus {
  const v = String(raw ?? 'pending').toLowerCase() as OrderStatus;
  const allowed: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  return allowed.includes(v) ? v : 'pending';
}
