-- ============================================================
-- WAREHOUSE ASSIGNMENT: Index & RLS Improvements
-- Migration: add supplemental indexes to improve query plans for
-- warehouse assignment/activity/packing/notifications lookups.
-- Non-destructive (creates indexes only).
-- ============================================================

-- 1) Supplemental composite indexes
-- These indexes help when queries filter by entity_type AND entity_id
-- (for example: WHERE entity_type = 'order' AND entity_id = $1)
CREATE INDEX IF NOT EXISTS idx_wh_assign_entity_type_id
  ON public.warehouse_assignments(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_wh_activity_entity_type_id
  ON public.warehouse_activity_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_wh_packing_entity_type_id
  ON public.warehouse_packing_files(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_notifications_entity_type_id
  ON public.notifications(entity_type, entity_id);

-- 2) VACUUM / ANALYZE recommendation
-- If this runs on large tables, consider running ANALYZE on the affected
-- tables to refresh planner statistics so new indexes are used.
-- Example (run manually after migration completes):
-- ANALYZE public.warehouse_assignments;
-- ANALYZE public.warehouse_activity_logs;
-- ANALYZE public.warehouse_packing_files;
-- ANALYZE public.notifications;

-- 3) RLS guidance (manual review required)
-- The previous migration converted notifications.entity_id to uuid and
-- introduced FK constraints. Verify any existing RLS policies that
-- reference notifications.entity_id (or that compare entity_id::text)
-- and update them to account for the new uuid type.
--
-- NOTE: Warehouse-scoped RLS policies are now managed by
-- migration 20260812000000_warehouse_production_fix.sql using the
-- is_internal_operator() helper. Do NOT use is_internal_user() for
-- warehouse-scoped SELECT/UPDATE policies, because warehouse staff are
-- internal users and would inherit full-system access.
-- End of migration
