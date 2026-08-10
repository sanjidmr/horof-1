-- ============================================================
-- COMPREHENSIVE REPORTING & ANALYTICS FUNCTIONS
-- Covers: Inventory, Orders, Finance, Shipping, Marketing,
--         Supplier, Employee/Admin, Website Analytics
-- ============================================================

-- ============================================================
-- 1. INVENTORY REPORTS
-- ============================================================

-- 1a. Current Stock Summary
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  total_products bigint,
  total_stock_value numeric,
  total_stock_units bigint,
  in_stock_count bigint,
  low_stock_count bigint,
  out_of_stock_count bigint,
  avg_stock numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    count(*)::bigint AS total_products,
    COALESCE(sum(p.price * p.stock), 0) AS total_stock_value,
    COALESCE(sum(p.stock), 0)::bigint AS total_stock_units,
    count(*) FILTER (WHERE p.stock_status = 'in_stock')::bigint AS in_stock_count,
    count(*) FILTER (WHERE p.stock_status = 'low_stock')::bigint AS low_stock_count,
    count(*) FILTER (WHERE p.stock_status = 'out_of_stock')::bigint AS out_of_stock_count,
    CASE WHEN count(*) > 0 THEN round(COALESCE(sum(p.stock), 0)::numeric / count(*), 1) ELSE 0 END AS avg_stock
  FROM products p
$$;

-- 1b. Stock Movement History (date-filtered)
CREATE OR REPLACE FUNCTION get_stock_movements(from_date timestamptz, to_date timestamptz, limit_count int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  product_id uuid,
  product_name text,
  warehouse_name text,
  movement_type text,
  quantity_change int,
  stock_before int,
  stock_after int,
  reference_type text,
  reference_id text,
  notes text,
  created_at timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    sm.id, sm.product_id,
    p.name AS product_name,
    w.name AS warehouse_name,
    sm.movement_type::text,
    sm.quantity_change, sm.stock_before, sm.stock_after,
    sm.reference_type, sm.reference_id, sm.notes,
    sm.created_at
  FROM stock_movements sm
  LEFT JOIN products p ON p.id = sm.product_id
  LEFT JOIN warehouses w ON w.id = sm.warehouse_id
  WHERE sm.created_at >= from_date AND sm.created_at < to_date
  ORDER BY sm.created_at DESC
  LIMIT limit_count
$$;

-- 1c. Stock In/Out Summary
CREATE OR REPLACE FUNCTION get_stock_in_out(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  movement_type text,
  total_quantity bigint,
  transaction_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    sm.movement_type::text,
    COALESCE(sum(abs(sm.quantity_change)), 0)::bigint AS total_quantity,
    count(*)::bigint AS transaction_count
  FROM stock_movements sm
  WHERE sm.created_at >= from_date AND sm.created_at < to_date
  GROUP BY sm.movement_type
  ORDER BY total_quantity DESC
$$;

-- 1d. Warehouse Inventory
CREATE OR REPLACE FUNCTION get_warehouse_inventory()
RETURNS TABLE (
  warehouse_id uuid,
  warehouse_name text,
  total_products bigint,
  total_stock bigint,
  total_value numeric,
  low_stock_count bigint,
  out_of_stock_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    count(DISTINCT p.id)::bigint AS total_products,
    COALESCE(sum(p.stock), 0)::bigint AS total_stock,
    COALESCE(sum(p.price * p.stock), 0) AS total_value,
    count(DISTINCT p.id) FILTER (WHERE p.stock_status = 'low_stock')::bigint AS low_stock_count,
    count(DISTINCT p.id) FILTER (WHERE p.stock_status = 'out_of_stock')::bigint AS out_of_stock_count
  FROM warehouses w
  LEFT JOIN products p ON p.default_warehouse_id = w.id
  WHERE w.is_active = true
  GROUP BY w.id, w.name
  ORDER BY total_value DESC
$$;

-- 1e. Low Stock / Reorder Report
CREATE OR REPLACE FUNCTION get_low_stock_report()
RETURNS TABLE (
  product_id uuid,
  name text,
  sku text,
  stock int,
  min_stock_level int,
  max_stock_level int,
  reorder_qty int,
  stock_status text,
  cost_price numeric,
  price numeric,
  incoming_stock int,
  expected_restock_date timestamptz,
  category_name text
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id AS product_id, p.name, p.sku, p.stock,
    p.min_stock_level, p.max_stock_level, p.reorder_qty,
    p.stock_status::text, p.cost_price, p.price,
    p.incoming_stock, p.expected_restock_date,
    c.name AS category_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.stock_status IN ('low_stock', 'out_of_stock')
  ORDER BY p.stock ASC, p.name
$$;

-- 1f. Inventory Valuation by Category
CREATE OR REPLACE FUNCTION get_inventory_valuation()
RETURNS TABLE (
  category_id uuid,
  category_name text,
  product_count bigint,
  total_stock bigint,
  total_retail_value numeric,
  total_cost_value numeric,
  potential_profit numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id AS category_id,
    c.name AS category_name,
    count(p.id)::bigint AS product_count,
    COALESCE(sum(p.stock), 0)::bigint AS total_stock,
    COALESCE(sum(p.price * p.stock), 0) AS total_retail_value,
    COALESCE(sum(COALESCE(p.cost_price, 0) * p.stock), 0) AS total_cost_value,
    COALESCE(sum(p.price * p.stock), 0) - COALESCE(sum(COALESCE(p.cost_price, 0) * p.stock), 0) AS potential_profit
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
  GROUP BY c.id, c.name
  ORDER BY total_retail_value DESC
$$;

-- ============================================================
-- 2. ORDER REPORTS
-- ============================================================

-- 2a. Orders by Status (date-filtered)
CREATE OR REPLACE FUNCTION get_orders_by_status(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  status text,
  count bigint,
  total numeric,
  avg_total numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    o.status::text,
    count(*)::bigint,
    COALESCE(sum(o.total), 0) AS total,
    CASE WHEN count(*) > 0 THEN round(COALESCE(sum(o.total), 0) / count(*), 2) ELSE 0 END AS avg_total
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date
  GROUP BY o.status
  ORDER BY count DESC
$$;

-- 2b. Orders by Payment Method
CREATE OR REPLACE FUNCTION get_orders_by_payment_method(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  payment_method text,
  count bigint,
  total numeric,
  paid_count bigint,
  unpaid_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(o.payment_method, 'Unknown') AS payment_method,
    count(*)::bigint,
    COALESCE(sum(o.total), 0) AS total,
    count(*) FILTER (WHERE o.payment_status = 'paid')::bigint AS paid_count,
    count(*) FILTER (WHERE o.payment_status != 'paid')::bigint AS unpaid_count
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY o.payment_method
  ORDER BY total DESC
$$;

-- 2c. COD vs Online Payment
CREATE OR REPLACE FUNCTION get_cod_vs_online_orders(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  payment_category text,
  count bigint,
  total numeric,
  avg_order_value numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN LOWER(COALESCE(o.payment_method, '')) IN ('cod', 'cash_on_delivery', 'cash') THEN 'COD'
      ELSE 'Online Payment'
    END AS payment_category,
    count(*)::bigint,
    COALESCE(sum(o.total), 0) AS total,
    CASE WHEN count(*) > 0 THEN round(COALESCE(sum(o.total), 0) / count(*), 2) ELSE 0 END AS avg_order_value
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY payment_category
  ORDER BY total DESC
$$;

-- 2d. Order Fulfillment Report
CREATE OR REPLACE FUNCTION get_order_fulfillment_report(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  fulfillment_status text,
  count bigint,
  total numeric,
  avg_days_to_ship numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(o.fulfillment_status, 'Unfulfilled') AS fulfillment_status,
    count(*)::bigint,
    COALESCE(sum(o.total), 0) AS total,
    CASE
      WHEN count(*) FILTER (WHERE o.courier_name IS NOT NULL) > 0
      THEN round(
        avg(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 86400.0)
          FILTER (WHERE o.courier_name IS NOT NULL), 1
      )
      ELSE 0
    END AS avg_days_to_ship
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY fulfillment_status
  ORDER BY count DESC
$$;

-- 2e. Daily Order Volume
CREATE OR REPLACE FUNCTION get_daily_order_volume(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  date text,
  total_orders bigint,
  pending bigint,
  confirmed bigint,
  shipped bigint,
  delivered bigint,
  cancelled bigint,
  returned bigint,
  revenue numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(o.created_at::date, 'YYYY-MM-DD') AS date,
    count(*)::bigint AS total_orders,
    count(*) FILTER (WHERE o.status = 'pending')::bigint AS pending,
    count(*) FILTER (WHERE o.status = 'confirmed')::bigint AS confirmed,
    count(*) FILTER (WHERE o.status = 'shipped')::bigint AS shipped,
    count(*) FILTER (WHERE o.status = 'delivered')::bigint AS delivered,
    count(*) FILTER (WHERE o.status = 'cancelled')::bigint AS cancelled,
    count(*) FILTER (WHERE o.status = 'returned')::bigint AS returned,
    COALESCE(sum(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS revenue
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date
  GROUP BY o.created_at::date
  ORDER BY o.created_at::date
$$;

-- ============================================================
-- 3. FINANCE REPORTS
-- ============================================================

-- 3a. Financial Summary (date-filtered)
CREATE OR REPLACE FUNCTION get_financial_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  metric text,
  amount numeric
)
LANGUAGE sql STABLE AS $$
  SELECT metric, amount FROM (
    SELECT 'gross_revenue' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'net_revenue' AS metric, COALESCE(sum(o.total), 0) - COALESCE(sum(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'total_discounts' AS metric, COALESCE(sum(o.discount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'total_shipping_collected' AS metric, COALESCE(sum(o.shipping_charge), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'total_tax' AS metric, COALESCE(sum(o.tax_amount), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'total_refunds' AS metric, COALESCE(sum(r.amount), 0) AS amount
    FROM refunds r WHERE r.status = 'approved' AND r.requested_at >= from_date AND r.requested_at < to_date
    UNION ALL
    SELECT 'cogs' AS metric, COALESCE(sum(p.cost_price * oi.quantity), 0) AS amount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled' AND o.created_at >= from_date AND o.created_at < to_date
    JOIN products p ON p.id = oi.product_id
    UNION ALL
    SELECT 'paid_orders' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled' AND o.payment_status = 'paid'
    UNION ALL
    SELECT 'pending_payments' AS metric, COALESCE(sum(o.total), 0) AS amount
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled' AND o.payment_status != 'paid'
  ) t
$$;

-- 3b. Payment Collection Report
CREATE OR REPLACE FUNCTION get_payment_collection_report(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  payment_status text,
  count bigint,
  total numeric,
  percentage numeric
)
LANGUAGE sql STABLE AS $$
  WITH totals AS (
    SELECT count(*)::bigint AS cnt, COALESCE(sum(o.total), 0) AS tot
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  )
  SELECT
    o.payment_status::text,
    count(*)::bigint,
    COALESCE(sum(o.total), 0),
    CASE WHEN totals.tot > 0 THEN round(COALESCE(sum(o.total), 0) / totals.tot * 100, 1) ELSE 0 END
  FROM orders o, totals
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY o.payment_status, totals.tot
  ORDER BY sum(o.total) DESC
$$;

-- 3c. Revenue by Day of Week
CREATE OR REPLACE FUNCTION get_revenue_by_day_of_week(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  day_name text,
  day_number int,
  total_orders bigint,
  total_revenue numeric,
  avg_revenue numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE EXTRACT(DOW FROM o.created_at)
      WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday' WHEN 6 THEN 'Saturday'
    END AS day_name,
    EXTRACT(DOW FROM o.created_at)::int AS day_number,
    count(*)::bigint AS total_orders,
    COALESCE(sum(o.total), 0) AS total_revenue,
    CASE WHEN count(*) > 0 THEN round(COALESCE(sum(o.total), 0) / count(*), 2) ELSE 0 END AS avg_revenue
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY day_name, day_number
  ORDER BY day_number
$$;

-- 3d. Revenue by Hour
CREATE OR REPLACE FUNCTION get_revenue_by_hour(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  hour int,
  total_orders bigint,
  total_revenue numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    EXTRACT(HOUR FROM o.created_at)::int AS hour,
    count(*)::bigint AS total_orders,
    COALESCE(sum(o.total), 0) AS total_revenue
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY hour
  ORDER BY hour
$$;

-- ============================================================
-- 4. SHIPPING REPORTS
-- ============================================================

-- 4a. Shipping Summary
CREATE OR REPLACE FUNCTION get_shipping_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  metric text,
  value numeric
)
LANGUAGE sql STABLE AS $$
  SELECT metric, value FROM (
    SELECT 'total_shipped' AS metric, count(*)::numeric AS value
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status IN ('shipped', 'delivered')
    UNION ALL
    SELECT 'total_delivered' AS metric, count(*)::numeric AS value
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status = 'delivered'
    UNION ALL
    SELECT 'total_shipping_collected' AS metric, COALESCE(sum(o.shipping_charge), 0) AS value
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'avg_shipping_charge' AS metric, COALESCE(avg(o.shipping_charge), 0) AS value
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    UNION ALL
    SELECT 'delivery_rate' AS metric,
      CASE WHEN count(*) FILTER (WHERE o.status IN ('shipped', 'delivered')) > 0
        THEN round(count(*) FILTER (WHERE o.status = 'delivered')::numeric / count(*) FILTER (WHERE o.status IN ('shipped', 'delivered')) * 100, 1)
        ELSE 0 END AS value
    FROM orders o WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  ) t
$$;

-- 4b. Courier Performance
CREATE OR REPLACE FUNCTION get_courier_performance(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  courier_name text,
  total_orders bigint,
  delivered bigint,
  returned bigint,
  delivery_rate numeric,
  total_shipping numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(o.courier_name, 'Unknown') AS courier_name,
    count(*)::bigint AS total_orders,
    count(*) FILTER (WHERE o.status = 'delivered')::bigint AS delivered,
    count(*) FILTER (WHERE o.status = 'returned')::bigint AS returned,
    CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE o.status = 'delivered')::numeric / count(*) * 100, 1)
      ELSE 0 END AS delivery_rate,
    COALESCE(sum(o.shipping_charge), 0) AS total_shipping
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.courier_name IS NOT NULL AND o.status != 'cancelled'
  GROUP BY o.courier_name
  ORDER BY total_orders DESC
$$;

-- 4c. Delivery Performance by District
CREATE OR REPLACE FUNCTION get_delivery_by_district(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  delivery_type text,
  count bigint,
  total numeric,
  delivered_count bigint,
  avg_shipping numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(o.delivery_type, 'standard') AS delivery_type,
    count(*)::bigint,
    COALESCE(sum(o.total), 0),
    count(*) FILTER (WHERE o.status = 'delivered')::bigint,
    COALESCE(avg(o.shipping_charge), 0)
  FROM orders o
  WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
  GROUP BY o.delivery_type
  ORDER BY count DESC
$$;

-- ============================================================
-- 5. MARKETING REPORTS
-- ============================================================

-- 5a. Coupon Performance (enhanced, date-filtered)
CREATE OR REPLACE FUNCTION get_coupon_performance(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  coupon_id uuid,
  code text,
  coupon_type text,
  times_used bigint,
  total_discount numeric,
  total_revenue numeric,
  avg_discount numeric,
  is_active boolean,
  expires_at timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id AS coupon_id, c.code, c.type::text AS coupon_type,
    COALESCE(usage.times_used, 0)::bigint AS times_used,
    COALESCE(usage.total_discount, 0) AS total_discount,
    COALESCE(usage.total_revenue, 0) AS total_revenue,
    CASE WHEN COALESCE(usage.times_used, 0) > 0
      THEN round(COALESCE(usage.total_discount, 0) / usage.times_used, 2)
      ELSE 0 END AS avg_discount,
    c.is_active, c.expires_at
  FROM coupons c
  LEFT JOIN (
    SELECT
      c2.code,
      count(DISTINCT o.id)::bigint AS times_used,
      COALESCE(sum(o.discount), 0) AS total_discount,
      COALESCE(sum(o.total), 0) AS total_revenue
    FROM orders o
    JOIN coupons c2 ON c2.code = o.coupon_code
    WHERE o.created_at >= from_date AND o.created_at < to_date AND o.status != 'cancelled'
    GROUP BY c2.code
  ) usage ON usage.code = c.code
  ORDER BY usage.times_used DESC NULLS LAST
$$;

-- 5b. Email Campaign Performance
CREATE OR REPLACE FUNCTION get_email_campaign_report()
RETURNS TABLE (
  campaign_id uuid,
  name text,
  subject text,
  status text,
  recipient_count int,
  delivered_count int,
  open_count int,
  click_count int,
  bounce_count int,
  unsubscribe_count int,
  open_rate numeric,
  click_rate numeric,
  sent_at timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    ec.id, ec.name, ec.subject, ec.status::text,
    ec.recipient_count, ec.delivered_count,
    ec.open_count, ec.click_count, ec.bounce_count, ec.unsubscribe_count,
    CASE WHEN ec.delivered_count > 0 THEN round(ec.open_count::numeric / ec.delivered_count * 100, 1) ELSE 0 END AS open_rate,
    CASE WHEN ec.open_count > 0 THEN round(ec.click_count::numeric / ec.open_count * 100, 1) ELSE 0 END AS click_rate,
    ec.sent_at
  FROM email_campaigns ec
  ORDER BY ec.created_at DESC
  LIMIT 50
$$;

-- 5c. Popup Campaign Performance
CREATE OR REPLACE FUNCTION get_popup_campaign_report()
RETURNS TABLE (
  campaign_id uuid,
  name text,
  popup_type text,
  views int,
  conversions int,
  closes int,
  conversion_rate numeric,
  is_active boolean
)
LANGUAGE sql STABLE AS $$
  SELECT
    pc.id, pc.name, pc.popup_type::text,
    pc.views, pc.conversions, pc.closes,
    CASE WHEN pc.views > 0 THEN round(pc.conversions::numeric / pc.views * 100, 1) ELSE 0 END AS conversion_rate,
    pc.is_active
  FROM popup_campaigns pc
  ORDER BY pc.views DESC
$$;

-- 5d. Subscriber Growth
CREATE OR REPLACE FUNCTION get_subscriber_growth()
RETURNS TABLE (
  month text,
  new_subscribers bigint,
  total_subscribers bigint,
  unsubscribes bigint
)
LANGUAGE sql STABLE AS $$
  WITH monthly AS (
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      count(*)::bigint AS new_subs,
      0::bigint AS unsubs
    FROM subscribers
    WHERE created_at >= now() - interval '12 months'
    GROUP BY date_trunc('month', created_at)
    UNION ALL
    SELECT
      to_char(date_trunc('month', unsubscribed_at), 'YYYY-MM') AS month,
      0::bigint AS new_subs,
      count(*)::bigint AS unsubs
    FROM subscribers
    WHERE unsubscribed_at IS NOT NULL AND unsubscribed_at >= now() - interval '12 months'
    GROUP BY date_trunc('month', unsubscribed_at)
  )
  SELECT
    month,
    COALESCE(sum(new_subs), 0)::bigint AS new_subscribers,
    sum(COALESCE(sum(new_subs), 0) - COALESCE(sum(unsubs), 0))
      OVER (ORDER BY month)::bigint AS total_subscribers,
    COALESCE(sum(unsubs), 0)::bigint AS unsubscribes
  FROM monthly
  GROUP BY month
  ORDER BY month
$$;

-- 5e. Bundle Offer Performance
CREATE OR REPLACE FUNCTION get_bundle_offer_report()
RETURNS TABLE (
  offer_id uuid,
  name text,
  offer_type text,
  used_count int,
  max_uses int,
  is_active boolean,
  starts_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    bo.id, bo.name, bo.type AS offer_type,
    bo.used_count, bo.max_uses, bo.is_active,
    bo.starts_at, bo.expires_at
  FROM bundle_offers bo
  ORDER BY bo.used_count DESC
$$;

-- ============================================================
-- 6. SUPPLIER REPORTS
-- ============================================================

-- 6a. Supplier Performance
CREATE OR REPLACE FUNCTION get_supplier_performance()
RETURNS TABLE (
  supplier_id uuid,
  name text,
  total_pos bigint,
  total_spend numeric,
  items_received bigint,
  on_time_rate numeric,
  is_active boolean
)
LANGUAGE sql STABLE AS $$
  SELECT
    s.id AS supplier_id, s.name,
    COALESCE(po.pos, 0)::bigint AS total_pos,
    COALESCE(po.total_spend, 0) AS total_spend,
    COALESCE(po.items_received, 0)::bigint AS items_received,
    CASE WHEN COALESCE(po.pos, 0) > 0
      THEN round(COALESCE(po.on_time, 0)::numeric / po.pos * 100, 1)
      ELSE 0 END AS on_time_rate,
    s.is_active
  FROM suppliers s
  LEFT JOIN (
    SELECT
      purchase_orders.supplier_id,
      count(*)::bigint AS pos,
      sum(purchase_orders.total_cost) AS total_spend,
      sum(poi_items.received) AS items_received,
      count(*) FILTER (WHERE purchase_orders.received_date <= purchase_orders.expected_date OR purchase_orders.expected_date IS NULL)::bigint AS on_time
    FROM purchase_orders
    LEFT JOIN LATERAL (
      SELECT sum(received_quantity) AS received FROM purchase_order_items WHERE purchase_order_items.purchase_order_id = purchase_orders.id
    ) poi_items ON true
    GROUP BY purchase_orders.supplier_id
  ) po ON po.supplier_id = s.id
  ORDER BY po.total_spend DESC NULLS LAST
$$;

-- 6b. Purchase Order Summary
CREATE OR REPLACE FUNCTION get_purchase_order_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  status text,
  count bigint,
  total_cost numeric,
  avg_cost numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    po.status::text,
    count(*)::bigint,
    COALESCE(sum(po.total_cost), 0) AS total_cost,
    CASE WHEN count(*) > 0 THEN round(COALESCE(sum(po.total_cost), 0) / count(*), 2) ELSE 0 END AS avg_cost
  FROM purchase_orders po
  WHERE po.created_at >= from_date AND po.created_at < to_date
  GROUP BY po.status
  ORDER BY count DESC
$$;

-- 6c. Top Purchased Products
CREATE OR REPLACE FUNCTION get_top_purchased_products(from_date timestamptz, to_date timestamptz, limit_count int DEFAULT 20)
RETURNS TABLE (
  product_id uuid,
  name text,
  sku text,
  total_purchased bigint,
  total_cost numeric,
  supplier_name text
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id AS product_id, p.name, p.sku,
    COALESCE(sum(poi.quantity), 0)::bigint AS total_purchased,
    COALESCE(sum(poi.total_cost), 0) AS total_cost,
    s.name AS supplier_name
  FROM products p
  JOIN purchase_order_items poi ON poi.product_id = p.id
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  LEFT JOIN suppliers s ON s.id = po.supplier_id
  WHERE po.created_at >= from_date AND po.created_at < to_date
  GROUP BY p.id, p.name, p.sku, s.name
  ORDER BY total_purchased DESC
  LIMIT limit_count
$$;

-- ============================================================
-- 7. EMPLOYEE / ADMIN REPORTS
-- ============================================================

-- 7a. Admin Activity Report
CREATE OR REPLACE FUNCTION get_admin_activity_report(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  action_count bigint,
  last_active timestamptz,
  top_action text
)
LANGUAGE sql STABLE AS $$
  SELECT
    al.user_id,
    al.user_email,
    count(*)::bigint AS action_count,
    max(al.created_at) AS last_active,
    (SELECT action FROM audit_logs al2 WHERE al2.user_id = al.user_id AND al2.created_at >= from_date AND al2.created_at < to_date GROUP BY action ORDER BY count(*) DESC LIMIT 1) AS top_action
  FROM audit_logs al
  WHERE al.created_at >= from_date AND al.created_at < to_date AND al.user_id IS NOT NULL
  GROUP BY al.user_id, al.user_email
  ORDER BY action_count DESC
$$;

-- 7b. Login History Summary
CREATE OR REPLACE FUNCTION get_login_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  metric text,
  value bigint
)
LANGUAGE sql STABLE AS $$
  SELECT metric, value FROM (
    SELECT 'total_attempts' AS metric, count(*)::bigint AS value
    FROM login_history WHERE created_at >= from_date AND created_at < to_date
    UNION ALL
    SELECT 'successful_logins' AS metric, count(*)::bigint AS value
    FROM login_history WHERE created_at >= from_date AND created_at < to_date AND status = 'success'
    UNION ALL
    SELECT 'failed_logins' AS metric, count(*)::bigint AS value
    FROM login_history WHERE created_at >= from_date AND created_at < to_date AND status = 'failed'
    UNION ALL
    SELECT 'unique_users' AS metric, count(DISTINCT user_id)::bigint AS value
    FROM login_history WHERE created_at >= from_date AND created_at < to_date AND status = 'success'
  ) t
$$;

-- 7c. Support Performance (tickets + chat)
CREATE OR REPLACE FUNCTION get_support_performance(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  metric text,
  value numeric
)
LANGUAGE sql STABLE AS $$
  SELECT metric, value FROM (
    SELECT 'total_tickets' AS metric, count(*)::numeric AS value
    FROM support_tickets WHERE created_at >= from_date AND created_at < to_date
    UNION ALL
    SELECT 'resolved_tickets' AS metric, count(*)::numeric AS value
    FROM support_tickets WHERE created_at >= from_date AND created_at < to_date AND status IN ('resolved', 'closed')
    UNION ALL
    SELECT 'avg_resolution_hours' AS metric,
      COALESCE(avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0)
        FILTER (WHERE resolved_at IS NOT NULL), 0) AS value
    FROM support_tickets WHERE created_at >= from_date AND created_at < to_date
    UNION ALL
    SELECT 'avg_csat' AS metric, COALESCE(avg(rating), 0) AS value
    FROM ticket_ratings WHERE created_at >= from_date AND created_at < to_date
    UNION ALL
    SELECT 'total_chat_conversations' AS metric, count(*)::numeric AS value
    FROM chat_conversations WHERE created_at >= from_date AND created_at < to_date
    UNION ALL
    SELECT 'total_chat_messages' AS metric, count(*)::numeric AS value
    FROM chat_messages WHERE created_at >= from_date AND created_at < to_date
  ) t
$$;

-- 7d. Support Agent Performance
CREATE OR REPLACE FUNCTION get_agent_performance(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  tickets_handled bigint,
  avg_response_hours numeric,
  avg_csat numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    st.assigned_to AS agent_id,
    COALESCE(p.full_name, p.email, 'Unknown') AS agent_name,
    count(*)::bigint AS tickets_handled,
    CASE WHEN count(*) FILTER (WHERE st.first_response_at IS NOT NULL) > 0
      THEN round(avg(EXTRACT(EPOCH FROM (st.first_response_at - st.created_at)) / 3600.0)
        FILTER (WHERE st.first_response_at IS NOT NULL), 1)
      ELSE 0 END AS avg_response_hours,
    COALESCE(avg(tr.rating), 0) AS avg_csat
  FROM support_tickets st
  LEFT JOIN profiles p ON p.id = st.assigned_to
  LEFT JOIN ticket_ratings tr ON tr.ticket_id = st.id
  WHERE st.created_at >= from_date AND st.created_at < to_date AND st.assigned_to IS NOT NULL
  GROUP BY st.assigned_to, p.full_name, p.email
  ORDER BY tickets_handled DESC
$$;

-- ============================================================
-- 8. WEBSITE ANALYTICS
-- ============================================================

-- 8a. Visitor Summary
CREATE OR REPLACE FUNCTION get_visitor_summary(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  date text,
  unique_visitors bigint,
  page_views bigint,
  avg_duration numeric,
  bounce_count bigint,
  bounce_rate numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(v.created_at::date, 'YYYY-MM-DD') AS date,
    count(DISTINCT v.session_id)::bigint AS unique_visitors,
    count(*)::bigint AS page_views,
    COALESCE(avg(v.duration_seconds), 0) AS avg_duration,
    count(*) FILTER (WHERE v.page_count <= 1)::bigint AS bounce_count,
    CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE v.page_count <= 1)::numeric / count(*) * 100, 1)
      ELSE 0 END AS bounce_rate
  FROM visitors v
  WHERE v.created_at >= from_date AND v.created_at < to_date
  GROUP BY v.created_at::date
  ORDER BY v.created_at::date
$$;

-- 8b. Traffic Sources
CREATE OR REPLACE FUNCTION get_traffic_sources(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  source text,
  visitor_count bigint,
  page_views bigint,
  percentage numeric
)
LANGUAGE sql STABLE AS $$
  WITH source_data AS (
    SELECT
      COALESCE(v.referrer_source, 'Direct') AS source,
      count(DISTINCT v.session_id)::bigint AS visitor_count,
      count(*)::bigint AS page_views
    FROM visitors v
    WHERE v.created_at >= from_date AND v.created_at < to_date
    GROUP BY COALESCE(v.referrer_source, 'Direct')
  ),
  total AS (
    SELECT sum(visitor_count) AS total_visitors FROM source_data
  )
  SELECT
    sd.source, sd.visitor_count, sd.page_views,
    CASE WHEN t.total_visitors > 0
      THEN round(sd.visitor_count::numeric / t.total_visitors * 100, 1)
      ELSE 0 END AS percentage
  FROM source_data sd, total t
  ORDER BY sd.visitor_count DESC
$$;

-- 8c. Device Analytics
CREATE OR REPLACE FUNCTION get_device_analytics(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  device_type text,
  visitor_count bigint,
  page_views bigint,
  percentage numeric
)
LANGUAGE sql STABLE AS $$
  WITH dev_data AS (
    SELECT
      COALESCE(v.device_type, 'Unknown') AS device_type,
      count(DISTINCT v.session_id)::bigint AS visitor_count,
      count(*)::bigint AS page_views
    FROM visitors v
    WHERE v.created_at >= from_date AND v.created_at < to_date
    GROUP BY COALESCE(v.device_type, 'Unknown')
  ),
  total AS (
    SELECT sum(visitor_count) AS total_visitors FROM dev_data
  )
  SELECT
    dd.device_type, dd.visitor_count, dd.page_views,
    CASE WHEN t.total_visitors > 0
      THEN round(dd.visitor_count::numeric / t.total_visitors * 100, 1)
      ELSE 0 END AS percentage
  FROM dev_data dd, total t
  ORDER BY dd.visitor_count DESC
$$;

-- 8d. Country/City Analytics
CREATE OR REPLACE FUNCTION get_geo_analytics(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  country text,
  city text,
  visitor_count bigint,
  page_views bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(v.country, 'Unknown') AS country,
    COALESCE(v.city, 'Unknown') AS city,
    count(DISTINCT v.session_id)::bigint AS visitor_count,
    count(*)::bigint AS page_views
  FROM visitors v
  WHERE v.created_at >= from_date AND v.created_at < to_date
  GROUP BY v.country, v.city
  ORDER BY visitor_count DESC
  LIMIT 50
$$;

-- 8e. Top Pages
CREATE OR REPLACE FUNCTION get_top_pages(from_date timestamptz, to_date timestamptz, limit_count int DEFAULT 20)
RETURNS TABLE (
  page_path text,
  views bigint,
  unique_visitors bigint,
  avg_duration numeric
)
LANGUAGE sql STABLE AS $$
  SELECT
    v.page_path,
    count(*)::bigint AS views,
    count(DISTINCT v.session_id)::bigint AS unique_visitors,
    COALESCE(avg(v.duration_seconds), 0) AS avg_duration
  FROM visitors v
  WHERE v.created_at >= from_date AND v.created_at < to_date AND v.page_path IS NOT NULL
  GROUP BY v.page_path
  ORDER BY views DESC
  LIMIT limit_count
$$;

-- 8f. Browser Analytics
CREATE OR REPLACE FUNCTION get_browser_analytics(from_date timestamptz, to_date timestamptz)
RETURNS TABLE (
  browser text,
  visitor_count bigint,
  percentage numeric
)
LANGUAGE sql STABLE AS $$
  WITH browser_data AS (
    SELECT
      COALESCE(v.browser, 'Unknown') AS browser,
      count(DISTINCT v.session_id)::bigint AS visitor_count
    FROM visitors v
    WHERE v.created_at >= from_date AND v.created_at < to_date
    GROUP BY COALESCE(v.browser, 'Unknown')
  ),
  total AS (
    SELECT sum(visitor_count) AS total_visitors FROM browser_data
  )
  SELECT
    bd.browser, bd.visitor_count,
    CASE WHEN t.total_visitors > 0
      THEN round(bd.visitor_count::numeric / t.total_visitors * 100, 1)
      ELSE 0 END AS percentage
  FROM browser_data bd, total t
  ORDER BY bd.visitor_count DESC
$$;

-- ============================================================
-- 9. INDEXES for new query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_name);
CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_session ON visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_visitors_source ON visitors(referrer_source);
CREATE INDEX IF NOT EXISTS idx_visitors_device ON visitors(device_type);
CREATE INDEX IF NOT EXISTS idx_visitors_page ON visitors(page_path);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_date ON stock_movements(movement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popup_campaigns_views ON popup_campaigns(views DESC);
