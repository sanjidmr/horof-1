-- ============================================================
-- LINK OUR SERVICES TO PRODUCT CATEGORIES
-- ============================================================
-- Adds an optional category_id FK on site_images (the "services"
-- rows live there). When a service is assigned a category, the
-- homepage "Products" button links to /category/<slug> using the
-- existing category routing. ON DELETE SET NULL so removing a
-- category never orphans/deletes a service.
-- ============================================================

ALTER TABLE public.site_images
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_site_images_category ON public.site_images (category_id);
