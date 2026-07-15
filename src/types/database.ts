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
export type StockMovementType = 'stock_added' | 'stock_removed' | 'sale' | 'return' | 'adjustment' | 'damage' | 'lost' | 'transfer_out' | 'transfer_in' | 'purchase' | 'manual_update' | 'reservation';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' | 'discontinued';
export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
export type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';
export type BundleOfferType = 'buy_x_get_y' | 'fixed_price' | 'percent_discount' | 'product_combination';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
export type CampaignType = 'broadcast' | 'welcome' | 'order_confirmation' | 'shipping_update' | 'birthday' | 'abandoned_cart' | 'product_recommendation' | 'custom';
export type PopupType = 'newsletter_signup' | 'discount_offer' | 'coupon_popup' | 'exit_intent' | 'welcome_popup' | 'announcement' | 'flash_sale' | 'product_promotion';
export type PopupTrigger = 'on_load' | 'after_seconds' | 'scroll_percentage' | 'exit_intent' | 'on_page';
export type PopupFrequency = 'once' | 'daily' | 'weekly' | 'every_visit';

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
        subcategories: {
          Row: {
            id: string;
            category_id: string;
            name: string;
            slug: string;
            sort_order: number;
            is_active: boolean;
            created_at: string;
          };
          Insert: {
            id?: string;
            category_id: string;
            name: string;
            slug: string;
            sort_order?: number;
            is_active?: boolean;
            created_at?: string;
          };
          Update: Partial<Database['public']['Tables']['subcategories']['Insert']>;
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
            subcategory_id: string | null;
            brand_id: string | null;
            section: ProductSection | null;
            flash_sale_ends_at: string | null;
            meta_title: string | null;
            meta_description: string | null;
            og_image_url: string | null;
            order_config: Json;
            min_stock_level: number;
            max_stock_level: number | null;
            reorder_qty: number;
            stock_status: StockStatus;
            default_warehouse_id: string | null;
            barcode: string | null;
            unit: string;
            cost_price: number | null;
            expected_restock_date: string | null;
            reserved_stock: number;
            incoming_stock: number;
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
            subcategory_id?: string | null;
            brand_id?: string | null;
            section?: ProductSection | null;
            flash_sale_ends_at?: string | null;
            meta_title?: string | null;
            meta_description?: string | null;
            og_image_url?: string | null;
            order_config?: Json;
            min_stock_level?: number;
            max_stock_level?: number | null;
            reorder_qty?: number;
            stock_status?: StockStatus;
            default_warehouse_id?: string | null;
            barcode?: string | null;
            unit?: string;
            cost_price?: number | null;
            expected_restock_date?: string | null;
            reserved_stock?: number;
            incoming_stock?: number;
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
          warehouse_id: string | null;
          barcode: string | null;
          cost_price: number | null;
          image: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          size?: string | null;
          color?: string | null;
          stock?: number;
          price_modifier?: number;
          warehouse_id?: string | null;
          barcode?: string | null;
          cost_price?: number | null;
          image?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>;
      };
      warehouses: {
        Row: {
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          location?: string | null;
          manager?: string | null;
          phone?: string | null;
          email?: string | null;
          capacity?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['warehouses']['Insert']>;
      };
      suppliers: {
        Row: {
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          payment_terms?: string | null;
          tax_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      product_suppliers: {
        Row: {
          id: string;
          product_id: string;
          supplier_id: string;
          supplier_sku: string | null;
          cost_price: number | null;
          lead_time_days: number | null;
          is_preferred: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          supplier_id: string;
          supplier_sku?: string | null;
          cost_price?: number | null;
          lead_time_days?: number | null;
          is_preferred?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_suppliers']['Insert']>;
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          supplier_id: string;
          warehouse_id: string | null;
          status: PurchaseOrderStatus;
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number: string;
          supplier_id: string;
          warehouse_id?: string | null;
          status?: PurchaseOrderStatus;
          order_date?: string;
          expected_date?: string | null;
          received_date?: string | null;
          invoice_number?: string | null;
          notes?: string | null;
          subtotal?: number;
          tax?: number;
          shipping_cost?: number;
          total_cost?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          received_quantity: number;
          unit_cost: number;
          total_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity: number;
          received_quantity?: number;
          unit_cost: number;
          total_cost: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['purchase_order_items']['Insert']>;
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          warehouse_id: string | null;
          movement_type: StockMovementType;
          quantity_change: number;
          stock_before: number;
          stock_after: number;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          warehouse_id?: string | null;
          movement_type: StockMovementType;
          quantity_change: number;
          stock_before: number;
          stock_after: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>;
      };
      stock_transfers: {
        Row: {
          id: string;
          transfer_number: string;
          product_id: string;
          variant_id: string | null;
          quantity: number;
          from_warehouse_id: string;
          to_warehouse_id: string;
          status: TransferStatus;
          notes: string | null;
          requested_by: string | null;
          completed_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transfer_number: string;
          product_id: string;
          variant_id?: string | null;
          quantity: number;
          from_warehouse_id: string;
          to_warehouse_id: string;
          status?: TransferStatus;
          notes?: string | null;
          requested_by?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stock_transfers']['Insert']>;
      };
      inventory_reservations: {
        Row: {
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
          status: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          warehouse_id?: string | null;
          quantity: number;
          order_id?: string | null;
          order_request_id?: string | null;
          reserved_at?: string;
          expires_at?: string | null;
          released_at?: string | null;
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_reservations']['Insert']>;
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
        };
        Insert: {
          id?: string;
          code: string;
          type: CouponType;
          value: number;
          min_order?: number;
          max_discount?: number | null;
          max_uses?: number | null;
          per_user_limit?: number;
          used_count?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          first_order_only?: boolean;
          applicable_products?: string[];
          applicable_categories?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      coupon_usage: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          order_request_id: string | null;
          used_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          order_request_id?: string | null;
          used_at?: string;
        };
        Update: Partial<Database['public']['Tables']['coupon_usage']['Insert']>;
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
          coupon_discount: number;
          design_charge: number;
          customer_notes: string | null;
          coupon_id: string | null;
          coupon_code: string | null;
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
          coupon_discount?: number;
          design_charge?: number;
          customer_notes?: string | null;
          coupon_id?: string | null;
          coupon_code?: string | null;
          final_total_price: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_requests']['Insert']>;
      };
      bundle_offers: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: BundleOfferType;
          buy_product_id: string | null;
          buy_quantity: number;
          get_product_id: string | null;
          get_quantity: number;
          get_discount_percent: number;
          fixed_price_products: string[];
          fixed_price_total: number | null;
          bundle_discount_percent: number | null;
          combination_products: string[];
          combination_discount_amount: number | null;
          applicable_products: string[];
          applicable_categories: string[];
          min_subtotal: number;
          max_uses: number | null;
          used_count: number;
          per_user_limit: number;
          priority: number;
          is_active: boolean;
          starts_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type: BundleOfferType;
          buy_product_id?: string | null;
          buy_quantity?: number;
          get_product_id?: string | null;
          get_quantity?: number;
          get_discount_percent?: number;
          fixed_price_products?: string[];
          fixed_price_total?: number | null;
          bundle_discount_percent?: number | null;
          combination_products?: string[];
          combination_discount_amount?: number | null;
          applicable_products?: string[];
          applicable_categories?: string[];
          min_subtotal?: number;
          max_uses?: number | null;
          used_count?: number;
          per_user_limit?: number;
          priority?: number;
          is_active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bundle_offers']['Insert']>;
      };
      free_shipping_offers: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          min_order_amount: number;
          coupon_code: string | null;
          applicable_products: string[];
          applicable_categories: string[];
          applicable_districts: string[];
          exclude_districts: string[];
          starts_at: string | null;
          expires_at: string | null;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          min_order_amount?: number;
          coupon_code?: string | null;
          applicable_products?: string[];
          applicable_categories?: string[];
          applicable_districts?: string[];
          exclude_districts?: string[];
          starts_at?: string | null;
          expires_at?: string | null;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['free_shipping_offers']['Insert']>;
      };
      subscribers: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          source: string;
          tags: string[];
          is_active: boolean;
          subscribed_at: string;
          unsubscribed_at: string | null;
          unsubscribe_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          source?: string;
          tags?: string[];
          is_active?: boolean;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
          unsubscribe_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscribers']['Insert']>;
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          preheader: string | null;
          html_body: string;
          plain_text: string | null;
          category: string;
          thumbnail_url: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          preheader?: string | null;
          html_body: string;
          plain_text?: string | null;
          category?: string;
          thumbnail_url?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_templates']['Insert']>;
      };
      email_campaigns: {
        Row: {
          id: string;
          name: string;
          subject: string;
          preheader: string | null;
          sender_name: string | null;
          sender_email: string | null;
          reply_to: string | null;
          campaign_type: CampaignType;
          status: CampaignStatus;
          template_id: string | null;
          html_body: string;
          plain_text: string | null;
          dynamic_variables: Json;
          product_ids: string[];
          audience: Json;
          segment_type: string;
          segment_filter: Json;
          scheduled_at: string | null;
          sent_at: string | null;
          recipient_count: number;
          delivered_count: number;
          open_count: number;
          click_count: number;
          bounce_count: number;
          complaint_count: number;
          unsubscribe_count: number;
          automation_trigger: string | null;
          automation_delay_minutes: number | null;
          provider: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          preheader?: string | null;
          sender_name?: string | null;
          sender_email?: string | null;
          reply_to?: string | null;
          campaign_type?: CampaignType;
          status?: CampaignStatus;
          template_id?: string | null;
          html_body?: string;
          plain_text?: string | null;
          dynamic_variables?: Json;
          product_ids?: string[];
          audience?: Json;
          segment_type?: string;
          segment_filter?: Json;
          scheduled_at?: string | null;
          sent_at?: string | null;
          recipient_count?: number;
          delivered_count?: number;
          open_count?: number;
          click_count?: number;
          bounce_count?: number;
          complaint_count?: number;
          unsubscribe_count?: number;
          automation_trigger?: string | null;
          automation_delay_minutes?: number | null;
          provider?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_campaigns']['Insert']>;
      };
      email_logs: {
        Row: {
          id: string;
          campaign_id: string | null;
          subscriber_id: string | null;
          recipient_email: string;
          recipient_name: string | null;
          subject: string;
          status: string;
          opened_at: string | null;
          clicked_at: string | null;
          click_url: string | null;
          bounce_reason: string | null;
          provider_message_id: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          subscriber_id?: string | null;
          recipient_email: string;
          recipient_name?: string | null;
          subject: string;
          status?: string;
          opened_at?: string | null;
          clicked_at?: string | null;
          click_url?: string | null;
          bounce_reason?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_logs']['Insert']>;
      };
      popup_campaigns: {
        Row: {
          id: string;
          name: string;
          title: string | null;
          description: string | null;
          popup_type: PopupType;
          trigger_type: PopupTrigger;
          trigger_value: number;
          frequency: PopupFrequency;
          image_url: string | null;
          background_color: string;
          text_color: string;
          button_text: string;
          button_color: string;
          button_text_color: string;
          coupon_code: string | null;
          product_id: string | null;
          discount_percent: number | null;
          discount_amount: number | null;
          display_pages: string[];
          display_devices: string[];
          show_to_new_visitors: boolean;
          show_to_returning_visitors: boolean;
          show_to_logged_in: boolean;
          show_to_guests: boolean;
          restricted_countries: string[];
          date_start: string | null;
          date_end: string | null;
          ab_test_enabled: boolean;
          ab_variant_a: Json | null;
          ab_variant_b: Json | null;
          ab_winner: string | null;
          views: number;
          conversions: number;
          closes: number;
          is_active: boolean;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          title?: string | null;
          description?: string | null;
          popup_type: PopupType;
          trigger_type?: PopupTrigger;
          trigger_value?: number;
          frequency?: PopupFrequency;
          image_url?: string | null;
          background_color?: string;
          text_color?: string;
          button_text?: string;
          button_color?: string;
          button_text_color?: string;
          coupon_code?: string | null;
          product_id?: string | null;
          discount_percent?: number | null;
          discount_amount?: number | null;
          display_pages?: string[];
          display_devices?: string[];
          show_to_new_visitors?: boolean;
          show_to_returning_visitors?: boolean;
          show_to_logged_in?: boolean;
          show_to_guests?: boolean;
          restricted_countries?: string[];
          date_start?: string | null;
          date_end?: string | null;
          ab_test_enabled?: boolean;
          ab_variant_a?: Json | null;
          ab_variant_b?: Json | null;
          ab_winner?: string | null;
          views?: number;
          conversions?: number;
          closes?: number;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['popup_campaigns']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
