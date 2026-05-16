export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          phone: string | null
          address: Json | null
          role: 'customer' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
          address?: Json | null
          role?: 'customer' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
          address?: Json | null
          role?: 'customer' | 'admin'
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price: number
          compare_price: number | null
          stock: number
          category_id: string | null
          images: string[] | null
          is_active: boolean
          is_best_selling: boolean
          is_new_arrival: boolean
          is_product_of_the_day: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price: number
          compare_price?: number | null
          stock?: number
          category_id?: string | null
          images?: string[] | null
          is_active?: boolean
          is_best_selling?: boolean
          is_new_arrival?: boolean
          is_product_of_the_day?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price?: number
          compare_price?: number | null
          stock?: number
          category_id?: string | null
          images?: string[] | null
          is_active?: boolean
          is_best_selling?: boolean
          is_new_arrival?: boolean
          is_product_of_the_day?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total: number
          shipping_address: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total: number
          shipping_address?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
          total?: number
          shipping_address?: Json | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
      }
      settings: {
        Row: {
          id: string
          store_name: string
          contact_email: string | null
        }
        Insert: {
          id?: string
          store_name?: string
          contact_email?: string | null
        }
        Update: {
          id?: string
          store_name?: string
          contact_email?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: 'order' | 'customer' | 'stock' | 'product'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: 'order' | 'customer' | 'stock' | 'product'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: 'order' | 'customer' | 'stock' | 'product'
          is_read?: boolean
          created_at?: string
        }
      }
      site_images: {
        Row: {
          id: string
          image_url: string
          section: string
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          section: string
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          section?: string
          created_at?: string
        }
      }
      flash_sales: {
        Row: {
          id: string
          image_url: string
          title: string
          main_price: number
          offer_price: number
          end_time: string
          product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          title: string
          main_price: number
          offer_price: number
          end_time: string
          product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          title?: string
          main_price?: number
          offer_price?: number
          end_time?: string
          product_id?: string | null
          created_at?: string
        }
      }
      special_offers: {
        Row: {
          id: string
          image_url: string
          title: string
          discount_percent: number
          product_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          image_url: string
          title: string
          discount_percent: number
          product_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          title?: string
          discount_percent?: number
          product_id?: string | null
          created_at?: string
        }
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          created_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          created_at?: string
        }
      }
    }
  }
}
