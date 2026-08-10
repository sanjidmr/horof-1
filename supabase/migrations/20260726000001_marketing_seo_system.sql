-- ============================================================
-- Marketing & SEO System
-- ============================================================

-- 1. Redirects table
CREATE TABLE IF NOT EXISTS public.redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_redirects_from_path ON public.redirects(from_path);

-- 2. SEO Pages table
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL UNIQUE,
  page_type TEXT NOT NULL DEFAULT 'custom',
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT false,
  no_follow BOOLEAN DEFAULT true,
  json_ld JSONB,
  schema_type TEXT,
  focus_keyword TEXT,
  seo_score INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_pages_path ON public.seo_pages(page_path);

-- 3. RLS policies
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

-- redirects: admins full access, public read for active ones
CREATE POLICY "Admins manage redirects" ON public.redirects FOR ALL USING (public.is_admin());
CREATE POLICY "Public can read active redirects" ON public.redirects FOR SELECT USING (is_active = true);

-- seo_pages: admins full access, public read for active ones
CREATE POLICY "Admins manage seo_pages" ON public.seo_pages FOR ALL USING (public.is_admin());
CREATE POLICY "Public can read active seo_pages" ON public.seo_pages FOR SELECT USING (is_active = true);
