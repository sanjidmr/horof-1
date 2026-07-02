-- Create quantity_discounts table
CREATE TABLE IF NOT EXISTS public.quantity_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  discount_percent NUMERIC NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(product_id, quantity)
);

-- Create product_config_options table
CREATE TABLE IF NOT EXISTS public.product_config_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('size', 'acrylic_color', 'letter_color', 'lighting')),
  name TEXT NOT NULL,
  price_modifier NUMERIC DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quantity_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_config_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "quantity_discounts_select_policy" ON public.quantity_discounts;
DROP POLICY IF EXISTS "quantity_discounts_admin_policy" ON public.quantity_discounts;
DROP POLICY IF EXISTS "product_config_options_select_policy" ON public.product_config_options;
DROP POLICY IF EXISTS "product_config_options_admin_policy" ON public.product_config_options;

-- RLS Policies for quantity_discounts
CREATE POLICY "quantity_discounts_select_policy" ON public.quantity_discounts
  FOR SELECT USING (true);

CREATE POLICY "quantity_discounts_admin_policy" ON public.quantity_discounts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RLS Policies for product_config_options
CREATE POLICY "product_config_options_select_policy" ON public.product_config_options
  FOR SELECT USING (true);

CREATE POLICY "product_config_options_admin_policy" ON public.product_config_options
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
