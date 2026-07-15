-- Enhance coupons table with new columns
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount numeric(14,2);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS per_user_limit int NOT NULL DEFAULT 1;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_products text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_categories text[] NOT NULL DEFAULT '{}';

-- Coupon usage tracking table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_request_id uuid REFERENCES public.order_requests (id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON public.coupon_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON public.coupon_usage (order_request_id);

-- Add coupon columns to order_requests
ALTER TABLE public.order_requests ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons (id) ON DELETE SET NULL;
ALTER TABLE public.order_requests ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.order_requests ADD COLUMN IF NOT EXISTS coupon_discount numeric(14,2) NOT NULL DEFAULT 0;

-- RLS for coupon_usage
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_usage_select ON public.coupon_usage FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY coupon_usage_insert ON public.coupon_usage FOR INSERT
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY coupon_usage_mutate ON public.coupon_usage FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RPC to safely increment coupon used_count
CREATE OR REPLACE FUNCTION public.increment_coupon_used_count(coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = coupon_id;
END;
$$;
