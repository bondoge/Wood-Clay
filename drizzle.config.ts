import { defineConfig } from "drizzle-kit";

// Used only by drizzle-kit CLI commands (generate/studio), not by the app at
// runtime — the app's connection (db/client.ts) requires CATALOG_DB_PATH with
// no fallback. `generate` doesn't need a live DB at all (it diffs schema.ts
// against ./drizzle); the dbCredentials below only matter if you run a
// live-connection command like `drizzle-kit studio` locally.
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.CATALOG_DB_PATH ? `file:${process.env.CATALOG_DB_PATH}` : "file:./.drizzle-dev.db",
  },
});
