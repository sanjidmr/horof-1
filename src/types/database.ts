/** Hand-maintained types aligned with `supabase/migrations/20250513000000_init_ecommerce.sql`. Regenerate with `npm run gen:types` when Supabase is local. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'customer';
export type ProductSection =
  | 'best_selling'
  | 'new_arrival'
  | 'product_of_the_day'
  | 'flash_sale'
  | 'exclusive_offer';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type RefundStatus = 'pending' | 'approved' | 'rejected';
export type CouponType = 'percent' | 'fixed';
export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'failed';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          is_banned: boolean;
          notes: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          is_banned?: boolean;
          notes?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['brands']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          specification: Json;
          perfect_for: string[];
          price: number;
          offer_price: number | null;
          sku: string;
          stock: number;
          is_active: boolean;
          category_id: string | null;
          brand_id: string | null;
          section: ProductSection | null;
          flash_sale_ends_at: string | null;
          meta_title: string | null;
          meta_description: string | null;
          og_image_url: string | null;
          order_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          specification?: Json;
          perfect_for?: string[];
          price?: number;
          offer_price?: number | null;
          sku: string;
          stock?: number;
          is_active?: boolean;
          category_id?: string | null;
          brand_id?: string | null;
          section?: ProductSection | null;
          flash_sale_ends_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_url?: string | null;
          order_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      product_images: {
        Row: { id: string; product_id: string; image_url: string; sort_order: number };
        Insert: { id?: string; product_id: string; image_url: string; sort_order?: number };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          size: string | null;
          color: string | null;
          stock: number;
          price_modifier: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          size?: string | null;
          color?: string | null;
          stock?: number;
          price_modifier?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          status: OrderStatus;
          payment_status: PaymentStatus;
          payment_method: string | null;
          transaction_id: string | null;
          subtotal: number;
          discount: number;
          shipping_charge: number;
          total: number;
          shipping_address: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          payment_method?: string | null;
          transaction_id?: string | null;
          subtotal?: number;
          discount?: number;
          shipping_charge?: number;
          total?: number;
          shipping_address?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity?: number;
          unit_price: number;
          total_price: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      order_timeline: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_timeline']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          method: string;
          transaction_id: string | null;
          status: PaymentStatus;
          gateway_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          amount: number;
          method: string;
          transaction_id?: string | null;
          status?: PaymentStatus;
          gateway_response?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      refunds: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          reason: string | null;
          status: RefundStatus;
          requested_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          amount: number;
          reason?: string | null;
          status?: RefundStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['refunds']['Insert']>;
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          label: string | null;
          full_name: string;
          phone: string | null;
          address_line: string;
          city: string | null;
          district: string | null;
          postal_code: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label?: string | null;
          full_name: string;
          phone?: string | null;
          address_line: string;
          city?: string | null;
          district?: string | null;
          postal_code?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['addresses']['Insert']>;
      };
      shipping_zones: {
        Row: {
          id: string;
          name: string;
          districts: string[];
          charge: number;
          is_active: boolean;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          districts?: string[];
          charge?: number;
          is_active?: boolean;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shipping_zones']['Insert']>;
      };
      couriers: {
        Row: {
          id: string;
          name: string;
          api_key: string | null;
          store_id: string | null;
          webhook_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          api_key?: string | null;
          store_id?: string | null;
          webhook_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['couriers']['Insert']>;
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          courier_id: string | null;
          tracking_number: string | null;
          status: ShipmentStatus;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          courier_id?: string | null;
          tracking_number?: string | null;
          status?: ShipmentStatus;
          shipped_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>;
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: CouponType;
          value: number;
          min_order: number;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: CouponType;
          value: number;
          min_order?: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      site_settings: {
        Row: { id: string; key: string; value: Json; updated_at: string };
        Insert: { id?: string; key: string; value?: Json; updated_at?: string };
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>;
      };
      visitors: {
        Row: {
          id: string;
          session_id: string;
          page: string;
          referrer: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          page: string;
          referrer?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['visitors']['Insert']>;
      };
      banners: {
        Row: {
          id: string;
          title: string | null;
          subtitle: string | null;
          image_url: string;
          link: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          subtitle?: string | null;
          image_url: string;
          link?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['banners']['Insert']>;
      };
      product_reviews: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string;
          order_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id: string;
          order_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_reviews']['Insert']>;
      };
      order_requests: {
        Row: {
          id: string;
          product_id: string | null;
          product_name: string;
          user_id: string | null;
          customer_info: Json;
          selected_specifications: Json;
          quantity: number;
          discount_percent: number;
          discount_amount: number;
          design_charge: number;
          customer_notes: string | null;
          final_total_price: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          product_name: string;
          user_id?: string | null;
          customer_info: Json;
          selected_specifications: Json;
          quantity: number;
          discount_percent?: number;
          discount_amount?: number;
          design_charge?: number;
          customer_notes?: string | null;
          final_total_price: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_requests']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
