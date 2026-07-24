-- ============================================================================
-- FIX ORDER WORKFLOW: Critical Schema + RLS Fixes
-- ============================================================================
-- This migration fixes all critical issues found in the audit:
-- 1. Adds user_id to orders (referenced everywhere but never created)
-- 2. Fixes RLS policies that reference non-existent columns
-- 3. Extends order_status to TEXT (enum too restrictive for full workflow)
-- 4. Adds is_warehouse_staff / warehouse_staff role support
-- 5. Fixes warehouse accept/reject flow
-- 6. Cleans up duplicate RLS policies
-- ============================================================================

-- ─── 1. Add user_id to orders (missing column referenced by RLS + code) ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

    -- Backfill from customer_id where possible
    UPDATE public.orders SET user_id = customer_id WHERE user_id IS NULL;
  END IF;
END $$;

-- ─── 2. Extend order_status to TEXT (enum too restrictive) ───────────────────
-- The workflow needs: pending, confirmed, admin_approved, warehouse_assigned,
-- warehouse_reviewing, warehouse_approved, processing, packed, ready_for_pickup,
-- shipped, in_transit, out_for_delivery, delivered, cancelled, returned, refunded
-- But the enum only has: pending, processing, shipped, delivered, cancelled, returned

-- We can't drop enum type if columns use it. Instead, ensure the column is TEXT.
-- Since the column was created as order_status enum, we alter it to TEXT.
DO $$
BEGIN
  -- Check if status column uses enum type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'status'
    AND udt_name = 'order_status'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN status TYPE text USING status::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
    AND udt_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN payment_status TYPE text USING payment_status::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_timeline' AND column_name = 'status'
    AND udt_name = 'order_status'
  ) THEN
    ALTER TABLE public.order_timeline ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- ─── 3. Ensure order_requests has rejection_reason, admin_notes, request_changes_note ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_requests' AND column_name = 'rejection_reason') THEN
    ALTER TABLE public.order_requests ADD COLUMN rejection_reason text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_requests' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.order_requests ADD COLUMN admin_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_requests' AND column_name = 'request_changes_note') THEN
    ALTER TABLE public.order_requests ADD COLUMN request_changes_note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_requests' AND column_name = 'approval_date') THEN
    ALTER TABLE public.order_requests ADD COLUMN approval_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_requests' AND column_name = 'rejection_date') THEN
    ALTER TABLE public.order_requests ADD COLUMN rejection_date timestamptz;
  END IF;
END $$;

-- ─── 4. Ensure warehouse columns exist on orders ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_id') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_staff_id') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_status') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_status text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_notes') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_estimated_dispatch') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_estimated_dispatch timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_dispatch_date') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_dispatch_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'admin_final_confirmed_at') THEN
    ALTER TABLE public.orders ADD COLUMN admin_final_confirmed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipped_at') THEN
    ALTER TABLE public.orders ADD COLUMN shipped_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'completed_at') THEN
    ALTER TABLE public.orders ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- ─── 5. Ensure profiles has warehouse staff fields ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_warehouse_staff') THEN
    ALTER TABLE public.profiles ADD COLUMN is_warehouse_staff boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'assigned_warehouse_id') THEN
    ALTER TABLE public.profiles ADD COLUMN assigned_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 6. Ensure notifications has user targeting ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
    ALTER TABLE public.notifications ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_id') THEN
    ALTER TABLE public.notifications ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_request_id') THEN
    ALTER TABLE public.notifications ADD COLUMN order_request_id uuid REFERENCES public.order_requests(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url text;
  END IF;
END $$;

-- ─── 7. Ensure order_timeline has step_type ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_timeline' AND column_name = 'step_type') THEN
    ALTER TABLE public.order_timeline ADD COLUMN step_type text DEFAULT 'admin';
  END IF;
END $$;

-- ─── 8. Fix RLS: Drop ALL old duplicate policies and recreate clean ones ────

-- ORDERS TABLE: Clean slate
ALTER POLICY IF EXISTS orders_select ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_insert ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_update ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_delete ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_select_policy ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_insert_policy ON public.orders DISABLE ROW LEVEL SECURITY;
ALTER POLICY IF EXISTS orders_update_policy ON public.orders DISABLE ROW LEVEL SECURITY;

-- Drop old policies by name (ignore errors if they don't exist)
DO $$ BEGIN DROP POLICY IF EXISTS orders_select ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_insert ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_update ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_delete ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_select_policy ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_insert_policy ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS orders_update_policy ON public.orders; EXCEPTION WHEN others THEN NULL; END $$;

-- Re-enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders: SELECT - customers see own orders, admins see all, warehouse staff see assigned
CREATE POLICY orders_select_clean ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id = auth.uid()
    OR is_admin()
    OR (
      warehouse_staff_id = auth.uid()
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_warehouse_staff = true
        AND profiles.assigned_warehouse_id = orders.warehouse_id
      )
    )
  );

-- Orders: INSERT - authenticated users (for order creation)
CREATE POLICY orders_insert_clean ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Orders: UPDATE - admins and assigned warehouse staff
CREATE POLICY orders_update_clean ON public.orders
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR warehouse_staff_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_warehouse_staff = true
        AND profiles.assigned_warehouse_id = orders.warehouse_id
      )
    )
  );

-- Orders: DELETE - admins only
CREATE POLICY orders_delete_clean ON public.orders
  FOR DELETE TO authenticated
  USING (is_admin());

-- ORDER_REQUESTS TABLE: Fix RLS
DO $$ BEGIN DROP POLICY IF EXISTS order_requests_select_own_or_admin ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS order_requests_insert_authenticated ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS order_requests_admin_policy ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "order_requests_select_own" ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "order_requests_insert_auth" ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "order_requests_admin_all" ON public.order_requests; EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_requests_select_clean ON public.order_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY order_requests_insert_clean ON public.order_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY order_requests_update_clean ON public.order_requests
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY order_requests_delete_clean ON public.order_requests
  FOR DELETE TO authenticated
  USING (is_admin());

-- ORDER_TIMELINE TABLE: Fix RLS to allow warehouse staff view
DO $$ BEGIN DROP POLICY IF EXISTS order_timeline_select ON public.order_timeline; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS order_timeline_mutate ON public.order_timeline; EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_timeline_select_clean ON public.order_timeline
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_timeline.order_id
      AND (
        orders.user_id = auth.uid()
        OR orders.customer_id = auth.uid()
        OR orders.warehouse_staff_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_warehouse_staff = true
          AND profiles.assigned_warehouse_id = orders.warehouse_id
        )
      )
    )
  );

CREATE POLICY order_timeline_insert_clean ON public.order_timeline
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- NOTIFICATIONS TABLE: Clean up
DO $$ BEGIN DROP POLICY IF EXISTS notifications_select ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS notifications_insert ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS notifications_update ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS notifications_delete ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Notifications SELECT" ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Notifications INSERT" ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Notifications UPDATE" ON public.notifications; EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_clean ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR user_id IS NULL
  );

CREATE POLICY notifications_insert_clean ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY notifications_update_clean ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY notifications_delete_clean ON public.notifications
  FOR DELETE TO authenticated
  USING (is_admin());

-- ─── 9. Ensure indexes exist for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_id ON public.orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_staff_id ON public.orders(warehouse_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_status ON public.orders(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON public.order_timeline(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_warehouse_staff ON public.profiles(is_warehouse_staff);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_warehouse ON public.profiles(assigned_warehouse_id);
