import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const dbPath = process.env.CATALOG_DB_PATH;

if (!dbPath) {
  throw new Error(
    "CATALOG_DB_PATH is not set. This must point at the shared catalog.db " +
      "file (outside this repo) used by the seed project and Directus. " +
      "See .env.example.",
  );
}

// libsql's local-file mode ("file:" URL, no libsql:// host) opens a standard
// SQLite file on disk — same on-disk format as any other SQLite driver, so
// the seed project and Directus (which use their own SQLite drivers) read
// and write the same file unchanged.
const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, { schema });
