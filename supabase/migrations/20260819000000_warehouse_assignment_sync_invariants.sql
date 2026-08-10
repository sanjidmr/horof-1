-- ============================================================
-- WAREHOUSE ASSIGNMENT SYNC INVARIANTS
--
-- Makes warehouse_assignments the single source of truth:
--   1. DB trigger syncs orders (warehouse_id / warehouse_status /
--      status / packing / shipping flags) from warehouse_assignments
--      so no code path can leave them out of sync.
--   2. Tightens is_admin() back to role-based admins only so
--      warehouse staff do not get full cross-warehouse visibility.
--   3. Repairs profiles: warehouse staff MUST have user_type='internal'
--      or every RLS gate (is_admin / is_internal_operator /
--      is_warehouse_staff) silently rejects them.
--   4. Enforces the "no NULL linkage" rule on notifications:
--      assignment/warehouse notifications MUST reference a real
--      assignment + order + entity; warehouse notifications MUST
--      carry a warehouse_id.
--   5. Backfills warehouse_assignments for pre-existing assigned
--      orders so the dashboard is never empty for legacy data.
-- ============================================================

-- -------------------------------------------------------------------
-- 1. orders.status lifecycle rank (used to never regress orders.status)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_status_rank(status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE status
    WHEN 'admin_approved' THEN 1
    WHEN 'warehouse_assigned' THEN 2
    WHEN 'warehouse_reviewing' THEN 3
    WHEN 'processing' THEN 4
    WHEN 'ready_for_dispatch' THEN 5
    WHEN 'order_confirmed' THEN 6
    WHEN 'shipped' THEN 7
    WHEN 'out_for_delivery' THEN 8
    WHEN 'delivered' THEN 9
    WHEN 'completed' THEN 10
    ELSE 0
  END;
$$;

GRANT EXECUTE ON FUNCTION public.order_status_rank(text) TO authenticated;

-- -------------------------------------------------------------------
-- 2. Trigger: sync orders from warehouse_assignments
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_orders_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := NEW.entity_id;
  v_current_status text;
  v_new_status text;
  v_current_rank integer;
  v_new_rank integer;
BEGIN
  -- warehouse_assignments is EXCLUSIVELY for orders
  IF NEW.entity_type <> 'order' THEN
    RETURN NEW;
  END IF;

  -- ── Cancellation: revert the order ONLY if this was the active
  --    assignment and no other non-cancelled assignment remains ──
  IF NEW.status = 'cancelled' THEN
    UPDATE public.orders o
       SET warehouse_id = NULL,
           warehouse_status = NULL,
           status = 'pending',
           warehouse_staff_id = NULL
     WHERE o.id = v_order_id
       AND o.warehouse_id = NEW.warehouse_id
       AND NOT EXISTS (
         SELECT 1 FROM public.warehouse_assignments wa
         WHERE wa.entity_type = 'order'
           AND wa.entity_id = v_order_id
           AND wa.warehouse_id <> NEW.warehouse_id
           AND wa.status <> 'cancelled'
       );
    RETURN NEW;
  END IF;

  SELECT status INTO v_current_status
    FROM public.orders WHERE id = v_order_id;
  IF v_current_status IS NULL THEN
    RAISE NOTICE 'sync_orders_from_assignment: order % not found', v_order_id;
    RETURN NEW;
  END IF;

  -- Map assignment.status -> orders.status
  CASE NEW.status
    WHEN 'assigned' THEN v_new_status := 'warehouse_assigned';
    WHEN 'accepted' THEN v_new_status := 'warehouse_reviewing';
    WHEN 'rejected' THEN v_new_status := 'warehouse_rejected';
    WHEN 'processing' THEN v_new_status := 'processing';
    WHEN 'packed' THEN v_new_status := 'processing';
    WHEN 'ready_for_dispatch' THEN v_new_status := 'ready_for_dispatch';
    WHEN 'out_for_delivery' THEN v_new_status := 'out_for_delivery';
    WHEN 'delivered' THEN v_new_status := 'delivered';
    WHEN 'returned' THEN v_new_status := 'returned';
    WHEN 'completed' THEN v_new_status := 'completed';
    ELSE v_new_status := v_current_status;
  END CASE;

  v_current_rank := public.order_status_rank(v_current_status);
  v_new_rank := public.order_status_rank(v_new_status);

  -- warehouse mirror fields are ALWAYS written (the mirror is exact)
  UPDATE public.orders o
     SET warehouse_id = NEW.warehouse_id,
         warehouse_status = NEW.status,
         assignment_priority = COALESCE(NEW.priority, o.assignment_priority),
         warehouse_notes = COALESCE(NEW.notes, o.warehouse_notes),
         packing_status = CASE
           WHEN NEW.packing_status IS NOT NULL THEN NEW.packing_status
           WHEN NEW.status = 'packed' THEN 'packed'
           WHEN NEW.status IN ('ready_for_dispatch','out_for_delivery','delivered','completed') THEN 'verified'
           ELSE o.packing_status
         END,
         shipping_ready = CASE
           WHEN NEW.status IN ('ready_for_dispatch','out_for_delivery','delivered','completed') THEN true
           WHEN NEW.status = 'returned' THEN false
           ELSE o.shipping_ready
         END,
         packed_at = CASE
           WHEN NEW.status = 'packed' THEN COALESCE(NEW.packed_at, now())
           ELSE o.packed_at
         END,
         ready_for_dispatch_at = CASE
           WHEN NEW.status IN ('ready_for_dispatch','out_for_delivery','delivered','completed')
             THEN COALESCE(NEW.ready_for_dispatch_at, now())
           ELSE o.ready_for_dispatch_at
         END,
         delivered_at = CASE
           WHEN NEW.status = 'delivered' THEN COALESCE(NEW.delivered_at, now())
           ELSE o.delivered_at
         END,
         completed_at = CASE
           WHEN NEW.status = 'completed' THEN COALESCE(NEW.completed_at, now())
           ELSE o.completed_at
         END,
          status = CASE
            -- Assignment status is the source of truth while the order is in
            -- the warehouse pipeline (below order_confirmed, rank 6): it may
            -- move both forward AND backward (accept -> reject, reassignment
            -- back to warehouse_assigned, reject -> reassign, return -> reassign).
            -- Once the order has been confirmed/shipped (rank >= 6) it is a
            -- committed lifecycle stage: only forward moves are allowed.
            WHEN v_new_status = v_current_status THEN o.status
            WHEN v_current_rank >= 6 AND v_new_rank < v_current_rank THEN o.status
            ELSE v_new_status
          END
   WHERE o.id = v_order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warehouse_assignments_sync_orders ON public.warehouse_assignments;
CREATE TRIGGER trg_warehouse_assignments_sync_orders
  AFTER INSERT OR UPDATE OF entity_type, entity_id, warehouse_id, status, priority, notes,
                          packing_status, packed_at, ready_for_dispatch_at, completed_at
  ON public.warehouse_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_orders_from_assignment();

-- -------------------------------------------------------------------
-- 3. Tighten is_admin() — role-based admins only.
--    Warehouse staff keep their own warehouse-scoped visibility via
--    the is_warehouse_staff() RLS branches; they are NOT global admins.
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
      AND p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- -------------------------------------------------------------------
-- 4. Repair profiles: internal roles / warehouse staff MUST be
--    user_type='internal' or RLS silently rejects every write.
-- -------------------------------------------------------------------
UPDATE public.profiles p
   SET user_type = 'internal'
 WHERE p.user_type = 'customer'
   AND (
     p.role IN ('admin'::public.user_role, 'super_admin'::public.user_role, 'manager'::public.user_role, 'staff'::public.user_role, 'warehouse_staff'::public.user_role)
     OR p.is_warehouse_staff = true
   );

-- -------------------------------------------------------------------
-- 5. Notifications — no NULL linkage for warehouse/assignment alerts.
-- -------------------------------------------------------------------
-- Normalize historical admin-broadcast notifications (they were mis-tagged
-- as 'warehouse' without a warehouse_id).
UPDATE public.notifications
   SET type = 'assignment'
 WHERE type = 'warehouse'
   AND warehouse_id IS NULL;

-- Demote any broken assignment/warehouse rows to a safe generic type so the
-- new CHECK constraints below can be added without failing on legacy junk.
UPDATE public.notifications
   SET type = 'order'
 WHERE type IN ('warehouse','assignment')
   AND (warehouse_assignment_id IS NULL
        OR order_id IS NULL
        OR entity_type IS NULL
        OR entity_id IS NULL);

-- assignment / warehouse notifications must trace to a real assignment+order
DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_assignment_linkage;
EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_assignment_linkage
  CHECK (
    type NOT IN ('warehouse','assignment')
    OR (
      warehouse_assignment_id IS NOT NULL
      AND order_id IS NOT NULL
      AND entity_type IS NOT NULL
      AND entity_id IS NOT NULL
    )
  );

-- warehouse-targeted notifications must carry a warehouse_id
DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_warehouse_linkage;
EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_warehouse_linkage
  CHECK (type <> 'warehouse' OR warehouse_id IS NOT NULL);

-- -------------------------------------------------------------------
-- 6. Backfill assignments for pre-existing assigned orders so the
--    dashboard is populated from warehouse_assignments only.
-- -------------------------------------------------------------------
INSERT INTO public.warehouse_assignments (
  entity_type, entity_id, warehouse_id, priority, status, admin_approval,
  processing_status, packing_status, shipping_ready, assigned_at, notes, updated_at
)
SELECT
  'order',
  o.id,
  o.warehouse_id,
  COALESCE(o.assignment_priority, 'normal'),
  CASE o.warehouse_status
    WHEN 'waiting_for_warehouse' THEN 'assigned'
    WHEN 'preparing' THEN 'processing'
    WHEN 'accepted' THEN 'accepted'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'ready_for_dispatch' THEN 'ready_for_dispatch'
    WHEN 'out_for_delivery' THEN 'out_for_delivery'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'returned' THEN 'returned'
    WHEN 'completed' THEN 'completed'
    ELSE 'assigned'
  END,
  'pending',
  CASE WHEN o.packing_status = 'in_progress' THEN 'in_progress' ELSE 'not_started' END,
  COALESCE(o.packing_status, 'not_started'),
  COALESCE(o.shipping_ready, false),
  o.created_at,
  o.warehouse_notes,
  now()
FROM public.orders o
WHERE o.warehouse_id IS NOT NULL
  AND o.warehouse_status IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.warehouse_assignments wa
    WHERE wa.entity_type = 'order'
      AND wa.entity_id = o.id
      AND wa.warehouse_id = o.warehouse_id
  );
