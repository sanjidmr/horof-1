-- ============================================================
-- ENTERPRISE WAREHOUSE MANAGEMENT SYSTEM UPGRADE
-- Multi-warehouse assignment, activity logs, packing files,
-- review & approval, realtime sync, secure RLS
-- ============================================================

-- -------------------------------------------------------------------
-- 1. WAREHOUSE ASSIGNMENTS (central join table: order → warehouse)
--    entity_type: 'order' ONLY
--    warehouse_assignments is dedicated EXCLUSIVELY to order management.
--    Products use their own warehouse fields (default_warehouse_id)
--    and inventory tables (stock_movements, stock_transfers).
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'order' CHECK (entity_type = 'order'),
  entity_id uuid NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by_name text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN (
      'assigned',          -- Just assigned, awaiting warehouse action
      'accepted',          -- Warehouse accepted the task
      'rejected',          -- Warehouse rejected the task
      'processing',        -- In progress
      'packed',            -- Packed by warehouse
      'ready_for_dispatch',-- Ready for dispatch
      'completed',         -- Fully completed
      'cancelled'          -- Assignment cancelled by admin
    )),
  admin_approval text NOT NULL DEFAULT 'pending'
    CHECK (admin_approval IN ('pending', 'approved', 'rejected', 'override')),
  admin_approval_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_approval_at timestamptz,
  admin_approval_notes text,
  processing_status text DEFAULT 'not_started'
    CHECK (processing_status IN ('not_started', 'in_progress', 'paused', 'completed')),
  packing_status text DEFAULT 'not_started'
    CHECK (packing_status IN ('not_started', 'in_progress', 'packed', 'verified')),
  shipping_ready boolean NOT NULL DEFAULT false,
  notes text,
  assigned_notes text,
  scheduled_at timestamptz,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  packed_at timestamptz,
  ready_for_dispatch_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancel_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- No duplicate assignment of same order to same warehouse
  CONSTRAINT uq_warehouse_assignment UNIQUE (entity_type, entity_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_wh_assign_entity ON public.warehouse_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wh_assign_warehouse ON public.warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_assign_status ON public.warehouse_assignments(status);
CREATE INDEX IF NOT EXISTS idx_wh_assign_priority ON public.warehouse_assignments(priority);
CREATE INDEX IF NOT EXISTS idx_wh_assign_assigned_by ON public.warehouse_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_wh_assign_created ON public.warehouse_assignments(assigned_at DESC);

-- -------------------------------------------------------------------
-- 2. WAREHOUSE ACTIVITY LOG (append-only; nothing is ever overwritten)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.warehouse_assignments(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'order' CHECK (entity_type = 'order'),
  entity_id uuid NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text DEFAULT 'warehouse_staff' CHECK (actor_role IN ('admin', 'warehouse_staff', 'system')),
  old_value jsonb,
  new_value jsonb,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_activity_assignment ON public.warehouse_activity_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_wh_activity_entity ON public.warehouse_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wh_activity_warehouse ON public.warehouse_activity_logs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_activity_actor ON public.warehouse_activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_wh_activity_created ON public.warehouse_activity_logs(created_at DESC);

-- -------------------------------------------------------------------
-- 3. WAREHOUSE PACKING FILES (images/files uploaded for packing)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_packing_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.warehouse_assignments(id) ON DELETE CASCADE,
  entity_type text NOT NULL DEFAULT 'order' CHECK (entity_type = 'order'),
  entity_id uuid NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  note text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_packing_assignment ON public.warehouse_packing_files(assignment_id);
CREATE INDEX IF NOT EXISTS idx_wh_packing_entity ON public.warehouse_packing_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wh_packing_warehouse ON public.warehouse_packing_files(warehouse_id);

-- -------------------------------------------------------------------
-- 4. EXTEND orders TABLE — packing & dispatch readiness
-- -------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS packing_status text DEFAULT 'not_started'
    CHECK (packing_status IN ('not_started', 'in_progress', 'packed', 'verified')),
  ADD COLUMN IF NOT EXISTS shipping_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS packed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_for_dispatch_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS override_notes text,
  ADD COLUMN IF NOT EXISTS assignment_priority text DEFAULT 'normal'
    CHECK (assignment_priority IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_orders_packing_status ON public.orders(packing_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_ready ON public.orders(shipping_ready);

-- -------------------------------------------------------------------
-- 5. EXTEND notifications — warehouse-targeted notifications
-- -------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS warehouse_assignment_id uuid REFERENCES public.warehouse_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text;

-- Expand notification type check to include 'warehouse' and 'assignment'
DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('order', 'customer', 'stock', 'product', 'security', 'backup', 'design', 'warehouse', 'assignment'));

CREATE INDEX IF NOT EXISTS idx_notifications_warehouse ON public.notifications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_notifications_assignment ON public.notifications(warehouse_assignment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE user_id IS NOT NULL;

-- -------------------------------------------------------------------
-- 6. FIX NOTIFICATIONS RLS — allow warehouse staff to insert & read
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
DROP POLICY IF EXISTS notifications_select_clean ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_select_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin_2 ON public.notifications;

-- SELECT: admin sees all; user sees own; warehouse staff sees
-- notifications targeted to their warehouse (warehouse_id = assigned_warehouse_id
-- OR warehouse staff role + warehouse_id IS NULL broadcast admin notifications)
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR (
      warehouse_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
    )
    OR (
      warehouse_id IS NOT NULL
      AND is_warehouse_staff()
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
      AND is_warehouse_staff()
    )
  );

-- INSERT: admins AND warehouse staff (server actions run as authenticated)
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_warehouse_staff());

-- UPDATE: own notifications or admin or warehouse staff assigned to target warehouse
CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
    OR (
      warehouse_id IS NOT NULL
      AND is_warehouse_staff()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_warehouse_staff = true
          AND p.assigned_warehouse_id = notifications.warehouse_id
      )
    )
  );

-- DELETE: admin only
CREATE POLICY notifications_delete_policy ON public.notifications
  FOR DELETE TO authenticated
  USING (is_admin());

-- -------------------------------------------------------------------
-- 7. RLS FOR NEW TABLES
-- -------------------------------------------------------------------

-- warehouse_assignments (orders only)
ALTER TABLE public.warehouse_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_assignments_select ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_select ON public.warehouse_assignments
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      is_warehouse_staff()
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
  WITH CHECK (is_admin() OR is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_assignments_update ON public.warehouse_assignments;
CREATE POLICY warehouse_assignments_update ON public.warehouse_assignments
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR (
      is_warehouse_staff()
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
  USING (is_admin());

-- warehouse_activity_logs
ALTER TABLE public.warehouse_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_activity_select ON public.warehouse_activity_logs;
CREATE POLICY warehouse_activity_select ON public.warehouse_activity_logs
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      is_warehouse_staff()
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
  WITH CHECK (is_admin() OR is_warehouse_staff());

-- warehouse_packing_files
ALTER TABLE public.warehouse_packing_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_packing_select ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_select ON public.warehouse_packing_files
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (
      is_warehouse_staff()
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
  WITH CHECK (is_admin() OR is_warehouse_staff());

DROP POLICY IF EXISTS warehouse_packing_delete ON public.warehouse_packing_files;
CREATE POLICY warehouse_packing_delete ON public.warehouse_packing_files
  FOR DELETE TO authenticated
  USING (is_admin() OR is_warehouse_staff());

-- -------------------------------------------------------------------
-- 8. FIX ORDERS RLS — support multi-warehouse assignment
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS orders_warehouse_staff_select_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_select_multi ON public.orders
  FOR SELECT TO authenticated
  USING (
    is_admin()
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

-- Warehouse staff can update orders assigned to their warehouse
DROP POLICY IF EXISTS orders_warehouse_staff_update_multi ON public.orders;
CREATE POLICY orders_warehouse_staff_update_multi ON public.orders
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR (
      EXISTS (
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
    )
  );

-- -------------------------------------------------------------------
-- 9. REALTIME — enable all warehouse tables
-- -------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_packing_files;

-- Ensure notifications + orders + products are on realtime too
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- -------------------------------------------------------------------
-- 10. HELPERS
-- -------------------------------------------------------------------

-- Get warehouse staff profile for a user (used by server actions)
CREATE OR REPLACE FUNCTION public.get_user_warehouse_profile()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  is_warehouse_staff boolean,
  assigned_warehouse_id uuid,
  role text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.is_warehouse_staff, p.assigned_warehouse_id, p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Ensure updated_at triggers for warehouse_assignments
CREATE OR REPLACE FUNCTION public.touch_warehouse_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warehouse_assignment_touch ON public.warehouse_assignments;
CREATE TRIGGER trg_warehouse_assignment_touch
  BEFORE UPDATE ON public.warehouse_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_warehouse_assignment();