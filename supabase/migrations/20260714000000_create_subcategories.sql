-- Create subcategories table with FK to categories (CASCADE delete)
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON public.subcategories (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON public.subcategories (category_id, is_active);

-- Add subcategory_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products (subcategory_id);

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as categories)
CREATE POLICY subcategories_select ON public.subcategories FOR SELECT
  USING (public.is_admin() OR is_active = true);
CREATE POLICY subcategories_mutate ON public.subcategories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
