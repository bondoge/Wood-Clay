CREATE VIEW "public"."product_sales_summary" AS (
  select
    p.id as product_id,
    p.own_title as title,
    coalesce(sum(oi.quantity) filter (where o.status in ('paid', 'fulfilled')), 0)::int as units_sold,
    coalesce(sum(oi.price_rub * oi.quantity) filter (where o.status in ('paid', 'fulfilled')), 0)::int as revenue_rub
  from products p
  left join order_items oi on oi.product_id = p.id
  left join orders o on o.id = oi.order_id
  group by p.id, p.own_title
);