// Applies pending drizzle-kit migrations (./drizzle) to Postgres.
//
// Not `drizzle-kit migrate` directly: that CLI needs a `__drizzle_migrations`
// journal in the target DB, and Phase 4 found the very first migration had
// never been recorded there (it was applied by the one-time
// migrate-to-postgres.mjs script instead) — `migrate` failed with "relation
// already exists" until that journal row was backfilled by hand. Once
// backfilled, this script's plain `migrate()` call applies cleanly and keeps
// the journal correct for next time, same as the CLI would.
//
// Uses the same PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD as the app and
// `npm run dev` — point them at the SSH tunnel to the server's Postgres in
// your .env, the same tunnel dev already uses.
//
//   npm run db:migrate
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
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
const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
await pool.end();
