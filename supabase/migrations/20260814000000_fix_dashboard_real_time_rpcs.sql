-- ============================================================
-- FIX DASHBOARD & ANALYTICS REAL-TIME RPC FUNCTIONS
-- Ensures revenue, paid revenue, and profit only count
-- DELIVERED (or completed) orders — money is only recognized
-- once an order is delivered.
-- Safe to run (CREATE OR REPLACE)
-- ============================================================

-- 1. Daily Sales — only delivered/completed orders + real profit per day
CREATE OR REPLACE FUNCTION public.get_daily_sales(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (date text, orders bigint, revenue numeric, items_sold bigint, avg_order_value numeric, profit numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(o.created_at::date, 'YYYY-MM-DD') as date,
    count(distinct o.id)::bigint as orders,
    coalesce(sum(o.total), 0) as revenue,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    case when count(distinct o.id) > 0 then round(sum(o.total) / count(distinct o.id), 2) else 0 end as avg_order_value,
    coalesce(sum(o.total), 0)
      - coalesce(sum(p.cost_price * oi.quantity), 0)
      - coalesce(sum(o.shipping_charge), 0)
      - coalesce(sum(o.discount), 0) as profit
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE o.created_at >= from_date AND o.created_at < to_date
    AND o.status IN ('delivered', 'completed')
  GROUP BY o.created_at::date
  ORDER BY o.created_at::date
$$;

-- 2. Profit & Loss — only delivered/completed orders
CREATE OR REPLACE FUNCTION public.get_profit_loss(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category text, amount numeric)
LANGUAGE sql STABLE
AS $$
  SELECT category, amount FROM (
    SELECT 'Revenue' as category, coalesce(sum(o.total), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'COGS' as category, -coalesce(sum(p.cost_price * oi.quantity), 0) as amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    SELECT 'Shipping Cost' as category, -coalesce(sum(o.shipping_charge), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'Discounts Given' as category, -coalesce(sum(o.discount), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'Refunds' as category, -coalesce(sum(r.amount), 0) as amount
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    WHERE r.status = 'approved' AND r.requested_at >= from_date AND r.requested_at < to_date
    UNION ALL
    SELECT 'Gross Profit' as category,
      coalesce(sum(o.total), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) - coalesce(sum(o.shipping_charge), 0) - coalesce(sum(o.discount), 0) as amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'Net Profit' as category,
      coalesce(sum(o.total), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) - coalesce(sum(o.shipping_charge), 0) - coalesce(sum(o.discount), 0) - coalesce(sum(r.amount), 0) as amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN refunds r ON r.order_id = o.id AND r.status = 'approved'
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
  ) t
  GROUP BY t.category, t.amount
  ORDER BY CASE
    WHEN t.category = 'Revenue' THEN 1
    WHEN t.category = 'COGS' THEN 2
    WHEN t.category = 'Gross Profit' THEN 3
    WHEN t.category = 'Shipping Cost' THEN 4
    WHEN t.category = 'Discounts Given' THEN 5
    WHEN t.category = 'Refunds' THEN 6
    WHEN t.category = 'Net Profit' THEN 7
    ELSE 8
  END
$$;

-- 3. Sales by Category — only delivered/completed orders
CREATE OR REPLACE FUNCTION public.get_sales_by_category(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category_id uuid, category_name text, items_sold bigint, revenue numeric, order_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id as category_id,
    c.name as category_name,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    coalesce(sum(oi.total_price), 0) as revenue,
    count(distinct o.id)::bigint as order_count
  FROM categories c
  JOIN products p ON p.category_id = c.id
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
  GROUP BY c.id, c.name
  ORDER BY revenue DESC
$$;

-- 4. Financial Summary — only delivered/completed orders
CREATE OR REPLACE FUNCTION public.get_financial_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (metric text, amount numeric)
LANGUAGE sql STABLE
AS $$
  SELECT metric, amount FROM (
    SELECT 'gross_revenue' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'net_revenue' AS metric, COALESCE(sum(o.total), 0) - COALESCE(sum(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'total_discounts' AS metric, COALESCE(sum(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'total_shipping_collected' AS metric, COALESCE(sum(o.shipping_charge), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'total_tax' AS metric, COALESCE(sum(o.tax_amount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    SELECT 'total_refunds' AS metric, COALESCE(sum(r.amount), 0) AS amount
    FROM refunds r WHERE r.status = 'approved' AND r.requested_at >= from_date AND r.requested_at < to_date
    UNION ALL
    SELECT 'cogs' AS metric, COALESCE(sum(p.cost_price * oi.quantity), 0) AS amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.status IN ('delivered', 'completed') AND o.created_at >= from_date AND o.created_at < to_date
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    SELECT 'paid_orders' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed') AND o.payment_status = 'paid'
    UNION ALL
    SELECT 'pending_payments' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed') AND o.payment_status != 'paid'
  ) t
$$;

-- 5. Full Profit & Loss (Accounting) — only delivered/completed orders
CREATE OR REPLACE FUNCTION public.get_full_profit_loss(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category text, amount numeric)
LANGUAGE sql STABLE AS $$
  SELECT category, amount FROM (
    -- Revenue
    SELECT 'Revenue' AS category, COALESCE(SUM(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    -- COGS
    SELECT 'COGS' AS category, -COALESCE(SUM(p.cost_price * oi.quantity), 0) AS amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    -- Actual Courier Cost (what business pays)
    SELECT 'Shipping Cost' AS category, -COALESCE(SUM(COALESCE(o.actual_courier_cost, 0)), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    -- Discounts Given
    SELECT 'Discounts Given' AS category, -COALESCE(SUM(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
    UNION ALL
    -- Refunds
    SELECT 'Refunds' AS category, -COALESCE(SUM(r.amount), 0) AS amount
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    WHERE r.status = 'approved' AND r.requested_at >= from_date AND r.requested_at < to_date
    UNION ALL
    -- Payment Gateway Fees
    SELECT 'Payment Gateway Fees' AS category, -COALESCE(SUM(COALESCE(o.payment_gateway_fee, 0)), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
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
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
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
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('delivered', 'completed')
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

GRANT EXECUTE ON FUNCTION public.get_full_profit_loss TO authenticated;

-- 6. Refresh schema
NOTIFY pgrst, 'reload schema';
