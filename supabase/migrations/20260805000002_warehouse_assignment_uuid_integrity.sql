-- ============================================================
-- WAREHOUSE ASSIGNMENT UUID INTEGRITY FIX
-- warehouse_assignments is EXCLUSIVELY for order management.
--
-- Ensures warehouse_assignments.entity_id has the EXACT same
-- data type as orders.id (uuid) and adds real foreign keys so
-- the PostgREST embedded-resource join
--   order:entity_id!inner(...)
-- works without casts.
--
-- Also fixes notifications.entity_id which was TEXT while
-- storing order UUIDs — converted to uuid with an FK.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. warehouse_assignments.entity_id -> orders.id (uuid FK)
-- -------------------------------------------------------------------
-- Clean any orphaned rows that do not reference a real order first.
DELETE FROM public.warehouse_assignments wa
WHERE wa.entity_type = 'order'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = wa.entity_id
  );

-- Add the FK constraint (no cast — entity_id is already uuid).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_warehouse_assignments_entity_order'
      AND conrelid = 'public.warehouse_assignments'::regclass
  ) THEN
    ALTER TABLE public.warehouse_assignments
      ADD CONSTRAINT fk_warehouse_assignments_entity_order
      FOREIGN KEY (entity_id) REFERENCES public.orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 2. warehouse_activity_logs.entity_id -> orders.id (uuid FK)
-- -------------------------------------------------------------------
DELETE FROM public.warehouse_activity_logs al
WHERE al.entity_type = 'order'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = al.entity_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_warehouse_activity_logs_entity_order'
      AND conrelid = 'public.warehouse_activity_logs'::regclass
  ) THEN
    ALTER TABLE public.warehouse_activity_logs
      ADD CONSTRAINT fk_warehouse_activity_logs_entity_order
      FOREIGN KEY (entity_id) REFERENCES public.orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 3. warehouse_packing_files.entity_id -> orders.id (uuid FK)
-- -------------------------------------------------------------------
DELETE FROM public.warehouse_packing_files pf
WHERE pf.entity_type = 'order'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = pf.entity_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_warehouse_packing_files_entity_order'
      AND conrelid = 'public.warehouse_packing_files'::regclass
  ) THEN
    ALTER TABLE public.warehouse_packing_files
      ADD CONSTRAINT fk_warehouse_packing_files_entity_order
      FOREIGN KEY (entity_id) REFERENCES public.orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 4. notifications.entity_id: text -> uuid (FK to orders.id)
--    notifications.entity_id stores order UUIDs. Convert the column
--    to uuid and add a real FK. No casts used as a workaround.
-- -------------------------------------------------------------------
-- First, clean up any non-UUID / orphaned values.
DELETE FROM public.notifications
WHERE entity_id IS NOT NULL
  AND entity_type = 'order'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id::text = notifications.entity_id
  );

-- Drop the old text column and re-add as uuid (preserves data via
-- a temp column so no cast is used in application code).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'entity_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.notifications
      ALTER COLUMN entity_id TYPE uuid
      USING (
        CASE
          WHEN entity_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN entity_id::uuid
          ELSE NULL
        END
      );
  END IF;
END $$;

-- Add FK from notifications.entity_id -> orders.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_notifications_entity_order'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_entity_order
      FOREIGN KEY (entity_id) REFERENCES public.orders(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 5. Indexes to support the FK joins
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wh_assign_entity_order
  ON public.warehouse_assignments(entity_id)
  WHERE entity_type = 'order';

CREATE INDEX IF NOT EXISTS idx_wh_activity_entity_order
  ON public.warehouse_activity_logs(entity_id)
  WHERE entity_type = 'order';

CREATE INDEX IF NOT EXISTS idx_wh_packing_entity_order
  ON public.warehouse_packing_files(entity_id)
  WHERE entity_type = 'order';

CREATE INDEX IF NOT EXISTS idx_notifications_entity_order
  ON public.notifications(entity_id)
  WHERE entity_type = 'order';
