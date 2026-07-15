-- SQL migration to enhance orders and order_timeline tables
-- Applied to the Supabase database

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS estimated_delivery timestamptz,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'Unfulfilled',
  ADD COLUMN IF NOT EXISTS return_status text NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS refund_reason text;

ALTER TABLE public.order_timeline
  ADD COLUMN IF NOT EXISTS admin_name text DEFAULT 'System';
