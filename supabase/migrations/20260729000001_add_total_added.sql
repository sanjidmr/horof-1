-- Add total_added column to products table
ALTER TABLE public.products
ADD COLUMN total_added BIGINT NOT NULL DEFAULT 0;

-- Initialize total_added for existing products to their current stock
UPDATE public.products
SET total_added = GREATEST(stock, 0);