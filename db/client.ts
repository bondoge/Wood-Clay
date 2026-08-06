import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. This must point at the shared Postgres " +
      "catalogue database also used by the seed project and Directus. " +
      "See .env.example.",
  );
}

// Pool connects lazily — no connection is opened until the first query runs.
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
