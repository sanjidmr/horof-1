-- ============================================================
-- TRUSTED CLIENTS CMS SECTION
-- Manages client logos displayed on the About page
-- ============================================================

CREATE TABLE IF NOT EXISTS public.about_trusted_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  logo_url text NOT NULL,
  website_url text DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_about_trusted_clients_order ON about_trusted_clients(display_order);

ALTER TABLE public.about_trusted_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY about_trusted_clients_select ON public.about_trusted_clients
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY about_trusted_clients_mutate ON public.about_trusted_clients
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_about_trusted_clients_updated_at
  BEFORE UPDATE ON public.about_trusted_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS about_trusted_clients;
