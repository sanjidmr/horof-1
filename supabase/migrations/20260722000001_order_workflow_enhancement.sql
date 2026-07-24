-- Order Workflow Enhancement Migration
-- Extends existing tables to support: warehouse assignment, enhanced order request
-- management, user-specific notifications, and full order lifecycle tracking.

-- ============================================================
-- 1. EXTEND orders TABLE — warehouse workflow columns
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warehouse_notes text,
  ADD COLUMN IF NOT EXISTS warehouse_estimated_dispatch timestamptz,
  ADD COLUMN IF NOT EXISTS warehouse_dispatch_date timestamptz,
  ADD COLUMN IF NOT EXISTS admin_final_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_number text;

-- Backfill order_number from transaction_id where missing
UPDATE public.orders SET order_number = transaction_id WHERE order_number IS NULL;

-- ============================================================
-- 2. EXTEND order_requests TABLE — admin review fields
-- ============================================================

ALTER TABLE public.order_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS request_changes_note text,
  ADD COLUMN IF NOT EXISTS approval_date timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_date timestamptz;

-- ============================================================
-- 3. EXTEND notifications TABLE — user-specific & order-linked
-- ============================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS order_request_id uuid REFERENCES public.order_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action_url text;

-- Drop overly permissive RLS policies and replace with proper ones
DROP POLICY IF EXISTS "Admin can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can delete notifications" ON public.notifications;

-- Admins see all notifications; customers see only their own
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    public.is_admin() OR user_id = auth.uid() OR user_id IS NULL
  );

-- Anyone can insert (server actions use service role or authenticated user)
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Admins can update (mark as read, etc.)
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (public.is_admin() OR user_id = auth.uid());

-- Admins can delete
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- 4. EXTEND profiles TABLE — warehouse staff role support
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_warehouse_staff boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- ============================================================
-- 5. EXTEND order_timeline TABLE — step categorization
-- ============================================================

ALTER TABLE public.order_timeline
  ADD COLUMN IF NOT EXISTS step_type text DEFAULT 'admin';

-- ============================================================
-- 6. INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_warehouse_id ON public.orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_staff_id ON public.orders(warehouse_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_status ON public.orders(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_request_id ON public.notifications(order_request_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_warehouse_staff ON public.profiles(is_warehouse_staff);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_warehouse ON public.profiles(assigned_warehouse_id);

-- ============================================================
-- 7. RLS for orders — warehouse staff can view/update assigned orders
-- ============================================================

-- Drop existing policies on orders to rebuild cleanly
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;

-- SELECT: owner OR admin OR warehouse staff assigned to the order
CREATE POLICY orders_select ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR (
      warehouse_staff_id = auth.uid()
    )
  );

-- INSERT: authenticated users (for order creation via server actions)
CREATE POLICY orders_insert ON public.orders
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: admin OR warehouse staff (limited to assigned orders)
CREATE POLICY orders_update ON public.orders
  FOR UPDATE USING (
    public.is_admin()
    OR (warehouse_staff_id = auth.uid())
  );

-- DELETE: admin only
CREATE POLICY orders_delete ON public.orders
  FOR DELETE USING (public.is_admin());

-- ============================================================
-- 8. Helper function: Get warehouse staff for a warehouse
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_warehouse_staff(wh_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.is_warehouse_staff = true
    AND (p.assigned_warehouse_id = wh_id OR p.assigned_warehouse_id IS NULL)
    AND p.role = 'customer'
  ORDER BY p.full_name;
$$;
