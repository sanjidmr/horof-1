-- ============================================================
-- FIX ACCOUNTING RLS: USE public.is_admin() LIKE THE REST OF THE APP
-- ============================================================
-- The original accounting migration (20260727000001) protected its
-- tables with `profiles.role = 'admin'`. That check is outdated:
-- the app-wide is_admin() helper requires user_type='internal' AND
-- covers admin / super_admin / manager / staff. Using the raw
-- profile-role check silently rejects every write from super_admin
-- / manager / staff users ("new row violates row-level security").
--
-- Replace all "Admin can manage ..." policies with is_admin().
-- SELECT policies stay open to authenticated (read-only), matching
-- the rest of the codebase.
-- ============================================================

DROP POLICY IF EXISTS "Admin can manage expense categories" ON public.expense_categories;
CREATE POLICY "Admin can manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage expenses" ON public.expenses;
CREATE POLICY "Admin can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Admin can manage chart of accounts" ON public.chart_of_accounts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage transactions" ON public.account_transactions;
CREATE POLICY "Admin can manage transactions" ON public.account_transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage customer ledger" ON public.customer_ledger;
CREATE POLICY "Admin can manage customer ledger" ON public.customer_ledger
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage supplier ledger" ON public.supplier_ledger;
CREATE POLICY "Admin can manage supplier ledger" ON public.supplier_ledger
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
