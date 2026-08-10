-- ============================================================
-- CONSOLIDATED COUPON SYSTEM FIX — Safe to run multiple times
-- Combines fixes from 20260723000003 and 20260723000004
-- Apply via Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. ENSURE is_admin() FUNCTION EXISTS (critical for RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
END;
$$;

-- 2. ENSURE is_customer() FUNCTION EXISTS
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'customer' FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
END;
$$;

-- 3. ADD 'free_shipping' TO coupon_type ENUM
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'coupon_type' AND e.enumlabel = 'free_shipping'
  ) THEN
    ALTER TYPE public.coupon_type ADD VALUE IF NOT EXISTS 'free_shipping';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. ADD ALL MISSING COLUMNS TO coupons TABLE
DO $$
BEGIN
  -- name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN name text;
  END IF;

  -- description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN description text;
  END IF;

  -- max_discount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'max_discount'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_discount numeric(14,2);
  END IF;

  -- per_user_limit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'per_user_limit'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN per_user_limit integer NOT NULL DEFAULT 1;
  END IF;

  -- starts_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN starts_at timestamptz;
  END IF;

  -- first_order_only
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'first_order_only'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN first_order_only boolean NOT NULL DEFAULT false;
  END IF;

  -- new_customer_only
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'new_customer_only'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN new_customer_only boolean NOT NULL DEFAULT false;
  END IF;

  -- applicable_products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'applicable_products'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applicable_products text[] NOT NULL DEFAULT '{}';
  END IF;

  -- applicable_categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'applicable_categories'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applicable_categories text[] NOT NULL DEFAULT '{}';
  END IF;

  -- excluded_products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_products'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_products text[] NOT NULL DEFAULT '{}';
  END IF;

  -- excluded_categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_categories'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_categories text[] NOT NULL DEFAULT '{}';
  END IF;

  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- 5. ENSURE coupon_usage TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_request_id uuid REFERENCES public.order_requests (id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

-- 6. ENSURE ALL INDEXES EXIST
CREATE INDEX IF NOT EXISTS idx_coupons_code_lower ON public.coupons (lower(code));
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON public.coupons (expires_at);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage (order_request_id);

-- 7. ENSURE RLS IS PROPERLY CONFIGURED ON coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_select ON public.coupons;
DROP POLICY IF EXISTS coupons_insert ON public.coupons;
DROP POLICY IF EXISTS coupons_update ON public.coupons;
DROP POLICY IF EXISTS coupons_delete ON public.coupons;

CREATE POLICY coupons_select ON public.coupons FOR SELECT USING (true);
CREATE POLICY coupons_insert ON public.coupons FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY coupons_update ON public.coupons FOR UPDATE USING (public.is_admin());
CREATE POLICY coupons_delete ON public.coupons FOR DELETE USING (public.is_admin());

-- 8. ENSURE RLS ON coupon_usage
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupon_usage_select ON public.coupon_usage;
DROP POLICY IF EXISTS coupon_usage_insert ON public.coupon_usage;
DROP POLICY IF EXISTS coupon_usage_mutate ON public.coupon_usage;

CREATE POLICY coupon_usage_select ON public.coupon_usage FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY coupon_usage_insert ON public.coupon_usage FOR INSERT
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY coupon_usage_mutate ON public.coupon_usage FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. ENSURE increment_coupon_used_count RPC EXISTS
CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = COALESCE(used_count, 0) + 1
  WHERE id = p_coupon_id;
END;
$$;

-- 10. ADD coupon_discount COUPON COLUMNS TO orders TABLE IF MISSING
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_discount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_discount numeric(14,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_code text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_id uuid REFERENCES public.coupons (id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11. ENSURE coupon columns exist in order_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_requests' AND column_name = 'coupon_id'
  ) THEN
    ALTER TABLE public.order_requests ADD COLUMN coupon_id uuid REFERENCES public.coupons (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_requests' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE public.order_requests ADD COLUMN coupon_code text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_requests' AND column_name = 'coupon_discount'
  ) THEN
    ALTER TABLE public.order_requests ADD COLUMN coupon_discount numeric(14,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 12. GRANT EXECUTE ON RPCS
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) TO authenticated;

-- 13. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
