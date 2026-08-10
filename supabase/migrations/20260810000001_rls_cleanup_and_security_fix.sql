-- Migration: RLS Cleanup and Security Fix
-- Date: 2026-08-10
-- 
-- 1. DROP dangerous leftover policies from 20260723000001
--    - notifications_insert_clean: WITH CHECK (true) allows ANY user to insert notifications
--    - notifications_update_clean: duplicate of notifications_update_policy
--    - notifications_delete_clean: duplicate of notifications_delete_policy
--
-- 2. DROP duplicate order policies
--    - orders_insert_clean: replaced by orders_insert_clean in 20260723000001
--    - orders_update_clean: replaced by orders_warehouse_staff_update_multi in 20260804000001
--    - orders_delete_clean: keep the latest version
--
-- 3. Verify warehouse_assignments has proper policies (no duplicates found)

-- ============================================================
-- PART 1: Drop dangerous notification policies
-- ============================================================

-- CRITICAL: This policy uses WITH CHECK (true), meaning ANY authenticated user
-- (including customers) can insert notifications, completely bypassing the
-- intended admin/warehouse-only restriction.
DROP POLICY IF EXISTS notifications_insert_clean ON public.notifications;

-- These are duplicates of the newer policies in 20260803000000 and 20260804000001
DROP POLICY IF EXISTS notifications_update_clean ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_clean ON public.notifications;

-- ============================================================
-- PART 2: Drop duplicate order policies
-- ============================================================

-- The INSERT policy from 20260723000001 was never dropped; the newer version
-- in the same migration or later takes precedence, but the old one remains
-- as dead code. Drop it for clarity.
DROP POLICY IF EXISTS orders_insert_clean ON public.orders;

-- The UPDATE policy from 20260723000001 overlaps with 
-- orders_warehouse_staff_update_multi from 20260804000001
DROP POLICY IF EXISTS orders_update_clean ON public.orders;

-- The DELETE policy from 20260723000001 overlaps with the one in 20260804000001
DROP POLICY IF EXISTS orders_delete_clean ON public.orders;

-- ============================================================
-- PART 3: Verify final policy state (for documentation)
-- ============================================================

-- After cleanup, the effective policies should be:
--
-- notifications:
--   SELECT: notifications_select_policy (from 20260804000001)
--   INSERT: notifications_insert_policy (from 20260804000001) - admin/warehouse_staff only
--   UPDATE: notifications_update_policy (from 20260803000000)
--   DELETE: notifications_delete_policy (from 20260804000001)
--
-- orders:
--   SELECT: orders_select_clean (from 20260804000001) + orders_warehouse_staff_select_multi (from 20260804000001)
--   INSERT: orders_insert (from initial migration)
--   UPDATE: orders_warehouse_staff_update_multi (from 20260804000001)
--   DELETE: orders_delete (from initial migration)
--
-- warehouse_assignments:
--   SELECT: warehouse_assignments_select (from 20260804000001)
--   INSERT: warehouse_assignments_insert (from 20260804000001)
--   UPDATE: warehouse_assignments_update (from 20260804000001)
--   DELETE: warehouse_assignments_delete (from 20260804000001)

-- ============================================================
-- PART 4: Ensure realtime publication includes all warehouse tables
-- ============================================================

-- These are idempotent (ALTER PUBLICATION ... ADD TABLE is safe to re-run)
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_packing_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
