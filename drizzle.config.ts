import { defineConfig } from "drizzle-kit";

// Used only by drizzle-kit CLI commands (generate/studio), not by the app at
// runtime. `generate` doesn't need a live DB at all (it diffs schema.ts
// against ./drizzle); the dbCredentials below only matter if you run a
// live-connection command like `drizzle-kit studio` or `migrate` — point
// DATABASE_URL at the server over an SSH tunnel for those (see docs/RESTORE.md
// for the tunnel pattern; same idea, different local port).
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres",
  },
});
