-- Add delivery charge and type to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_charge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_type text;
