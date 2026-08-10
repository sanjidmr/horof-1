-- ============================================================
-- WAREHOUSE PRODUCTION FIX
-- Fixes warehouse isolation, staff provisioning, and the
-- delivery workflow state machine.
--
-- 1. is_internal_operator(): mirrors the app's INTERNAL_ADMIN_ROLES
--    (admin, super_admin, manager, staff). Used by warehouse-scoped
--    RLS policies so warehouse staff do NOT inherit full-system access.
-- 2. Repair existing warehouse staff profiles (user_type='internal',
--    role='warehouse_staff'). Without user_type='internal' the
--    is_warehouse_staff() helper returns false and RLS blocks staff.
-- 3. Replace is_internal_user() with is_internal_operator() in the
--    warehouse-scoped SELECT/UPDATE policies so staff only see rows
--    for their OWN warehouse (isolation fix).
-- 4. Fix order_requests policy that referenced a non-existent
--    customer_id column.
-- 5. Expand warehouse_assignments.status to include the delivery
--    workflow states (out_for_delivery, delivered, returned).
-- 6. Ensure realtime publication includes warehouse tables.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. INTERNAL OPERATOR HELPER (matches INTERNAL_ADMIN_ROLES)
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
      AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_operator() TO authenticated;

-- Drop legacy "for_warehouse_staff" example policies from 20260805000003
-- (they use is_internal_user(), which would re-broaden access for staff).
DROP POLICY IF EXISTS orders_select_for_warehouse_staff ON public.orders;
DROP POLICY IF EXISTS warehouse_assignments_select_for_warehouse_staff ON public.warehouse_assignments;
DROP POLICY IF EXISTS notifications_select_for_warehouse_staff ON public.notifications;

-- -------------------------------------------------------------------
-- 2. REPAIR EXISTING WAREHOUSE STAFF PROFILES
-- -------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.profiles
  SET user_type = 'internal',
      role = 'warehouse_staff'::public.user_role
  WHERE is_warehouse_staff = true
    AND (user_type IS NULL OR user_type <> 'internal' OR role <> 'warehouse_staff');
END $$;

-- -------------------------------------------------------------------
-- 3. RLS ISOLATION - ORDERS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS orders_select_clean ON public.orders;
CREATE POLICY orders_select_clean ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id = auth.uid()
    OR public.is_internal_operator()
    OR warehouse_staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_warehouse_staff = true
        AND profiles.assigned_warehouse_id = orders.warehouse_id
    )
    OR EXISTS (
      SELECT 1 FROM public.warehouse_assignments wa
      WHERE wa.entity_type = 'order'
        AND wa.entity_id = orders.id
        AND wa.status <> 'cancelled'
        AND wa.warehouse_id = (
          SELECT p.assigned_warehouse_id FROM public.profiles p WHERE p.id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS orders_warehouse_staff_select_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_select_multi ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR user_id = auth.uid()
    OR customer_id = auth.uid()
    OR warehouse_staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND (
          orders.warehouse_id = p.assigned_warehouse_id
          OR p.assigned_warehouse_id IS NULL
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
-- 4. RLS ISOLATION - PRODUCTS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS products_warehouse_staff_select ON public.products;
CREATE POLICY products_warehouse_staff_select ON public.products
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND products.default_warehouse_id = p.assigned_warehouse_id
    )
  );

DROP POLICY IF EXISTS products_warehouse_staff_update ON public.products;
CREATE POLICY products_warehouse_staff_update ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_operator()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_warehouse_staff = true
        AND products.default_warehouse_id = p.assigned_warehouse_id
    )
  );

-- -------------------------------------------------------------------
-- 5. RLS ISOLATION - NOTIFICATIONS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR user_id = auth.uid()
    OR (
      warehouse_id IS NOT NULL
      AND public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = notifications.warehouse_id
      )
    )
    OR (
      warehouse_id IS NULL
      AND user_id IS NULL
      AND public.is_warehouse_staff()
    )
  );

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
CREATE POLICY notifications_delete_policy ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_internal_operator());

-- -------------------------------------------------------------------
-- 6. RLS ISOLATION - WAREHOUSE ASSIGNMENTS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_assignments_select ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_select ON public.warehouse_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR (
      public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = warehouse_assignments.warehouse_id
      )
    )
  );

DROP POLICY IF EXISTS warehouse_assignments_insert ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_insert ON public.warehouse_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_assignments_update ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_update ON public.warehouse_assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_internal_operator()
    OR (
      public.is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = warehouse_assignments.warehouse_id
      )
    )
  );

DROP POLICY IF EXISTS warehouse_assignments_delete ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_delete ON public.warehouse_assignments
  FOR DELETE TO authenticated
  USING (public.is_internal_operator());

-- -------------------------------------------------------------------
-- 7. RLS ISOLATION - WAREHOUSE ACTIVITY LOGS
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_activity_select ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_select ON public.warehouse_activity_logs
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR (
      public.is_warehouse_staff()
      AND (
        warehouse_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_warehouse_staff = true
            AND p.assigned_warehouse_id = warehouse_activity_logs.warehouse_id
        )
      )
    )
  );

DROP POLICY IF EXISTS warehouse_activity_insert ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_insert ON public.warehouse_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 8. RLS ISOLATION - WAREHOUSE PACKING FILES
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS warehouse_packing_select ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_select ON public.warehouse_packing_files
  FOR SELECT TO authenticated
  USING (
    public.is_internal_operator()
    OR (
      public.is_warehouse_staff()
      AND (
        warehouse_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_warehouse_staff = true
            AND p.assigned_warehouse_id = warehouse_packing_files.warehouse_id
        )
      )
    )
  );

DROP POLICY IF EXISTS warehouse_packing_insert ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_insert ON public.warehouse_packing_files
  FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_operator() OR public.is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_packing_delete ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_delete ON public.warehouse_packing_files
  FOR DELETE TO authenticated
  USING (public.is_internal_operator() OR public.is_warehouse_staff());

-- -------------------------------------------------------------------
-- 9. FIX ORDER REQUESTS POLICY (referenced non-existent customer_id)
-- -------------------------------------------------------------------
ALTER TABLE public.order_requests ADD COLUMN IF NOT EXISTS customer_id uuid;

DROP POLICY IF EXISTS order_requests_select_own_or_admin ON public.order_requests;
CREATE POLICY order_requests_select_own_or_admin ON public.order_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id = auth.uid()
    OR public.is_internal_operator()
  );

-- -------------------------------------------------------------------
-- 10. EXPAND WAREHOUSE ASSIGNMENTS STATUS (delivery workflow)
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
-- 11. REALTIME PUBLICATION (idempotent)
-- -------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_packing_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
