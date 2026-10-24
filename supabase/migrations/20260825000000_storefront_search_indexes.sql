CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm
  ON public.products USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON public.products (created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_category_created_at
  ON public.products (category_id, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved_created
  ON public.product_reviews (product_id, created_at DESC)
  WHERE is_approved = true;
