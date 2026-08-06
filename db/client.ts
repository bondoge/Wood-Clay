import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const REQUIRED_VARS = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"] as const;
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set. These must point at the ` +
      "shared Postgres catalogue database also used by the seed project and Directus. See .env.example.",
  );
}

// Discrete fields, not a single connection-string URL: POSTGRES_PASSWORD can
// contain characters (@, :, /, %) that aren't valid unescaped inside a URL,
// and docker-compose's ${...} interpolation has no way to URL-encode them —
// building a URL that way broke a real deploy. pg's Pool takes these fields
// directly, so there's nothing to escape.
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export const db = drizzle(pool, { schema });
