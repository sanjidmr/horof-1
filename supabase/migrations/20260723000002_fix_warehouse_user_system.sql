-- FIX: Warehouse Management & User Assignment System
-- Ensures all required columns, indexes, and RLS policies exist

-- 1. Ensure profiles has warehouse staff fields (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_warehouse_staff') THEN
    ALTER TABLE public.profiles ADD COLUMN is_warehouse_staff boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'assigned_warehouse_id') THEN
    ALTER TABLE public.profiles ADD COLUMN assigned_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Ensure indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_profiles_is_warehouse_staff ON public.profiles(is_warehouse_staff);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_warehouse ON public.profiles(assigned_warehouse_id);

-- 3. Ensure orders table has warehouse columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_id') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_staff_id') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_staff_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'warehouse_status') THEN
    ALTER TABLE public.orders ADD COLUMN warehouse_status text;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
    ALTER TABLE public.orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
    ALTER TABLE public.orders ADD COLUMN order_number text;
  END IF;
END $$;

-- 4. Ensure orders indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_id ON public.orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_staff_id ON public.orders(warehouse_staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_status ON public.orders(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 5. Ensure notifications table has required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
    ALTER TABLE public.notifications ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_id') THEN
    ALTER TABLE public.notifications ADD COLUMN order_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_request_id') THEN
    ALTER TABLE public.notifications ADD COLUMN order_request_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url text;
  END IF;
END $$;

-- 6. Ensure notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 7. Clean up and recreate orders RLS policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS orders_select_clean ON public.orders;
CREATE POLICY orders_select_clean ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id = auth.uid()
    OR is_admin()
    OR (warehouse_staff_id = auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_warehouse_staff = true
        AND profiles.assigned_warehouse_id = orders.warehouse_id
      )
    )
  );

-- 8. Ensure notifications RLS allows admins and specific users
DROP POLICY IF EXISTS notifications_select_clean ON public.notifications;
CREATE POLICY notifications_select_clean ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (is_admin() OR user_id = auth.uid());

-- 9. Ensure get_warehouse_staff function exists
CREATE OR REPLACE FUNCTION public.get_warehouse_staff(wh_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text
)
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.is_warehouse_staff = true
    AND (p.assigned_warehouse_id = wh_id OR p.assigned_warehouse_id IS NULL)
    AND (p.role = 'customer' OR p.role = 'admin')
  ORDER BY p.full_name;
$$;

-- 10. Create helper to check if user is warehouse staff
CREATE OR REPLACE FUNCTION public.is_warehouse_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_warehouse_staff = true
  );
$$;
