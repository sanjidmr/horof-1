-- ============================================================
-- ENTERPRISE SETTINGS CENTER (2026-08-04)
-- Unifies General / Shipping / Notifications / Email / Social
-- config into structured JSONB rows on site_settings, exposes
-- public-safe keys to the storefront via RLS, and enables
-- realtime sync for live propagation.
--
-- Apply via Supabase Dashboard > SQL Editor.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. REALTIME: enable site_settings + legal_pages for live sync
-- -------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.legal_pages;

-- -------------------------------------------------------------------
-- 2. RLS: expose public-safe settings keys to the storefront.
--    Notifications + email settings remain admin-only (SMTP creds!).
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS site_settings_select ON public.site_settings;
CREATE POLICY site_settings_select ON public.site_settings FOR SELECT
  USING (
    public.is_admin()
    OR key IN (
      'general',
      'homepage',
      'theme',
      'seo',
      'banners',
      'meta_pixel',
      'google_analytics',
      'shipping_threshold',
      'shipping',
      'social'
    )
  );

-- -------------------------------------------------------------------
-- 3. Seed structured defaults (idempotent - only inserts if absent)
-- -------------------------------------------------------------------
INSERT INTO public.site_settings (key, value)
VALUES
  ('general', '{"website_name":"Horof","business_address":"Mymensingh, Dhaka","phone":"+880 1234 567890","support_email":"studio@horof.com","company_logo":"/images/horof.svg","admin_logo":"/images/horof.svg","favicon":"/images/horof.svg"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES
  ('shipping', '{"inside_mymensingh_charge":60,"outside_mymensingh_charge":120,"office_charge":0,"free_shipping_enabled":true,"free_shipping_threshold":1000,"estimated_delivery":"2-3 days"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES
  ('notifications', '{"email_enabled":true,"admin_enabled":true,"customer_enabled":true,"browser_enabled":true,"warehouse_enabled":true,"low_stock_enabled":true,"order_update_enabled":true,"design_request_enabled":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES
  ('email', '{"sender_name":"Horof","sender_email":"noreply@horof.com","support_email":"studio@horof.com","smtp_enabled":false,"smtp_provider":"resend","smtp_host":"","smtp_port":587,"smtp_user":"","smtp_pass":"","smtp_secure":true,"password_reset_enabled":true,"order_email_enabled":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES
  ('social', '{"facebook":"","instagram":"","whatsapp":"","youtube":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------------
-- 4. Seed legal pages if absent (idempotent)
-- -------------------------------------------------------------------
INSERT INTO public.legal_pages (page_type, title, subtitle, content, is_active)
VALUES
  ('terms', 'Terms & Conditions', 'Please read these terms carefully before using our services.',
   '[{"id":"intro","title":"Introduction","content":"<p>Welcome to our website. These terms govern your use of our services.</p>","order":1}]'::jsonb, true)
ON CONFLICT (page_type) DO NOTHING;

INSERT INTO public.legal_pages (page_type, title, subtitle, content, is_active)
VALUES
  ('privacy_policy', 'Privacy Policy', 'Your privacy matters to us. This policy explains how we collect and use your data.',
   '[{"id":"intro","title":"Introduction","content":"<p>This privacy policy describes how we handle your personal information.</p>","order":1}]'::jsonb, true)
ON CONFLICT (page_type) DO NOTHING;

NOTIFY pgrst, 'reload schema';
