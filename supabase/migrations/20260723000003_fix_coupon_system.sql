-- ============================================================
-- FIX COUPON SYSTEM: Schema Sync, Missing Columns, Reports
-- ============================================================

-- 1. Add 'free_shipping' to coupon_type enum (idempotent)
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

-- 2. Add description column to coupons table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN description text;
  END IF;
END $$;

-- 3. Add new_customer_only column (idempotent) - separate from first_order_only for clarity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'new_customer_only'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN new_customer_only boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 4. Add excluded_products and excluded_categories columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_products'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_products text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'excluded_categories'
  ) THEN
    ALTER TABLE public.coupons ADD COLUMN excluded_categories text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- 5. Ensure indexes exist on coupons for common queries
CREATE INDEX IF NOT EXISTS idx_coupons_code_lower ON public.coupons (lower(code));
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON public.coupons (expires_at);

-- 6. Ensure RLS is enabled on coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates, then recreate
DROP POLICY IF EXISTS coupons_select ON public.coupons;
DROP POLICY IF EXISTS coupons_insert ON public.coupons;
DROP POLICY IF EXISTS coupons_update ON public.coupons;
DROP POLICY IF EXISTS coupons_delete ON public.coupons;

CREATE POLICY coupons_select ON public.coupons FOR SELECT USING (true);
CREATE POLICY coupons_insert ON public.coupons FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY coupons_update ON public.coupons FOR UPDATE USING (public.is_admin());
CREATE POLICY coupons_delete ON public.coupons FOR DELETE USING (public.is_admin());

-- 7. Ensure coupon_usage RLS is correct
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

-- 8. Ensure increment_coupon_used_count RPC exists
CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
END;
$$;

-- 9. Fix coupon report to also query order_requests (not just orders)
-- Both RPCs join on orders.coupon_code. But orders may not exist for pending orders.
-- Create a combined report function that covers both tables.
CREATE OR REPLACE FUNCTION public.get_coupon_report(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  coupon_code text,
  coupon_type text,
  times_used bigint,
  total_discount numeric,
  revenue_with_coupon numeric
)
LANGUAGE sql STABLE
AS $$
  -- Count from order_requests (all placed orders)
  SELECT
    c.code AS coupon_code,
    c.type::text AS coupon_type,
    count(DISTINCT orq.id)::bigint AS times_used,
    COALESCE(sum(orq.coupon_discount), 0) AS total_discount,
    COALESCE(sum(orq.final_total_price), 0) AS revenue_with_coupon
  FROM public.order_requests orq
  JOIN public.coupons c ON c.code = orq.coupon_code
  WHERE orq.created_at >= from_date
    AND orq.created_at < to_date
    AND orq.status != 'cancelled'
    AND orq.coupon_code IS NOT NULL
  GROUP BY c.code, c.type
  ORDER BY times_used DESC
$$;

-- 10. Fix coupon performance report to also use order_requests
CREATE OR REPLACE FUNCTION public.get_coupon_performance(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  coupon_id uuid,
  code text,
  coupon_type text,
  times_used bigint,
  total_discount numeric,
  total_revenue numeric,
  avg_discount numeric,
  is_active boolean,
  expires_at timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id AS coupon_id,
    c.code,
    c.type::text AS coupon_type,
    COALESCE(usage.times_used, 0)::bigint AS times_used,
    COALESCE(usage.total_discount, 0) AS total_discount,
    COALESCE(usage.total_revenue, 0) AS total_revenue,
    CASE WHEN COALESCE(usage.times_used, 0) > 0
      THEN round(COALESCE(usage.total_discount, 0) / usage.times_used, 2)
      ELSE 0 END AS avg_discount,
    c.is_active,
    c.expires_at
  FROM public.coupons c
  LEFT JOIN (
    SELECT
      orq.coupon_code,
      count(DISTINCT orq.id)::bigint AS times_used,
      COALESCE(sum(orq.coupon_discount), 0) AS total_discount,
      COALESCE(sum(orq.final_total_price), 0) AS total_revenue
    FROM public.order_requests orq
    WHERE orq.created_at >= from_date
      AND orq.created_at < to_date
      AND orq.status != 'cancelled'
      AND orq.coupon_code IS NOT NULL
    GROUP BY orq.coupon_code
  ) usage ON usage.coupon_code = c.code
  ORDER BY usage.times_used DESC NULLS LAST
$$;

-- 11. Add discount_amount column to orders table for tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_discount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN coupon_discount numeric(14,2) DEFAULT 0;
  END IF;
END $$;

-- 12. Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.get_coupon_report(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coupon_performance(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_used_count(uuid) TO authenticated;
