-- ============================================================
-- WAREHOUSE ASSIGNMENT: Index & RLS Improvements
-- Migration: add supplemental indexes to improve query plans for
-- warehouse assignment/activity/packing/notifications lookups
-- and provide guidance for RLS policies that must be verified/updated
-- after the UUID/type changes made in prior migration
-- IMPORTANT: This migration is non-destructive (creates indexes only)
-- Run in normal deployment. RLS changes are shown as guidance below
-- and should be applied after review in a maintenance window.
-- ============================================================

-- 1) Supplemental composite indexes
-- These indexes help when queries filter by entity_type AND entity_id
-- (for example: WHERE entity_type = 'order' AND entity_id = $1)
-- The previous migration created useful partial indexes already; these
-- are supplemental for broader query patterns or analytical queries.

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

-- Example policy templates (EXAMPLES ONLY — REVIEW before applying):
-- Note: These examples assume you expose assigned_warehouse_id in JWT
-- claims as jwt.claims.assigned_warehouse_id or that you use a helper
-- function (is_internal_user()). Adapt to your environment.

-- -- Allow internal users (admins) full access, warehouse staff limited to their warehouse:
-- CREATE POLICY orders_select_for_warehouse_staff ON public.orders
--   FOR SELECT USING (
--     is_internal_user() OR (
--       current_setting('jwt.claims.assigned_warehouse_id', true) IS NOT NULL
--       AND orders.warehouse_id = current_setting('jwt.claims.assigned_warehouse_id', true)::uuid
--     )
--   );

-- CREATE POLICY warehouse_assignments_select_for_warehouse_staff ON public.warehouse_assignments
--   FOR SELECT USING (
--     is_internal_user() OR (
--       current_setting('jwt.claims.assigned_warehouse_id', true) IS NOT NULL
--       AND warehouse_assignments.warehouse_id = current_setting('jwt.claims.assigned_warehouse_id', true)::uuid
--     )
--   );

-- CREATE POLICY notifications_select_for_warehouse_staff ON public.notifications
--   FOR SELECT USING (
--     is_internal_user() OR (
--       current_setting('jwt.claims.assigned_warehouse_id', true) IS NOT NULL
--       -- notifications.entity_id references orders.id
--       AND EXISTS (
--         SELECT 1 FROM public.orders o
--         WHERE o.id = notifications.entity_id
--           AND o.warehouse_id = current_setting('jwt.claims.assigned_warehouse_id', true)::uuid
--       )
--     )
--   );

-- IMPORTANT: Do NOT blindly apply the example policies above. Instead:
-- 1) Confirm whether assigned_warehouse_id is present in JWT claims (auth/app_metadata)
-- 2) If it is not present in the JWT, consider using secure helper functions
--    to look up the profile.assigned_warehouse_id in policies (may require
--    additional security considerations).
-- 3) Test RLS policies with a staging user session matching a Warehouse Staff
--    JWT to ensure they can SELECT/UPDATE the expected rows and nothing else.

-- End of migration
