-- Bundle Offers & Free Shipping Offers for Marketing module
-- Adds two new tables for admin-managed promotions

-- -------------------------------------------------------------------
-- Bundle Offers
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bundle_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('buy_x_get_y', 'fixed_price', 'percent_discount', 'product_combination')),
  -- buy_x_get_y: buy X of one product, get Y of another at discount %
  buy_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  buy_quantity int DEFAULT 1,
  get_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  get_quantity int DEFAULT 1,
  get_discount_percent numeric(5,2) DEFAULT 100,
  -- fixed_price: set of products for a fixed total price
  fixed_price_products uuid[] DEFAULT '{}',
  fixed_price_total numeric(14,2),
  -- percent_discount: % off all products in the bundle
  bundle_discount_percent numeric(5,2),
  -- product_combination: specific products that together trigger a discount
  combination_products uuid[] DEFAULT '{}',
  combination_discount_amount numeric(14,2),
  -- Common conditions
  applicable_products uuid[] DEFAULT '{}',
  applicable_categories uuid[] DEFAULT '{}',
  min_subtotal numeric(14,2) DEFAULT 0,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  per_user_limit int NOT NULL DEFAULT 1,
  priority int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Free Shipping Offers
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.free_shipping_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  min_order_amount numeric(14,2) DEFAULT 0,
  coupon_code text,
  applicable_products uuid[] DEFAULT '{}',
  applicable_categories uuid[] DEFAULT '{}',
  applicable_districts text[] DEFAULT '{}',
  exclude_districts text[] DEFAULT '{}',
  starts_at timestamptz,
  expires_at timestamptz,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bundle_offers_active ON bundle_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_bundle_offers_priority ON bundle_offers(priority DESC);
CREATE INDEX IF NOT EXISTS idx_free_shipping_offers_active ON free_shipping_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_free_shipping_offers_priority ON free_shipping_offers(priority DESC);

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------
ALTER TABLE public.bundle_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_shipping_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY bundle_offers_select ON public.bundle_offers FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY bundle_offers_mutate ON public.bundle_offers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY free_shipping_offers_select ON public.free_shipping_offers FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY free_shipping_offers_mutate ON public.free_shipping_offers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
