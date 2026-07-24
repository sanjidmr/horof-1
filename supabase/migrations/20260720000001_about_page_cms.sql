-- ============================================================
-- ABOUT PAGE CMS
-- Full content management for the About Us page
-- ============================================================

-- -------------------------------------------------------------------
-- About Page Content (hero, story, mission, vision, founder)
-- Single row table for page-level settings
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.about_page (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hero Section
  hero_title text NOT NULL DEFAULT 'Our Story',
  hero_subtitle text DEFAULT 'Crafting timeless pieces since 1999',
  hero_description text DEFAULT '',
  hero_image_url text,
  hero_button_text text DEFAULT 'Explore Collection',
  hero_button_link text DEFAULT '/products',
  hero_badge text DEFAULT 'Est. 1999',
  hero_is_active boolean NOT NULL DEFAULT true,
  
  -- Our Story Section
  story_title text DEFAULT 'Our Story',
  story_subtitle text DEFAULT 'A legacy of craftsmanship',
  story_content text DEFAULT '',
  story_image_url text,
  story_is_active boolean NOT NULL DEFAULT true,
  
  -- Founder Section
  founder_title text DEFAULT 'Meet Our Founder',
  founder_name text DEFAULT '',
  founder_designation text DEFAULT 'Founder & Master Artisan',
  founder_bio text DEFAULT '',
  founder_image_url text,
  founder_quote text DEFAULT '',
  founder_signature_url text,
  founder_is_active boolean NOT NULL DEFAULT true,
  
  -- Mission Section
  mission_title text DEFAULT 'Our Mission',
  mission_description text DEFAULT '',
  mission_icon text DEFAULT 'Target',
  mission_is_active boolean NOT NULL DEFAULT true,
  
  -- Vision Section
  vision_title text DEFAULT 'Our Vision',
  vision_description text DEFAULT '',
  vision_icon text DEFAULT 'Eye',
  vision_is_active boolean NOT NULL DEFAULT true,
  
  -- CTA Section
  cta_title text DEFAULT 'Start Your Own Legacy',
  cta_description text DEFAULT '',
  cta_button_text text DEFAULT 'Shop Collections',
  cta_button_link text DEFAULT '/products',
  cta_secondary_button_text text DEFAULT 'Contact Us',
  cta_secondary_button_link text DEFAULT '/contact',
  cta_image_url text,
  cta_is_active boolean NOT NULL DEFAULT true,
  
  -- Stats (4 stat blocks)
  stats jsonb NOT NULL DEFAULT '[
    {"label": "Masterpieces Crafted", "value": "18,400+", "icon": "ShoppingBag"},
    {"label": "Happy Customers", "value": "12,000+", "icon": "Users"},
    {"label": "Years of Legacy", "value": "25+", "icon": "Clock"},
    {"label": "Global Partners", "value": "150+", "icon": "Award"}
  ]',
  
  -- SEO
  meta_title text DEFAULT 'About Us - Horof',
  meta_description text DEFAULT 'Learn about Horof - Bangladesh''s premier artisan furniture house.',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Team Members
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.about_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  image_url text,
  social_links jsonb NOT NULL DEFAULT '{}',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Company Values
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.about_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Star',
  color text DEFAULT 'bg-emerald-50 text-emerald-700 border-emerald-100',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Why Choose Us Cards
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.about_why_choose_us (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'CheckCircle',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_about_team_members_order ON about_team_members(display_order);
CREATE INDEX IF NOT EXISTS idx_about_values_order ON about_values(display_order);
CREATE INDEX IF NOT EXISTS idx_about_why_choose_us_order ON about_why_choose_us(display_order);

-- -------------------------------------------------------------------
-- RLS Policies
-- -------------------------------------------------------------------
ALTER TABLE public.about_page ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.about_why_choose_us ENABLE ROW LEVEL SECURITY;

-- about_page: public read, admin full access
CREATE POLICY about_page_select ON public.about_page FOR SELECT USING (true);
CREATE POLICY about_page_mutate ON public.about_page FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- about_team_members: public read active, admin full
CREATE POLICY about_team_select ON public.about_team_members FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY about_team_mutate ON public.about_team_members FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- about_values: public read active, admin full
CREATE POLICY about_values_select ON public.about_values FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY about_values_mutate ON public.about_values FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- about_why_choose_us: public read active, admin full
CREATE POLICY about_wcu_select ON public.about_why_choose_us FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY about_wcu_mutate ON public.about_why_choose_us FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------
-- Updated_at trigger
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_about_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_about_page_updated_at
  BEFORE UPDATE ON public.about_page
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();

CREATE TRIGGER trg_about_team_members_updated_at
  BEFORE UPDATE ON public.about_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();

CREATE TRIGGER trg_about_values_updated_at
  BEFORE UPDATE ON public.about_values
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();

CREATE TRIGGER trg_about_wcu_updated_at
  BEFORE UPDATE ON public.about_why_choose_us
  FOR EACH ROW EXECUTE FUNCTION public.update_about_updated_at();
