-- ============================================================
-- WAREHOUSE ASSIGNMENT WORKFLOW COMPLETE FIX
--
-- Fixes the broken warehouse assignment workflow end-to-end:
-- 1. is_internal_operator() must include warehouse_staff role
--    (so warehouse staff can pass requirePermission checks)
-- 2. orders.status must allow all warehouse workflow statuses
-- 3. notifications RLS must allow warehouse staff to insert
-- 4. warehouse_assignments RLS must allow warehouse staff to insert
-- 5. Ensure realtime publication includes all warehouse tables
-- ============================================================

-- -------------------------------------------------------------------
-- 1. FIX is_internal_operator() to include warehouse_staff
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_internal_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND (
        p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role, 'warehouse_staff'::public.user_role)
        OR p.is_warehouse_staff = true
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO authenticated;

-- -------------------------------------------------------------------
-- 2. FIX is_admin() to include warehouse_staff as internal operator
--    (so warehouse staff can pass RLS checks that use is_admin())
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND (
        p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role)
        OR p.is_warehouse_staff = true
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- -------------------------------------------------------------------
-- 3. FIX is_warehouse_staff() to be more robust
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_warehouse_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.user_type = 'internal'
      AND (p.role = 'warehouse_staff'::public.user_role OR p.is_warehouse_staff = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_warehouse_staff() TO authenticated;

-- -------------------------------------------------------------------
-- 4. ENSURE orders.status has NO restrictive CHECK constraint
--    (status is TEXT, so no enum constraint should block writes)
-- -------------------------------------------------------------------
DO $$
BEGIN
  -- Drop any CHECK constraint on orders.status that might block warehouse statuses
  DECLARE
    con record;
  BEGIN
    FOR con IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.orders'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', con.conname);
    END LOOP;
  END;
END $$;

-- -------------------------------------------------------------------
-- 5. ENSURE notifications RLS allows warehouse staff to insert
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 6. ENSURE warehouse_assignments RLS allows warehouse staff to insert
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_assignments_insert ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_insert ON public.warehouse_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 7. ENSURE warehouse_activity_logs RLS allows warehouse staff to insert
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_activity_insert ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_insert ON public.warehouse_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 8. ENSURE warehouse_packing_files RLS allows warehouse staff to insert
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_packing_insert ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_insert ON public.warehouse_packing_files
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 9. ENSURE orders RLS allows warehouse staff to update
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS orders_warehouse_staff_update_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_update_multi ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_operator()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND (
          orders.warehouse_id = p.assigned_warehouse_id
          OR EXISTS (
            SELECT 1 FROM public.warehouse_assignments wa
            WHERE wa.entity_type = 'order'
              AND wa.entity_id = orders.id
              AND wa.warehouse_id = p.assigned_warehouse_id
              AND wa.status <> 'cancelled'
          )
        )
    )
  );

-- -------------------------------------------------------------------
-- 10. ENSURE realtime publication includes all warehouse tables
-- -------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.warehouse_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.warehouse_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.warehouse_packing_files;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.products;

-- -------------------------------------------------------------------
-- 11. ENSURE warehouse_assignments.status CHECK includes all states
-- -------------------------------------------------------------------
ALTER TABLE public.warehouse_assignments DROP CONSTRAINT IF EXISTS warehouse_assignments_status_check;
ALTER TABLE public.warehouse_assignments
  ADD CONSTRAINT warehouse_assignments_status_check
  CHECK (status IN (
    'assigned',
    'accepted',
    'rejected',
    'processing',
    'packed',
    'ready_for_dispatch',
    'out_for_delivery',
    'delivered',
    'returned',
    'completed',
    'cancelled'
  ));

-- -------------------------------------------------------------------
-- 12. ENSURE notifications.entity_id is uuid (for FK to orders.id)
-- -------------------------------------------------------------------
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

-- -------------------------------------------------------------------
-- 13. ENSURE notifications.order_id FK exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 14. ENSURE orders.warehouse_staff_id column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'warehouse_staff_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 15. ENSURE orders.assignment_priority column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assignment_priority'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN assignment_priority text DEFAULT 'normal'
      CHECK (assignment_priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 16. ENSURE orders.warehouse_notes column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'warehouse_notes'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_notes text;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 17. ENSURE orders.warehouse_status column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'warehouse_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_status text DEFAULT NULL;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 18. ENSURE orders.warehouse_id column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 19. ENSURE orders.packing_status column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'packing_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN packing_status text DEFAULT 'not_started'
      CHECK (packing_status IN ('not_started', 'in_progress', 'packed', 'verified'));
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 20. ENSURE orders.shipping_ready column exists
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_ready'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_ready boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 21. ENSURE orders.packed_at / ready_for_dispatch_at / delivered_at columns exist
-- -------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'packed_at') THEN
    ALTER TABLE public.orders ADD COLUMN packed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ready_for_dispatch_at') THEN
    ALTER TABLE public.orders ADD COLUMN ready_for_dispatch_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at timestamptz;
  END IF;
END $$;

-- -------------------------------------------------------------------
-- 22. ENSURE indexes exist for performance
-- -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_id ON public.orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_staff_id ON public.orders(warehouse_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_status ON public.orders(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_wh_assign_entity ON public.warehouse_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wh_assign_warehouse ON public.warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_assign_status ON public.warehouse_assignments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_warehouse ON public.notifications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_notifications_assignment ON public.notifications(warehouse_assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order ON public.notifications(order_id);