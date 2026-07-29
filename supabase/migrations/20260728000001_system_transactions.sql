-- ============================================================
-- SYSTEM TRANSACTIONS (Auto-generated financial event log)
-- Replaces manual account_transactions + customer_ledger UI
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'refund', 'cancellation', 'adjustment')),
  reference_id TEXT,
  reference_type TEXT,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'reversed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated can view system transactions" ON public.system_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Admin can manage system transactions" ON public.system_transactions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_system_transactions_type ON public.system_transactions(type);
CREATE INDEX IF NOT EXISTS idx_system_transactions_created ON public.system_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_transactions_ref ON public.system_transactions(reference_type, reference_id);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.system_transactions;
