-- Analytics & Reporting System
-- Provides aggregation functions for the reports dashboard

-- 1. Daily Sales Aggregation
create or replace function get_daily_sales(from_date timestamptz, to_date timestamptz)
returns table (date text, orders bigint, revenue numeric, items_sold bigint, avg_order_value numeric)
language sql stable as $$
  select
    to_char(o.created_at::date, 'YYYY-MM-DD') as date,
    count(distinct o.id)::bigint as orders,
    coalesce(sum(o.total), 0) as revenue,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    case when count(distinct o.id) > 0 then round(sum(o.total) / count(distinct o.id), 2) else 0 end as avg_order_value
  from orders o
  left join order_items oi on oi.order_id = o.id
  where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
  group by o.created_at::date
  order by o.created_at::date
$$;

-- 2. Sales by Status Breakdown
create or replace function get_order_status_breakdown()
returns table (status text, count bigint, total numeric)
language sql stable as $$
  select o.status::text, count(*)::bigint, coalesce(sum(o.total), 0) as total
  from orders o
  group by o.status
  order by count(*) desc
$$;

-- 3. Payment Status Breakdown
create or replace function get_payment_status_breakdown()
returns table (status text, count bigint, total numeric)
language sql stable as $$
  select o.payment_status::text, count(*)::bigint, coalesce(sum(o.total), 0) as total
  from orders o
  group by o.payment_status
  order by count(*) desc
$$;

-- 4. Top Selling Products
create or replace function get_top_selling_products(limit_count int default 10)
returns table (product_id uuid, name text, sku text, quantity_sold bigint, revenue numeric, avg_price numeric)
language sql stable as $$
  select
    p.id as product_id,
    p.name,
    p.sku,
    coalesce(sum(oi.quantity), 0)::bigint as quantity_sold,
    coalesce(sum(oi.total_price), 0) as revenue,
    case when sum(oi.quantity) > 0 then round(sum(oi.total_price) / sum(oi.quantity), 2) else 0 end as avg_price
  from products p
  join order_items oi on oi.product_id = p.id
  join orders o on o.id = oi.order_id and o.status != 'cancelled'
  group by p.id, p.name, p.sku
  order by quantity_sold desc
  limit limit_count
$$;

-- 5. Category Performance
create or replace function get_category_sales()
returns table (category_id uuid, category_name text, products_count bigint, items_sold bigint, revenue numeric)
language sql stable as $$
  select
    c.id as category_id,
    c.name as category_name,
    count(distinct p.id)::bigint as products_count,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    coalesce(sum(oi.total_price), 0) as revenue
  from categories c
  left join products p on p.category_id = c.id
  left join order_items oi on oi.product_id = p.id
  left join orders o on o.id = oi.order_id and o.status != 'cancelled'
  group by c.id, c.name
  order by revenue desc
$$;

-- 6. Monthly Revenue Trend
create or replace function get_revenue_trend(months int default 12)
returns table (month text, revenue numeric, orders bigint, growth_pct numeric)
language sql stable as $$
  with monthly as (
    select
      to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
      coalesce(sum(o.total), 0) as revenue,
      count(distinct o.id)::bigint as orders
    from orders o
    where o.status != 'cancelled' and o.created_at >= date_trunc('month', now()) - (months || ' months')::interval
    group by date_trunc('month', o.created_at)
    order by date_trunc('month', o.created_at)
  )
  select
    m.month,
    m.revenue,
    m.orders,
    case when lag(m.revenue) over (order by m.month) > 0
      then round(((m.revenue - lag(m.revenue) over (order by m.month)) / lag(m.revenue) over (order by m.month)) * 100, 2)
      else 0 end as growth_pct
  from monthly m
$$;

-- 7. Customer Acquisition (new customers per month)
create or replace function get_customer_acquisition(months int default 12)
returns table (month text, new_customers bigint, total_customers bigint)
language sql stable as $$
  with monthly as (
    select
      to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
      count(*)::bigint as new_customers,
      -- Running total
      sum(count(*)) over (order by date_trunc('month', created_at))::bigint as total_customers
    from profiles
    where role = 'customer' and created_at >= date_trunc('month', now()) - (months || ' months')::interval
    group by date_trunc('month', created_at)
    order by date_trunc('month', created_at)
  )
  select * from monthly
$$;

-- 8. Customer Lifetime Value
create or replace function get_customer_ltv()
returns table (segment text, customer_count bigint, avg_ltv numeric, total_revenue numeric)
language sql stable as $$
  select
    case
      when cust.total_spent >= 50000 then 'VIP'
      when cust.total_spent >= 10000 then 'Premium'
      when cust.total_spent >= 1000 then 'Regular'
      else 'Low Value'
    end as segment,
    count(*)::bigint as customer_count,
    round(avg(cust.total_spent), 2) as avg_ltv,
    sum(cust.total_spent) as total_revenue
  from (
    select
      o.customer_id,
      coalesce(sum(o.total), 0) as total_spent
    from orders o
    where o.status != 'cancelled' and o.payment_status = 'paid'
    group by o.customer_id
  ) cust
  group by segment
  order by avg_ltv desc
$$;

-- 9. Customer Retention Rate
create or replace function get_customer_retention()
returns table (month text, new_customers bigint, returning_customers bigint, retention_rate numeric)
language sql stable as $$
  with monthly_orders as (
    select
      to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
      o.customer_id,
      count(*) as order_count
    from orders o
    where o.status != 'cancelled'
    group by date_trunc('month', o.created_at), o.customer_id
  ),
  customer_first_order as (
    select customer_id, min(month) as first_month
    from monthly_orders
    group by customer_id
  )
  select
    mo.month,
    count(distinct case when cfo.first_month = mo.month then mo.customer_id end)::bigint as new_customers,
    count(distinct case when cfo.first_month < mo.month then mo.customer_id end)::bigint as returning_customers,
    case
      when count(distinct mo.customer_id) > 0
      then round(count(distinct case when cfo.first_month < mo.month then mo.customer_id end)::numeric / count(distinct mo.customer_id) * 100, 2)
      else 0
    end as retention_rate
  from monthly_orders mo
  join customer_first_order cfo on cfo.customer_id = mo.customer_id
  group by mo.month
  order by mo.month
$$;

-- 10. Product Performance (views, sales, returns)
create or replace function get_product_performance(limit_count int default 20)
returns table (
  product_id uuid, name text, sku text, category text,
  stock int, stock_status text, price numeric, cost_price numeric,
  total_sold bigint, total_revenue numeric, total_profit numeric,
  profit_margin numeric, return_count bigint
)
language sql stable as $$
  select
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
  from products p
  left join categories c on c.id = p.category_id
  left join (
    select oi.product_id,
      sum(oi.quantity) as sold,
      sum(oi.total_price) as revenue,
      sum(oi.total_price) - (sum(oi.quantity) * coalesce(p2.cost_price, 0)) as profit
    from order_items oi
    join orders o on o.id = oi.order_id and o.status != 'cancelled'
    join products p2 on p2.id = oi.product_id
    group by oi.product_id
  ) s on s.product_id = p.id
  left join (
    select oi.product_id, count(*)::bigint as return_count
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status = 'returned'
    group by oi.product_id
  ) r on r.product_id = p.id
  order by coalesce(s.revenue, 0) desc
  limit limit_count
$$;

-- 11. Profit & Loss Summary
create or replace function get_profit_loss(from_date timestamptz, to_date timestamptz)
returns table (
  category text,
  amount numeric
)
language sql stable as $$
  select category, amount from (
    select 'Revenue' as category, coalesce(sum(o.total), 0) as amount
    from orders o where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
    union all
    select 'COGS' as category, -coalesce(sum(p.cost_price * oi.quantity), 0) as amount
    from order_items oi
    join orders o on o.id = oi.order_id and o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
    join products p on p.id = oi.product_id
    union all
    select 'Shipping Cost' as category, -coalesce(sum(o.shipping_charge), 0) as amount
    from orders o where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
    union all
    select 'Discounts Given' as category, -coalesce(sum(o.discount), 0) as amount
    from orders o where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
    union all
    select 'Refunds' as category, -coalesce(sum(r.amount), 0) as amount
    from refunds r
    join orders o on o.id = r.order_id
    where r.status = 'approved' and r.requested_at >= from_date and r.requested_at < to_date
    union all
    select 'Gross Profit' as category,
      coalesce(sum(o.total), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) - coalesce(sum(o.shipping_charge), 0) - coalesce(sum(o.discount), 0) as amount
    from orders o
    join order_items oi on oi.order_id = o.id
    join products p on p.id = oi.product_id
    where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
    union all
    select 'Net Profit' as category,
      coalesce(sum(o.total), 0) - coalesce(sum(p.cost_price * oi.quantity), 0) - coalesce(sum(o.shipping_charge), 0) - coalesce(sum(o.discount), 0) - coalesce(sum(r.amount), 0) as amount
    from orders o
    join order_items oi on oi.order_id = o.id
    join products p on p.id = oi.product_id
    left join refunds r on r.order_id = o.id and r.status = 'approved'
    where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
  ) t
  group by t.category, t.amount
  order by case
    when t.category = 'Revenue' then 1
    when t.category = 'COGS' then 2
    when t.category = 'Gross Profit' then 3
    when t.category = 'Shipping Cost' then 4
    when t.category = 'Discounts Given' then 5
    when t.category = 'Refunds' then 6
    when t.category = 'Net Profit' then 7
    else 8
  end
$$;

-- 12. Profit by Product
create or replace function get_profit_by_product(from_date timestamptz, to_date timestamptz, limit_count int default 20)
returns table (product_id uuid, name text, sku text, units_sold bigint, revenue numeric, cost numeric, profit numeric, margin numeric)
language sql stable as $$
  select
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
  from products p
  join order_items oi on oi.product_id = p.id
  join orders o on o.id = oi.order_id
  where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
  group by p.id, p.name, p.sku
  order by profit desc
  limit limit_count
$$;

-- 13. Sales by Category
create or replace function get_sales_by_category(from_date timestamptz, to_date timestamptz)
returns table (category_id uuid, category_name text, items_sold bigint, revenue numeric, order_count bigint)
language sql stable as $$
  select
    c.id as category_id,
    c.name as category_name,
    coalesce(sum(oi.quantity), 0)::bigint as items_sold,
    coalesce(sum(oi.total_price), 0) as revenue,
    count(distinct o.id)::bigint as order_count
  from categories c
  join products p on p.category_id = c.id
  join order_items oi on oi.product_id = p.id
  join orders o on o.id = oi.order_id
  where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
  group by c.id, c.name
  order by revenue desc
$$;

-- 14. Coupon Usage Report
create or replace function get_coupon_report(from_date timestamptz, to_date timestamptz)
returns table (coupon_code text, coupon_type text, times_used bigint, total_discount numeric, revenue_with_coupon numeric)
language sql stable as $$
  select
    c.code as coupon_code,
    c.type::text,
    count(distinct o.id)::bigint as times_used,
    coalesce(sum(o.discount), 0) as total_discount,
    coalesce(sum(o.total), 0) as revenue_with_coupon
  from orders o
  join coupons c on c.code = o.coupon_code
  where o.created_at >= from_date and o.created_at < to_date and o.status != 'cancelled'
  group by c.code, c.type
  order by times_used desc
$$;

-- 15. Abandoned Cart / Visitor Analytics
create or replace function get_visitor_analytics(from_date timestamptz, to_date timestamptz)
returns table (date text, visitors bigint, pageviews bigint, orders bigint, conversion_rate numeric)
language sql stable as $$
  select
    to_char(v.created_at::date, 'YYYY-MM-DD') as date,
    count(distinct v.session_id)::bigint as visitors,
    count(*)::bigint as pageviews,
    count(distinct o.id)::bigint as orders,
    case when count(distinct v.session_id) > 0
      then round((count(distinct o.id)::numeric / count(distinct v.session_id)) * 100, 4)
      else 0 end as conversion_rate
  from visitors v
  left join orders o on o.created_at::date = v.created_at::date and o.status != 'cancelled'
  where v.created_at >= from_date and v.created_at < to_date
  group by v.created_at::date
  order by v.created_at::date
$$;

-- 16. Indexes for analytics queries
create index if not exists idx_orders_total_status on orders(total, status);
create index if not exists idx_orders_payment_status_total on orders(payment_status, total);
create index if not exists idx_order_items_product_total on order_items(product_id, total_price);
create index if not exists idx_order_items_order_product on order_items(order_id, product_id);
create index if not exists idx_profiles_role_created on profiles(role, created_at);
