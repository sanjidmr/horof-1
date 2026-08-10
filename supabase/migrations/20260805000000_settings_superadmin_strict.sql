-- ============================================================
-- SETTINGS CENTER: SUPER ADMIN-ONLY WRITES (2026-08-05)
-- Restricts site_settings + legal_pages mutations to the
-- top-level admin roles (admin, super_admin). Managers and
-- staff keep read/view access but cannot change configuration.
--
-- Apply via Supabase Dashboard > SQL Editor.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. SUPER ADMIN HELPER (backward compatible with legacy 'admin')
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role)
  );
$$;

-- -------------------------------------------------------------------
-- 2. site_settings: only super admins may write
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS site_settings_mutate ON public.site_settings;
CREATE POLICY site_settings_mutate ON public.site_settings FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- -------------------------------------------------------------------
-- 3. legal_pages: only super admins may write
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS legal_pages_mutate ON public.legal_pages;
CREATE POLICY legal_pages_mutate ON public.legal_pages FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

NOTIFY pgrst, 'reload schema';
