-- ============================================================
-- ACCOUNTING & FINANCIAL MANAGEMENT SYSTEM
-- Tables: expense_categories, expenses, chart_of_accounts,
--         account_transactions, customer_ledger, supplier_ledger
-- Auto-calculates: Gross Profit, Net Profit, Cash Flow
-- ============================================================

-- ============================================================
-- 1. EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.expense_categories (name, description) VALUES
  ('Office Rent', 'Monthly office rent'),
  ('Salary', 'Employee salaries and wages'),
  ('Facebook Ads', 'Facebook advertising costs'),
  ('Google Ads', 'Google advertising costs'),
  ('TikTok Ads', 'TikTok advertising costs'),
  ('Packaging', 'Product packaging materials'),
  ('Courier Charges', 'Shipping and courier costs'),
  ('Fuel', 'Vehicle fuel costs'),
  ('Internet', 'Internet service charges'),
  ('Electricity', 'Electricity bills'),
  ('Software Subscription', 'Software license fees'),
  ('Hosting', 'Web hosting charges'),
  ('Domain', 'Domain registration fees'),
  ('SSL', 'SSL certificate costs'),
  ('Office Equipment', 'Office equipment purchases'),
  ('Maintenance', 'Maintenance and repairs'),
  ('Miscellaneous', 'Other expenses')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view expense categories" ON public.expense_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view expenses" ON public.expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- ============================================================
-- 3. CHART OF ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  opening_balance NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.chart_of_accounts (account_code, account_name, account_type) VALUES
  ('1001', 'Cash', 'asset'),
  ('1002', 'Bank Account', 'asset'),
  ('1003', 'Accounts Receivable', 'asset'),
  ('1004', 'Inventory', 'asset'),
  ('2001', 'Accounts Payable', 'liability'),
  ('2002', 'Supplier Payable', 'liability'),
  ('3001', 'Owner Equity', 'equity'),
  ('3002', 'Retained Earnings', 'equity'),
  ('4001', 'Sales Revenue', 'income'),
  ('4002', 'Other Income', 'income'),
  ('5001', 'Cost of Goods Sold', 'expense'),
  ('5002', 'Shipping Cost', 'expense'),
  ('5003', 'Discount Given', 'expense'),
  ('5004', 'Refunds', 'expense'),
  ('5005', 'Operating Expenses', 'expense')
ON CONFLICT (account_code) DO NOTHING;

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view chart of accounts" ON public.chart_of_accounts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage chart of accounts" ON public.chart_of_accounts
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. ACCOUNT TRANSACTIONS (General Ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_before NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view transactions" ON public.account_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage transactions" ON public.account_transactions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON public.account_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_transactions_account ON public.account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_ref ON public.account_transactions(reference_type, reference_id);

-- ============================================================
-- 5. CUSTOMER LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('invoice', 'payment', 'refund', 'adjustment')),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_before NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view customer ledger" ON public.customer_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage customer ledger" ON public.customer_ledger
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON public.customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON public.customer_ledger(created_at DESC);

-- ============================================================
-- 6. SUPPLIER LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'payment', 'return', 'adjustment')),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_before NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view supplier ledger" ON public.supplier_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage supplier ledger" ON public.supplier_ledger
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON public.supplier_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_date ON public.supplier_ledger(created_at DESC);

-- ============================================================
-- 7. ADD SHIPPING COST COLUMNS TO ORDERS
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS actual_courier_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway_fee NUMERIC(14,2) DEFAULT 0;

-- ============================================================
-- 8. ADD PURCHASE FIELDS TO PRODUCTS
-- ============================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_purchase_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;

-- ============================================================
-- 9. ADD TRANSPORT/OTHER COST TO PURCHASE ORDERS
-- ============================================================
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS transport_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS other_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14,2) DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) DEFAULT 0;

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.expense_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.chart_of_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.account_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.customer_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.supplier_ledger;
