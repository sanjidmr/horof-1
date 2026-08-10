-- 1. Add order_config JSONB Column to the products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS order_config JSONB DEFAULT '{
  "quantity_discounts": [],
  "specification_steps": [],
  "design_charge": {
    "enabled": false,
    "amount": 0,
    "description": ""
  },
  "customer_notes_settings": {
    "enabled": false,
    "title": "Specification Need Details",
    "placeholder": "Describe your design requirements..."
  },
  "pricing_config": {
    "min_order_qty": 1,
    "max_order_qty": null
  },
  "order_request_settings": {
    "enable_order_requests": true,
    "enable_add_to_cart": true,
    "enable_direct_order": false,
    "auto_approval": false
  },
  "display_controls": {
    "show_discount_table": true,
    "show_specifications": true,
    "show_customer_notes": true,
    "show_quantity_selector": true,
    "show_design_charge": true,
    "show_total_price": true,
    "show_send_request": true,
    "show_add_to_cart": true
  }
}'::jsonb;

-- 2. Create the order_requests table
CREATE TABLE IF NOT EXISTS public.order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_info JSONB NOT NULL, -- { name, email, phone }
  selected_specifications JSONB NOT NULL, -- { [stepName]: value }
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  design_charge NUMERIC DEFAULT 0,
  customer_notes TEXT,
  final_total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for order_requests
DROP POLICY IF EXISTS "order_requests_select_policy" ON public.order_requests;
CREATE POLICY "order_requests_select_policy" ON public.order_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_requests_insert_policy" ON public.order_requests;
CREATE POLICY "order_requests_insert_policy" ON public.order_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_requests_admin_policy" ON public.order_requests;
CREATE POLICY "order_requests_admin_policy" ON public.order_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
