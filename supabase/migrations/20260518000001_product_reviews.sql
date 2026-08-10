-- ============================================================
-- Product Reviews Migration
-- ============================================================

-- 1. Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  is_approved  BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per customer per product per order
  UNIQUE (customer_id, product_id, order_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id  ON public.product_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.product_reviews (customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id    ON public.product_reviews (order_id);

-- 3. Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Anyone can read approved reviews
CREATE POLICY "reviews_select_approved"
  ON public.product_reviews
  FOR SELECT
  USING (is_approved = true);

-- Authenticated customers can insert their own review
CREATE POLICY "reviews_insert_own"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own review
CREATE POLICY "reviews_update_own"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Customers can delete their own review
CREATE POLICY "reviews_delete_own"
  ON public.product_reviews
  FOR DELETE
  USING (auth.uid() = customer_id);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_reviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_reviews_updated_at();
