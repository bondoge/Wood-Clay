// One-time migration: copy workshops, masters, products from the local
// SQLite catalog.db (CATALOG_DB_PATH) into the server Postgres (DATABASE_URL
// — point it at an SSH tunnel, e.g. `ssh -N -L 5433:localhost:5432
// root@<server>` and DATABASE_URL=postgres://user:pass@localhost:5433/db).
//
// Reads via raw SQL through @libsql/client rather than drizzle's query
// builder + db/schema.ts: schema.ts is Postgres-dialect on this branch, and
// its drizzle-zod validators expect Postgres-shaped values (real booleans,
// real Date) — running them against raw SQLite values (0/1 integers, an
// integer-seconds timestamp) silently drops every row that doesn't parse.
// Raw SQL here means each conversion is explicit instead of implicit.
//
// Preserves original ids (so FK references stay valid) and every curated
// field exactly — no transformation, no re-applied defaults. Safe to run
// only once: aborts if the target `products` table already has rows.
//
//   node --env-file=.env scripts/migrate-to-postgres.mjs
import { createClient } from "@libsql/client";
import pg from "pg";

const sqlitePath = process.env.CATALOG_DB_PATH;
const databaseUrl = process.env.DATABASE_URL;

if (!sqlitePath) {
  throw new Error("CATALOG_DB_PATH is not set — see .env.example.");
}
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set — point it at the Postgres SSH tunnel (see .env.example / docs/RESTORE.md for the tunnel pattern).",
  );
}

const sqlite = createClient({ url: `file:${sqlitePath}` });
const pgClient = new pg.Client({ connectionString: databaseUrl });

async function migrateWorkshops() {
  const { rows } = await sqlite.execute(
    "SELECT id, slug, name, kind, style, location, founded_year, story, photo_alt FROM workshops ORDER BY id",
  );
  for (const r of rows) {
    await pgClient.query(
      `INSERT INTO workshops (id, slug, name, kind, style, location, founded_year, story, photo_alt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.id, r.slug, r.name, r.kind, r.style, r.location, r.founded_year, r.story, r.photo_alt],
    );
  }
  return rows.length;
}

async function migrateMasters() {
  const { rows } = await sqlite.execute("SELECT id, slug, name, workshop_id, bio, photo_alt FROM masters ORDER BY id");
  for (const r of rows) {
    await pgClient.query(
      `INSERT INTO masters (id, slug, name, workshop_id, bio, photo_alt) VALUES ($1,$2,$3,$4,$5,$6)`,
      [r.id, r.slug, r.name, r.workshop_id, r.bio, r.photo_alt],
    );
  }
  return rows.length;
}

async function migrateProducts() {
  const { rows } = await sqlite.execute(`
    SELECT id, wb_article, wb_account, source_title, source_description, source_images,
           product_type, imported_at, slug, price_rub, stock, style, style_confidence,
           style_reviewed, published, is_flagship, sort_order, own_images, own_title,
           own_story, workshop_id, master_id
    FROM products ORDER BY id
  `);
  for (const r of rows) {
    await pgClient.query(
      `INSERT INTO products (
         id, wb_article, wb_account, source_title, source_description, source_images,
         product_type, imported_at, slug, price_rub, stock, style, style_confidence,
         style_reviewed, published, is_flagship, sort_order, own_images, own_title,
         own_story, workshop_id, master_id
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21,$22)`,
      [
        r.id,
        r.wb_article,
        r.wb_account,
        r.source_title,
        r.source_description,
        r.source_images, // already a JSON-text string on disk — pass through, cast ::jsonb
        r.product_type,
        new Date(r.imported_at * 1000), // sqlite "timestamp" mode stores unix seconds
        r.slug,
        r.price_rub,
        r.stock,
        r.style,
        r.style_confidence,
        Boolean(r.style_reviewed),
        Boolean(r.published),
        Boolean(r.is_flagship),
        r.sort_order,
        r.own_images,
        r.own_title,
        r.own_story,
        r.workshop_id,
        r.master_id,
      ],
    );
  }
  return rows.length;
}

async function resetSequences() {
  await pgClient.query(`SELECT setval('workshops_id_seq', COALESCE((SELECT MAX(id) FROM workshops), 1))`);
  await pgClient.query(`SELECT setval('masters_id_seq', COALESCE((SELECT MAX(id) FROM masters), 1))`);
  await pgClient.query(`SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1))`);
}

async function main() {
  await pgClient.connect();

  const { rows: existing } = await pgClient.query("SELECT COUNT(*)::int AS n FROM products");
  if (existing[0].n > 0) {
    throw new Error(
      `products already has ${existing[0].n} row(s) in Postgres — refusing to run twice. ` +
        "Truncate workshops/masters/products on the target first if you really want to re-run.",
    );
  }

  await pgClient.query("BEGIN");
  try {
    const workshopCount = await migrateWorkshops();
    const masterCount = await migrateMasters();
    const productCount = await migrateProducts();
    await resetSequences();
    await pgClient.query("COMMIT");
    console.log(`Migrated: ${workshopCount} workshops, ${masterCount} masters, ${productCount} products.`);
  } catch (err) {
    await pgClient.query("ROLLBACK");
    throw err;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgClient.end();
    sqlite.close();
  });
