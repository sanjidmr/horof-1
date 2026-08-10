-- ============================================================
-- ACCOUNTING RPC FUNCTIONS
-- Covers: total expenses, ledger balances, cash flow,
--         updated profit/loss with expenses
-- ============================================================

-- 1. Get total expenses for a date range
CREATE OR REPLACE FUNCTION public.get_total_expenses(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category_name text, total numeric, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    ec.name AS category_name,
    COALESCE(SUM(e.amount), 0) AS total,
    COUNT(*)::bigint AS count
  FROM expenses e
  JOIN expense_categories ec ON ec.id = e.category_id
  WHERE e.date >= from_date::date AND e.date <= to_date::date
    AND e.is_approved = true
  GROUP BY ec.name
  ORDER BY total DESC
$$;

-- 2. Get expense summary (total approved amount)
CREATE OR REPLACE FUNCTION public.get_expense_summary(from_date timestamptz, to_date timestamptz)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM expenses
  WHERE date >= from_date::date AND date <= to_date::date
    AND is_approved = true
$$;

-- 3. Get customer ledger balance
CREATE OR REPLACE FUNCTION public.get_customer_balance(customer_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT balance_after FROM customer_ledger
     WHERE customer_id = $1
     ORDER BY created_at DESC LIMIT 1),
  0)
$$;

-- 4. Get supplier ledger balance
CREATE OR REPLACE FUNCTION public.get_supplier_balance(supplier_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT balance_after FROM supplier_ledger
     WHERE supplier_id = $1
     ORDER BY created_at DESC LIMIT 1),
  0)
$$;

-- 5. Get all customer dues (total unpaid order amounts)
CREATE OR REPLACE FUNCTION public.get_all_customer_dues()
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM orders
  WHERE payment_status != 'paid'
    AND status NOT IN ('cancelled', 'returned')
$$;

-- 6. Get cash flow summary
CREATE OR REPLACE FUNCTION public.get_cash_flow(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (metric text, amount numeric)
LANGUAGE sql STABLE AS $$
  SELECT metric, amount FROM (
    SELECT 'inflow' AS metric,
      COALESCE(SUM(CASE WHEN at.transaction_type = 'credit' THEN at.amount ELSE 0 END), 0) AS amount
    FROM account_transactions at
    WHERE at.transaction_date >= from_date AND at.transaction_date < to_date
    UNION ALL
    SELECT 'outflow' AS metric,
      COALESCE(SUM(CASE WHEN at.transaction_type = 'debit' THEN at.amount ELSE 0 END), 0) AS amount
    FROM account_transactions at
    WHERE at.transaction_date >= from_date AND at.transaction_date < to_date
    UNION ALL
    SELECT 'net_flow' AS metric,
      COALESCE(SUM(CASE WHEN at.transaction_type = 'credit' THEN at.amount ELSE -at.amount END), 0) AS amount
    FROM account_transactions at
    WHERE at.transaction_date >= from_date AND at.transaction_date < to_date
  ) t
$$;

-- 7. Updated Profit & Loss with expenses and gateway fees
CREATE OR REPLACE FUNCTION public.get_full_profit_loss(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category text, amount numeric)
LANGUAGE sql STABLE AS $$
  SELECT category, amount FROM (
    -- Revenue
    SELECT 'Revenue' AS category, COALESCE(SUM(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    -- COGS
    SELECT 'COGS' AS category, -COALESCE(SUM(p.cost_price * oi.quantity), 0) AS amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    -- Actual Courier Cost (what business pays)
    SELECT 'Shipping Cost' AS category, -COALESCE(SUM(COALESCE(o.actual_courier_cost, 0)), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    -- Discounts Given
    SELECT 'Discounts Given' AS category, -COALESCE(SUM(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    -- Refunds
    SELECT 'Refunds' AS category, -COALESCE(SUM(r.amount), 0) AS amount
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    WHERE r.status = 'approved' AND r.requested_at >= from_date AND r.requested_at < to_date
    UNION ALL
    -- Payment Gateway Fees
    SELECT 'Payment Gateway Fees' AS category, -COALESCE(SUM(COALESCE(o.payment_gateway_fee, 0)), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    -- Operating Expenses
    SELECT 'Operating Expenses' AS category, -COALESCE(SUM(e.amount), 0) AS amount
    FROM expenses e
    WHERE e.date >= from_date::date AND e.date <= to_date::date AND e.is_approved = true
    UNION ALL
    -- Gross Profit
    SELECT 'Gross Profit' AS category,
      COALESCE(SUM(o.total), 0) - COALESCE(SUM(p.cost_price * oi.quantity), 0) - COALESCE(SUM(COALESCE(o.actual_courier_cost, 0)), 0) - COALESCE(SUM(o.discount), 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    -- Net Profit (including expenses and gateway fees)
    SELECT 'Net Profit' AS category,
      COALESCE(SUM(o.total), 0) - COALESCE(SUM(p.cost_price * oi.quantity), 0) - COALESCE(SUM(COALESCE(o.actual_courier_cost, 0)), 0) - COALESCE(SUM(o.discount), 0) - COALESCE(SUM(r.amount), 0) - COALESCE(SUM(COALESCE(o.payment_gateway_fee, 0)), 0) - COALESCE(exp_tot.total_expenses, 0) AS amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN refunds r ON r.order_id = o.id AND r.status = 'approved'
    CROSS JOIN (
      SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
      FROM expenses e
      WHERE e.date >= from_date::date AND e.date <= to_date::date AND e.is_approved = true
    ) exp_tot
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  ) t
  GROUP BY t.category, t.amount
  ORDER BY CASE
    WHEN t.category = 'Revenue' THEN 1
    WHEN t.category = 'COGS' THEN 2
    WHEN t.category = 'Gross Profit' THEN 3
    WHEN t.category = 'Shipping Cost' THEN 4
    WHEN t.category = 'Discounts Given' THEN 5
    WHEN t.category = 'Refunds' THEN 6
    WHEN t.category = 'Payment Gateway Fees' THEN 7
    WHEN t.category = 'Operating Expenses' THEN 8
    WHEN t.category = 'Net Profit' THEN 9
    ELSE 10
  END
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_total_expenses TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_customer_dues TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_flow TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_full_profit_loss TO authenticated;
