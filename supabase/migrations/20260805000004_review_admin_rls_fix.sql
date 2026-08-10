-- ============================================================
-- REVIEW ADMIN RLS FIX
-- ============================================================
-- The admin review policies from 20260802000001 checked
-- `profiles.role = 'admin'` literally. After the RBAC migration
-- (20260804000001), admins/super_admins/managers are covered by
-- public.is_admin(), and the reviews admin page also grants access
-- to 'staff'. Those users were RLS-denied (empty "{}" fetch error).
-- This replaces the three admin policies to use is_admin() + staff.
-- ============================================================

DROP POLICY IF EXISTS reviews_select_admin ON public.product_reviews;
DROP POLICY IF EXISTS reviews_update_admin ON public.product_reviews;
DROP POLICY IF EXISTS reviews_delete_admin ON public.product_reviews;

-- Admin can read all reviews (including pending)
CREATE POLICY "reviews_select_admin"
  ON public.product_reviews
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'staff'::public.user_role
    )
  );

-- Admin can update all reviews (approve, reject, reply)
CREATE POLICY "reviews_update_admin"
  ON public.product_reviews
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'staff'::public.user_role
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'staff'::public.user_role
    )
  );

-- Admin can delete any review
CREATE POLICY "reviews_delete_admin"
  ON public.product_reviews
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'staff'::public.user_role
    )
  );
