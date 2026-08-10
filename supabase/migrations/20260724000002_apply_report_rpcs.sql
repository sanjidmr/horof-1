-- ============================================================
-- REPORT RPC FUNCTIONS — Safe to run (CREATE OR REPLACE)
-- Apply via Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Daily Sales
CREATE OR REPLACE FUNCTION public.get_daily_sales(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (date text, orders bigint, revenue numeric, items_sold bigint, avg_order_value numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(o.created_at::date, 'YYYY-MM-DD') as date,
    count(distinct o.id)::bigint as orders,
    coalesce(sum(o.total), 0) as revenue,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    case when count(distinct o.id) > 0 then round(sum(o.total) / count(distinct o.id), 2) else 0 end as avg_order_value
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY o.created_at::date
  ORDER BY o.created_at::date
$$;

-- 2. Top Selling Products
CREATE OR REPLACE FUNCTION public.get_top_selling_products(limit_count int DEFAULT 10)
RETURNS TABLE (product_id uuid, name text, sku text, quantity_sold bigint, revenue numeric, avg_price numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id as product_id,
    p.name,
    p.sku,
    coalesce(sum(oi.quantity), 0)::bigint as quantity_sold,
    coalesce(sum(oi.total_price), 0) as revenue,
    case when sum(oi.quantity) > 0 then round(sum(oi.total_price) / sum(oi.quantity), 2) else 0 end as avg_price
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
  GROUP BY p.id, p.name, p.sku
  ORDER BY quantity_sold DESC
  LIMIT limit_count
$$;

-- 3. Product Performance
CREATE OR REPLACE FUNCTION public.get_product_performance(limit_count int DEFAULT 20)
RETURNS TABLE (
  product_id uuid, name text, sku text, category text,
  stock int, stock_status text, price numeric, cost_price numeric,
  total_sold bigint, total_revenue numeric, total_profit numeric,
  profit_margin numeric, return_count bigint
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id as product_id,
    p.name,
    p.sku,
    c.name as category,
    p.stock,
    p.stock_status::text,
    p.price,
    p.cost_price,
    coalesce(s.sold, 0)::bigint as total_sold,
    coalesce(s.revenue, 0) as total_revenue,
    coalesce(s.profit, 0) as total_profit,
    case when coalesce(s.revenue, 0) > 0 then round((coalesce(s.profit, 0) / s.revenue) * 100, 2) else 0 end as profit_margin,
    coalesce(r.return_count, 0)::bigint as return_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT oi.product_id,
      sum(oi.quantity) as sold,
      sum(oi.total_price) as revenue,
      sum(oi.total_price) - (sum(oi.quantity) * coalesce(p2.cost_price, 0)) as profit
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
    JOIN products p2 ON p2.id = oi.product_id
    GROUP BY oi.product_id
  ) s ON s.product_id = p.id
  LEFT JOIN (
    SELECT oi.product_id, count(*)::bigint as return_count
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'returned'
    GROUP BY oi.product_id
  ) r ON r.product_id = p.id
  ORDER BY coalesce(s.revenue, 0) DESC
  LIMIT limit_count
$$;

-- 4. Customer Acquisition
CREATE OR REPLACE FUNCTION public.get_customer_acquisition(months int DEFAULT 12)
RETURNS TABLE (month text, new_customers bigint, total_customers bigint)
LANGUAGE sql STABLE
AS $$
  WITH monthly AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
      count(*)::bigint as new_customers,
      sum(count(*)) OVER (ORDER BY date_trunc('month', created_at))::bigint as total_customers
    FROM profiles
    WHERE role = 'customer' AND created_at >= date_trunc('month', now()) - (months || ' months')::interval
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  )
  SELECT * FROM monthly
$$;

-- 5. Customer LTV
CREATE OR REPLACE FUNCTION public.get_customer_ltv()
RETURNS TABLE (segment text, customer_count bigint, avg_ltv numeric, total_revenue numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    case
      when cust.total_spent >= 50000 then 'VIP'
      when cust.total_spent >= 10000 then 'Premium'
      when cust.total_spent >= 1000 then 'Regular'
      else 'Low Value'
    end as segment,
    count(*)::bigint as customer_count,
    round(avg(cust.total_spent), 2) as avg_ltv,
    sum(cust.total_spent) as total_revenue
  FROM (
    SELECT
      o.customer_id,
      coalesce(sum(o.total), 0) as total_spent
    FROM orders o
    WHERE o.status != 'cancelled' AND o.payment_status = 'paid'
    GROUP BY o.customer_id
  ) cust
  GROUP BY segment
  ORDER BY avg_ltv DESC
$$;

-- 6. Customer Retention
CREATE OR REPLACE FUNCTION public.get_customer_retention()
RETURNS TABLE (month text, new_customers bigint, returning_customers bigint, retention_rate numeric)
LANGUAGE sql STABLE
AS $$
  WITH monthly_orders AS (
    SELECT
      to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
      o.customer_id,
      count(*) as order_count
    FROM orders o
    WHERE o.status != 'cancelled'
    GROUP BY date_trunc('month', o.created_at), o.customer_id
  ),
  customer_first_order AS (
    SELECT customer_id, min(month) as first_month
    FROM monthly_orders
    GROUP BY customer_id
  )
  SELECT
    mo.month,
    count(distinct case when cfo.first_month = mo.month then mo.customer_id end)::bigint as new_customers,
    count(distinct case when cfo.first_month < mo.month then mo.customer_id end)::bigint as returning_customers,
    case
      when count(distinct mo.customer_id) > 0
      then round(count(distinct case when cfo.first_month < mo.month then mo.customer_id end)::numeric / count(distinct mo.customer_id) * 100, 2)
      else 0
    end as retention_rate
  FROM monthly_orders mo
  JOIN customer_first_order cfo ON cfo.customer_id = mo.customer_id
  GROUP BY mo.month
  ORDER BY mo.month
$$;

-- 7. Profit & Loss
CREATE OR REPLACE FUNCTION public.get_profit_loss(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (category text, amount numeric)
LANGUAGE sql STABLE
AS $$
  SELECT category, amount FROM (
    SELECT 'Revenue' as category, coalesce(sum(o.total), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'COGS' as category, -coalesce(sum(p.cost_price * oi.quantity), 0) as amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    SELECT 'Shipping Cost' as category, -coalesce(sum(o.shipping_charge), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'Discounts Given' as category, -coalesce(sum(o.discount), 0) as amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
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
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'Net Profit' as category,
      coalesce(sum(o.total), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) - coalesce(sum(o.shipping_charge), 0) - coalesce(sum(o.discount), 0) - coalesce(sum(r.amount), 0) as amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN refunds r ON r.order_id = o.id AND r.status = 'approved'
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
    WHEN t.category = 'Net Profit' THEN 7
    ELSE 8
  END
$$;

-- 8. Profit by Product
CREATE OR REPLACE FUNCTION public.get_profit_by_product(from_date timestamptz, to_date timestamptz, limit_count int DEFAULT 20)
RETURNS TABLE (product_id uuid, name text, sku text, units_sold bigint, revenue numeric, cost numeric, profit numeric, margin numeric)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id as product_id,
    p.name,
    p.sku,
    coalesce(sum(oi.quantity), 0)::bigint as units_sold,
    coalesce(sum(oi.total_price), 0) as revenue,
    coalesce(sum(p.cost_price * oi.quantity), 0) as cost,
    coalesce(sum(oi.total_price), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) as profit,
    case when sum(oi.total_price) > 0
      then round(((sum(oi.total_price) - sum(p.cost_price * oi.quantity)) / sum(oi.total_price)) * 100, 2)
      else 0 end as margin
  FROM products p
  JOIN order_items oi ON oi.product_id = p.id
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY p.id, p.name, p.sku
  ORDER BY profit DESC
  LIMIT limit_count
$$;

-- 9. Sales by Category
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
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY c.id, c.name
  ORDER BY revenue DESC
$$;

-- 10. Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_orders_total_status ON orders(total, status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_total ON orders(payment_status, total);
CREATE INDEX IF NOT EXISTS idx_order_items_product_total ON order_items(product_id, total_price);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON profiles(role, created_at);

-- 11. Grant execute
GRANT EXECUTE ON FUNCTION public.get_daily_sales(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_selling_products(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_performance(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_acquisition(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_ltv() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_retention() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_loss(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_by_product(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_by_category(timestamptz, timestamptz) TO authenticated;

-- 12. Refresh schema
NOTIFY pgrst, 'reload schema';
