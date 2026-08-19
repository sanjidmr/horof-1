-- ============================================================
-- EXPENSES: ADD "PAID TO" (RECIPIENT) COLUMN
-- ============================================================
-- Records who the bill/expense was paid to. The `description`
-- column already exists on public.expenses.
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS paid_to TEXT;
