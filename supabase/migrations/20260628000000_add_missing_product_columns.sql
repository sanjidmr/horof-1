-- Add missing columns to the products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'best_selling',
  ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_order_qty INTEGER,
  ADD COLUMN IF NOT EXISTS customer_notes_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_notes_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_request_settings JSONB,
  ADD COLUMN IF NOT EXISTS display_controls JSONB;
