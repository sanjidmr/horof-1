-- Add product_details JSONB column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_details JSONB DEFAULT '{}'::jsonb;

-- Update perfect_for column to store as JSONB array instead of comma-separated text
-- First add a new column, then migrate data, then drop old
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS perfect_for_tags JSONB DEFAULT '[]'::jsonb;
