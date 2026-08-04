-- ============================================================
-- COUPON SYSTEM: DATA BACKFILL + RLS ALIGNMENT (2026-08-03)
-- Apply via Supabase Dashboard > SQL Editor.
-- Fixes data drift (expiry_date/usage_limit -> expires_at/max_uses)
-- and RLS mismatch (app allows warehouse staff, DB only admin).
-- ============================================================

-- 1. BACKFILL expires_at FROM legacy expiry_date
UPDATE public.coupons
SET expires_at = expiry_date::timestamptz
WHERE expires_at IS NULL AND expiry_date IS NOT NULL;

-- 2. BACKFILL max_uses FROM legacy usage_limit
UPDATE public.coupons
SET max_uses = usage_limit
WHERE max_uses IS NULL AND usage_limit IS NOT NULL;

-- 3. SANITIZE per_user_limit (never below 1)
UPDATE public.coupons SET per_user_limit = 1 WHERE per_user_limit IS NULL OR per_user_limit < 1;

-- 4. HELPER: admin OR warehouse staff (matches src/lib/actions/coupons.ts requireAdmin)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT role = 'admin' OR is_warehouse_staff FROM public.profiles WHERE id = auth.uid()),
      false
    )
  );
END;
$$;

-- 5. REWRITE coupons RLS to allow admin OR warehouse staff
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_insert ON public.coupons;
DROP POLICY IF EXISTS coupons_update ON public.coupons;
DROP POLICY IF EXISTS coupons_delete ON public.coupons;

CREATE POLICY coupons_insert ON public.coupons FOR INSERT WITH CHECK (public.is_admin_or_staff());
CREATE POLICY coupons_update ON public.coupons FOR UPDATE USING (public.is_admin_or_staff());
CREATE POLICY coupons_delete ON public.coupons FOR DELETE USING (public.is_admin_or_staff());

-- 6. coupon_usage: staff can read all usage rows
DROP POLICY IF EXISTS coupon_usage_select ON public.coupon_usage;
CREATE POLICY coupon_usage_select ON public.coupon_usage FOR SELECT
  USING (public.is_admin_or_staff() OR user_id = auth.uid());

-- 7. GRANT EXECUTE on new helper
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 8. DROP REDIRECTS (module removed from app)
-- ============================================================
DROP POLICY IF EXISTS "Admins manage redirects" ON public.redirects;
DROP POLICY IF EXISTS "Public can read active redirects" ON public.redirects;
DROP TABLE IF EXISTS public.redirects;

-- ============================================================
-- 9. DROP restricted_countries FROM popup_campaigns (field removed)
-- ============================================================
ALTER TABLE public.popup_campaigns DROP COLUMN IF EXISTS restricted_countries;

-- ============================================================
-- 10. REALTIME: enable flash_sales + special_offers for homepage sync
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.flash_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.special_offers;

-- ============================================================
-- 11. DROP SUBSCRIBERS (module removed from app)
-- ============================================================
ALTER TABLE public.email_logs DROP COLUMN IF EXISTS subscriber_id;
DROP FUNCTION IF EXISTS public.get_subscriber_growth();
DROP TABLE IF EXISTS public.subscribers CASCADE;
