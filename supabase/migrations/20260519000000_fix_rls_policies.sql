-- 1. Ensure all required columns exist on public.orders for both Cash on Delivery and SSLCommerz
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS val_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_details JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';

-- 2. Ensure all required columns exist on order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Enable RLS on all tables to secure them
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any conflicting existing policies
DROP POLICY IF EXISTS orders_select ON public.orders;
DROP POLICY IF EXISTS orders_insert ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;

DROP POLICY IF EXISTS order_items_select ON public.order_items;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_update ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_policy" ON public.order_items;

DROP POLICY IF EXISTS addresses_select ON public.addresses;
DROP POLICY IF EXISTS addresses_insert ON public.addresses;
DROP POLICY IF EXISTS addresses_update ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_policy" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_policy" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_policy" ON public.addresses;

DROP POLICY IF EXISTS wishlist_select ON public.wishlist;
DROP POLICY IF EXISTS wishlist_insert ON public.wishlist;
DROP POLICY IF EXISTS wishlist_update ON public.wishlist;
DROP POLICY IF EXISTS "wishlist_select_policy" ON public.wishlist;
DROP POLICY IF EXISTS "wishlist_insert_policy" ON public.wishlist;
DROP POLICY IF EXISTS "wishlist_update_policy" ON public.wishlist;

DROP POLICY IF EXISTS cart_items_select ON public.cart_items;
DROP POLICY IF EXISTS cart_items_insert ON public.cart_items;
DROP POLICY IF EXISTS cart_items_update ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_select_policy" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_insert_policy" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_update_policy" ON public.cart_items;

-- 5. Create SELECT, INSERT, UPDATE policies for the "authenticated" role on orders
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 6. Create SELECT, INSERT, UPDATE policies for the "authenticated" role on order_items
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "order_items_insert_policy" ON public.order_items
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items_update_policy" ON public.order_items
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 7. Create SELECT, INSERT, UPDATE policies for the "authenticated" role on addresses
CREATE POLICY "addresses_select_policy" ON public.addresses
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_policy" ON public.addresses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_policy" ON public.addresses
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 8. Create SELECT, INSERT, UPDATE, DELETE policies for the "authenticated" role on wishlist
CREATE POLICY "wishlist_select_policy" ON public.wishlist
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "wishlist_insert_policy" ON public.wishlist
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_update_policy" ON public.wishlist
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "wishlist_delete_policy" ON public.wishlist
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. Create SELECT, INSERT, UPDATE, DELETE policies for the "authenticated" role on cart_items
CREATE POLICY "cart_items_select_policy" ON public.cart_items
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cart_items_insert_policy" ON public.cart_items
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_items_update_policy" ON public.cart_items
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cart_items_delete_policy" ON public.cart_items
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
