-- ============================================================
-- COMPREHENSIVE FIX: Coupon System
-- ============================================================

-- 1. ENSURE is_admin FUNCTION EXISTS (critical for RLS)
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

-- 2. ENSURE is_customer FUNCTION EXISTS
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

-- 3. ENSURE COUPONS TABLE HAS ALL REQUIRED COLUMNS
DO $$
BEGIN
  -- id (uuid primary key)
  -- code (text unique)
  -- type (coupon_type enum: percent, fixed, free_shipping)
  -- value (numeric)
  -- description (text)
  -- min_order (numeric)
  -- max_discount (numeric)
  -- max_uses (int)
  -- per_user_limit (int)
  -- used_count (int)
  -- starts_at (timestamptz)
  -- expires_at (timestamptz)
  -- first_order_only (boolean)
  -- new_customer_only (boolean)
  -- applicable_products (text[])
  -- applicable_categories (text[])
  -- excluded_products (text[])
  -- excluded_categories (text[])
  -- is_active (boolean)
  -- created_at (timestamptz)
  -- updated_at (timestamptz)

  -- Add name column for coupon name/label
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN name text;
  END IF;

  -- Add description if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN description text;
  END IF;

  -- Add min_order if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'min_order'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN min_order numeric(14,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add max_discount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'max_discount'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_discount numeric(14,2);
  END IF;

  -- Add max_uses if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'max_uses'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN max_uses integer;
  END IF;

  -- Add per_user_limit if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'per_user_limit'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN per_user_limit integer NOT NULL DEFAULT 1;
  END IF;

  -- Add used_count if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'used_count'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN used_count integer NOT NULL DEFAULT 0;
  END IF;

  -- Add starts_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN starts_at timestamptz;
  END IF;

  -- Add expires_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN expires_at timestamptz;
  END IF;

  -- Add first_order_only if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'first_order_only'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN first_order_only boolean NOT NULL DEFAULT false;
  END IF;

  -- Add new_customer_only if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'new_customer_only'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN new_customer_only boolean NOT NULL DEFAULT false;
  END IF;

  -- Add applicable_products if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'applicable_products'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applicable_products text[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add applicable_categories if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'applicable_categories'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN applicable_categories text[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add excluded_products if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_products'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_products text[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add excluded_categories if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_categories'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_categories text[] NOT NULL DEFAULT '{}';
  END IF;

  -- Add is_active if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Add is_warehouse_staff to profiles if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_warehouse_staff'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_warehouse_staff boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. ENSURE coupon_type ENUM HAS ALL VALUES
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
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage (order_request_id);

-- 7. ENSURE RLS IS PROPERLY CONFIGURED ON coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS coupons_select ON public.coupons;
DROP POLICY IF EXISTS coupons_insert ON public.coupons;
DROP POLICY IF EXISTS coupons_update ON public.coupons;
DROP POLICY IF EXISTS coupons_delete ON public.coupons;

-- Recreate policies
CREATE POLICY coupons_select ON public.coupons FOR SELECT USING (true);
CREATE POLICY coupons_insert ON public.coupons FOR INSERT WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_warehouse_staff = true)
  )
);
CREATE POLICY coupons_update ON public.coupons FOR UPDATE USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_warehouse_staff = true)
  )
);
CREATE POLICY coupons_delete ON public.coupons FOR DELETE USING (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR is_warehouse_staff = true)
  )
);

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

-- 9. ENSURE increment_coupon_used_count RPC EXISTS WITH CORRECT PARAM NAME
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

-- 10. ADD coupon_discount COLUMNS TO orders TABLE IF MISSING
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