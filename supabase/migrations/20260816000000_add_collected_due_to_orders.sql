-- Add collected_amount and due_amount columns to orders table
-- These store the payment collection status for delivered orders

DO $$
BEGIN
  -- Add collected_amount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'collected_amount') THEN
    ALTER TABLE public.orders ADD COLUMN collected_amount numeric(14,2) DEFAULT 0;
  END IF;

  -- Add due_amount column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'due_amount') THEN
    ALTER TABLE public.orders ADD COLUMN due_amount numeric(14,2) DEFAULT 0;
  END IF;
END $$;

-- Update existing orders: set collected_amount = 0 and due_amount = amount for orders that don't have these set
UPDATE public.orders SET 
  collected_amount = 0,
  due_amount = amount
WHERE collected_amount IS NULL OR due_amount IS NULL;

-- Make the columns NOT NULL after populating
ALTER TABLE public.orders ALTER COLUMN collected_amount SET DEFAULT 0;
ALTER TABLE public.orders ALTER COLUMN due_amount SET DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.orders.collected_amount IS 'Amount collected from customer for delivered orders';
COMMENT ON COLUMN public.orders.due_amount IS 'Remaining amount due for delivered orders';