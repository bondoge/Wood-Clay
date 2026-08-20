// Refreshes product_sales_summary (see db/schema.ts) from orders/order_items —
// Directus can't compute this live (no view support, no group-by panel), so
// it's a plain table, recomputed from scratch on each run rather than
// incrementally updated. Cheap at this catalogue's size (~2200 products);
// revisit if that ever stops being true.
//
// Uses the same PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD as the app —
// point them at the SSH tunnel to the server's Postgres in your .env, same
// as npm run db:migrate.
//
//   npm run refresh:sales-summary
import { Pool } from "pg";

const REQUIRED_VARS = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`${missing.join(", ")} not set — see .env.example. Point these at the SSH tunnel.`);
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");
  // TRUNCATE, not DELETE — this table has no other writers to race, and a
  // full recompute every run makes "TRUNCATE + INSERT" simpler than a
  // proper upsert/diff.
  await client.query("TRUNCATE product_sales_summary");
  const { rowCount } = await client.query(`
    INSERT INTO product_sales_summary (product_id, title, units_sold, revenue_rub)
    SELECT
      p.id,
      p.own_title,
      COALESCE(SUM(oi.quantity) FILTER (WHERE o.status IN ('paid', 'fulfilled')), 0)::int,
      COALESCE(SUM(oi.price_rub * oi.quantity) FILTER (WHERE o.status IN ('paid', 'fulfilled')), 0)::int
    FROM products p
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY p.id, p.own_title
  `);
  await client.query("COMMIT");
  console.log(`product_sales_summary refreshed: ${rowCount} products.`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  await pool.end();
}
