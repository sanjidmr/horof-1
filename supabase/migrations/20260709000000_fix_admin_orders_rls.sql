-- Fix RLS policies to allow admins to select, insert, and update orders
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Fix RLS policies to allow admins to select, insert, and update order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
CREATE POLICY "order_items_insert_policy" ON public.order_items
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;
CREATE POLICY "order_items_update_policy" ON public.order_items
    FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Fix RLS policies to allow admins to select, insert, and update addresses
DROP POLICY IF EXISTS "addresses_select_policy" ON public.addresses;
CREATE POLICY "addresses_select_policy" ON public.addresses
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "addresses_insert_policy" ON public.addresses;
CREATE POLICY "addresses_insert_policy" ON public.addresses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "addresses_update_policy" ON public.addresses;
CREATE POLICY "addresses_update_policy" ON public.addresses
    FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());
