CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    transaction_id TEXT UNIQUE NOT NULL,
    val_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'pending',
    product_details JSONB,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Allow public to insert orders if it's a guest checkout, 
-- or only authenticated. Since we might have guests, let's allow inserts without auth,
-- or handle it securely from service role key in API route.
-- Our API route uses supabase server client, which can bypass RLS or run as the user.
-- It's safer to use the service role key for order creation if doing guest checkout, 
-- but let's allow insert for anon/authenticated for now, or rely on service role.

CREATE POLICY "Anyone can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);
