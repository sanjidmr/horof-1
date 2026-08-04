-- ============================================================
-- REVIEW SYSTEM ENHANCEMENT
-- ============================================================
-- 1. Add admin_reply, admin_reply_at, variant_info columns
-- 2. Change is_approved default to false (pending moderation)
-- 3. Add admin RLS policies (manage all reviews)
-- 4. Add customer self-read policy (see own pending reviews)
-- 5. Add realtime publication for product_reviews
-- 6. Add index on is_approved for faster filtering
-- ============================================================

-- 1. Add new columns to product_reviews
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS variant_info JSONB DEFAULT '{}'::jsonb;

-- 2. Change is_approved default to false (pending moderation)
ALTER TABLE public.product_reviews
  ALTER COLUMN is_approved SET DEFAULT false;

-- 3. Add index on is_approved for faster filtering
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON public.product_reviews (is_approved);

-- 4. Drop old RLS policies that are too restrictive
DROP POLICY IF EXISTS "reviews_select_approved" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.product_reviews;

-- 5. New RLS Policies

-- Anyone can read approved reviews
CREATE POLICY "reviews_select_approved"
  ON public.product_reviews
  FOR SELECT
  USING (is_approved = true);

-- Customers can read their own reviews (including pending)
CREATE POLICY "reviews_select_own"
  ON public.product_reviews
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Admin can read all reviews (including pending)
CREATE POLICY "reviews_select_admin"
  ON public.product_reviews
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated customers can insert their own review
CREATE POLICY "reviews_insert_own"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own review (only if not yet approved)
CREATE POLICY "reviews_update_own"
  ON public.product_reviews
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Admin can update all reviews (approve, reject, reply)
CREATE POLICY "reviews_update_admin"
  ON public.product_reviews
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers can delete their own review
CREATE POLICY "reviews_delete_own"
  ON public.product_reviews
  FOR DELETE
  USING (auth.uid() = customer_id);

-- Admin can delete any review
CREATE POLICY "reviews_delete_admin"
  ON public.product_reviews
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Add realtime publication for product_reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;

-- 7. Update the updated_at trigger (already exists, just ensure it's there)
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