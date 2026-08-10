-- ============================================================
-- Fix: Perfect For dual-column sync
-- ============================================================
-- The migration 20260720000005 added `perfect_for_tags` JSONB column
-- but never completed the data migration. This migration:
--   1. Backfills `perfect_for_tags` from `perfect_for` (text[])
--   2. Backfills `perfect_for` from `perfect_for_tags` (JSONB)
--   3. Ensures both columns stay in sync going forward
-- ============================================================

-- Step 1: Backfill perfect_for_tags from perfect_for (text[] -> JSONB)
UPDATE public.products
SET perfect_for_tags = COALESCE(
  (SELECT jsonb_agg(elem) FROM unnest(perfect_for) AS elem WHERE elem IS NOT NULL AND btrim(elem) <> ''),
  '[]'::jsonb
)
WHERE perfect_for IS NOT NULL
  AND (perfect_for_tags IS NULL OR perfect_for_tags = '[]'::jsonb)
  AND array_length(perfect_for, 1) > 0;

-- Step 2: Backfill perfect_for from perfect_for_tags (JSONB -> text[])
UPDATE public.products
SET perfect_for = ARRAY(
  SELECT jsonb_array_elements_text(perfect_for_tags)
  WHERE jsonb_typeof(perfect_for_tags) = 'array'
)
WHERE perfect_for_tags IS NOT NULL
  AND jsonb_typeof(perfect_for_tags) = 'array'
  AND jsonb_array_length(perfect_for_tags) > 0
  AND (perfect_for IS NULL OR array_length(perfect_for, 1) = 0);

-- Step 3: Ensure perfect_for_tags defaults to empty array, not null
UPDATE public.products
SET perfect_for_tags = '[]'::jsonb
WHERE perfect_for_tags IS NULL;

-- Step 4: Ensure perfect_for defaults to empty array, not null
UPDATE public.products
SET perfect_for = '{}'
WHERE perfect_for IS NULL;

-- Step 5: Add a trigger to keep both columns in sync on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_perfect_for_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If perfect_for_tags was provided, sync it to perfect_for
  IF NEW.perfect_for_tags IS NOT NULL AND jsonb_typeof(NEW.perfect_for_tags) = 'array' THEN
    NEW.perfect_for := ARRAY(
      SELECT jsonb_array_elements_text(NEW.perfect_for_tags)
      WHERE jsonb_typeof(NEW.perfect_for_tags) = 'array'
    );
  END IF;
  -- If perfect_for was provided (and perfect_for_tags is empty/null), sync it to perfect_for_tags
  IF (NEW.perfect_for_tags IS NULL OR NEW.perfect_for_tags = '[]'::jsonb)
     AND NEW.perfect_for IS NOT NULL
     AND array_length(NEW.perfect_for, 1) > 0 THEN
    NEW.perfect_for_tags := COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(NEW.perfect_for) AS elem WHERE elem IS NOT NULL AND btrim(elem) <> ''),
      '[]'::jsonb
    );
  END IF;
  -- Ensure defaults
  IF NEW.perfect_for_tags IS NULL THEN
    NEW.perfect_for_tags := '[]'::jsonb;
  END IF;
  IF NEW.perfect_for IS NULL THEN
    NEW.perfect_for := '{}';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_perfect_for_columns ON public.products;
CREATE TRIGGER trg_sync_perfect_for_columns
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_perfect_for_columns();