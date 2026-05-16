-- Horof E-Commerce: schema, enums, RLS, storage, triggers
-- Run with Supabase CLI: supabase db push / migration apply

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.product_section AS ENUM (
    'best_selling',
    'new_arrival',
    'product_of_the_day',
    'flash_sale',
    'exclusive_offer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.shipment_status AS ENUM ('pending', 'in_transit', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: admin check (SECURITY DEFINER, stable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'customer'::public.user_role
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'customer',
  is_banned boolean NOT NULL DEFAULT false,
  notes text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- New user → profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories (self-referential)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories (is_active);

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  specification jsonb NOT NULL DEFAULT '{}'::jsonb,
  perfect_for text[] NOT NULL DEFAULT '{}',
  price numeric(14,2) NOT NULL DEFAULT 0,
  offer_price numeric(14,2),
  sku text NOT NULL UNIQUE,
  stock int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands (id) ON DELETE SET NULL,
  section public.product_section,
  flash_sale_ends_at timestamptz,
  meta_title text,
  meta_description text,
  og_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_section ON public.products (section);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images (max 3 per product)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id, sort_order);

CREATE OR REPLACE FUNCTION public.enforce_max_three_product_images()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.product_images WHERE product_id = NEW.product_id;
  IF cnt >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 images per product';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_images_max ON public.product_images;
CREATE TRIGGER trg_product_images_max
  BEFORE INSERT ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_three_product_images();

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  size text,
  color text,
  stock int NOT NULL DEFAULT 0,
  price_modifier numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  shipping_charge numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants (id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL,
  total_price numeric(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- order_timeline
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON public.order_timeline (order_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  method text NOT NULL,
  transaction_id text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  gateway_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- ---------------------------------------------------------------------------
-- refunds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  reason text,
  status public.refund_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds (order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds (status);

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  label text,
  full_name text NOT NULL,
  phone text,
  address_line text NOT NULL,
  city text,
  district text,
  postal_code text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON public.addresses (customer_id);

-- ---------------------------------------------------------------------------
-- shipping_zones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  districts text[] NOT NULL DEFAULT '{}',
  charge numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- couriers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text,
  store_id text,
  webhook_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT couriers_name_key UNIQUE (name)
);

-- ---------------------------------------------------------------------------
-- shipments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  courier_id uuid REFERENCES public.couriers (id) ON DELETE SET NULL,
  tracking_number text,
  status public.shipment_status NOT NULL DEFAULT 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments (order_id);

-- ---------------------------------------------------------------------------
-- coupons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type public.coupon_type NOT NULL,
  value numeric(14,2) NOT NULL,
  min_order numeric(14,2) NOT NULL DEFAULT 0,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- site_settings (key/value jsonb)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- visitors (analytics)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  page text NOT NULL,
  referrer text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitors_created ON public.visitors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_session ON public.visitors (session_id);

-- ---------------------------------------------------------------------------
-- banners (hero slider)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  image_url text NOT NULL,
  link text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-run
DO $pol$ DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','categories','brands','products','product_images','product_variants',
        'orders','order_items','order_timeline','payments','refunds','addresses',
        'shipping_zones','couriers','shipments','coupons','site_settings','visitors','banners'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $pol$;

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (public.is_admin() OR id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (public.is_admin() OR id = auth.uid());
CREATE POLICY profiles_delete ON public.profiles FOR DELETE
  USING (public.is_admin());

-- categories: public read active; admin all
CREATE POLICY categories_select ON public.categories FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY categories_mutate ON public.categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- brands
CREATE POLICY brands_select ON public.brands FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY brands_mutate ON public.brands FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- products
CREATE POLICY products_select ON public.products FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY products_mutate ON public.products FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- product_images / variants: follow product visibility
CREATE POLICY product_images_select ON public.product_images FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true)
  );
CREATE POLICY product_images_mutate ON public.product_images FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY product_variants_select ON public.product_variants FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true)
  );
CREATE POLICY product_variants_mutate ON public.product_variants FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- orders
CREATE POLICY orders_select ON public.orders FOR SELECT
  USING (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY orders_insert ON public.orders FOR INSERT
  WITH CHECK (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY orders_update ON public.orders FOR UPDATE
  USING (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY orders_delete ON public.orders FOR DELETE
  USING (public.is_admin());

-- order_items
CREATE POLICY order_items_select ON public.order_items FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY order_items_insert ON public.order_items FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY order_items_update ON public.order_items FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY order_items_delete ON public.order_items FOR DELETE
  USING (public.is_admin());

-- order_timeline
CREATE POLICY order_timeline_select ON public.order_timeline FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY order_timeline_mutate ON public.order_timeline FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payments
CREATE POLICY payments_select ON public.payments FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY payments_insert ON public.payments FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY payments_update ON public.payments FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY payments_delete ON public.payments FOR DELETE
  USING (public.is_admin());

-- refunds
CREATE POLICY refunds_select ON public.refunds FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY refunds_insert ON public.refunds FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY refunds_update ON public.refunds FOR UPDATE
  USING (public.is_admin());

-- addresses
CREATE POLICY addresses_select ON public.addresses FOR SELECT
  USING (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY addresses_insert ON public.addresses FOR INSERT
  WITH CHECK (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY addresses_update ON public.addresses FOR UPDATE
  USING (public.is_admin() OR customer_id = auth.uid());
CREATE POLICY addresses_delete ON public.addresses FOR DELETE
  USING (public.is_admin() OR customer_id = auth.uid());

-- shipping_zones, couriers: read for authenticated customers (checkout), admin write
CREATE POLICY shipping_zones_select ON public.shipping_zones FOR SELECT
  USING (public.is_admin() OR auth.role() = 'authenticated');
CREATE POLICY shipping_zones_mutate ON public.shipping_zones FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY couriers_select ON public.couriers FOR SELECT
  USING (public.is_admin() OR auth.role() = 'authenticated');
CREATE POLICY couriers_mutate ON public.couriers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- shipments
CREATE POLICY shipments_select ON public.shipments FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );
CREATE POLICY shipments_mutate ON public.shipments FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- coupons: customers can read active (apply at checkout); admin all
CREATE POLICY coupons_select ON public.coupons FOR SELECT
  USING (public.is_admin() OR (is_active = true AND (expires_at IS NULL OR expires_at > now())));
CREATE POLICY coupons_mutate ON public.coupons FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- site_settings: selective public read for storefront / marketing
CREATE POLICY site_settings_select ON public.site_settings FOR SELECT
  USING (
    public.is_admin()
    OR key IN (
      'general',
      'homepage',
      'theme',
      'seo',
      'banners',
      'meta_pixel',
      'google_analytics',
      'shipping_threshold'
    )
  );
CREATE POLICY site_settings_mutate ON public.site_settings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- visitors: insert from anon (tracking) optional — allow authenticated + anon insert for analytics
CREATE POLICY visitors_insert ON public.visitors FOR INSERT
  WITH CHECK (true);
CREATE POLICY visitors_select ON public.visitors FOR SELECT
  USING (public.is_admin());

-- banners
CREATE POLICY banners_select ON public.banners FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY banners_mutate ON public.banners FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (storage.objects)
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_write" ON storage.objects;
CREATE POLICY "product_images_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
CREATE POLICY "site_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_admin_write" ON storage.objects;
CREATE POLICY "site_assets_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

DROP POLICY IF EXISTS "site_assets_admin_update" ON storage.objects;
CREATE POLICY "site_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin());

DROP POLICY IF EXISTS "site_assets_admin_delete" ON storage.objects;
CREATE POLICY "site_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin());

-- Note: payment_gateways and other secrets should only be stored server-side in production
-- (service role) or encrypted; RLS here restricts reads to admin only except explicit keys above.

COMMENT ON TABLE public.profiles IS 'App users; role admin|customer. is_banned blocks login in app middleware.';
COMMENT ON TABLE public.site_settings IS 'Key/value settings; sensitive keys readable only by admin via RLS.';
