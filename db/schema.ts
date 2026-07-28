import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * The catalogue lives in a SQLite file OUTSIDE this repo (path via
 * CATALOG_DB_PATH), shared by three systems: a seed project that pulls
 * content and prices from the Wildberries API (not this repo), a Directus
 * admin (not this repo), and this site, which only reads.
 *
 * Every `products` column below is commented with its ownership group.
 * This is the whole point of the schema: a seed re-run upserts a row by
 * (wbAccount, wbArticle) and must only ever SET the WB-SYNCED columns —
 * never the MANUALLY-MANAGED ones, or it would clobber a human's edit made
 * in Directus since the last import. That upsert logic lives in the seed
 * project, not here, but this file is the contract it has to honour.
 */

export const styleValues = ["gzhel", "khokhloma", "zhostovo", "other"] as const;

export const workshops = sqliteTable("workshops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["own", "partner"] }).notNull(),
  style: text("style", { enum: styleValues }).notNull(),
  location: text("location").notNull(),
  foundedYear: integer("founded_year"),
  story: text("story").notNull(),
  photoAlt: text("photo_alt"),
});

export const masters = sqliteTable("masters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  workshopId: integer("workshop_id")
    .notNull()
    .references(() => workshops.id),
  bio: text("bio").notNull(),
  photoAlt: text("photo_alt"),
});

export const products = sqliteTable(
  "products",
  {
    // Stable surrogate key — NOT the WB article, so a product keeps its
    // identity across re-imports even if it's ever re-inserted.
    id: integer("id").primaryKey({ autoIncrement: true }),

    // ---------------------------------------------------------------------
    // WB-SYNCED — written once by the seed script from the Wildberries API.
    // Nothing else ever writes these; a re-run only overwrites this group.
    // ---------------------------------------------------------------------
    wbArticle: text("wb_article").notNull(),
    wbAccount: integer("wb_account").notNull(), // 1 | 2
    sourceTitle: text("source_title").notNull(),
    sourceDescription: text("source_description").notNull(),
    sourceImages: text("source_images", { mode: "json" }).$type<string[]>().notNull(),
    productType: text("product_type").notNull(), // raw WB category, as returned by the API
    importedAt: integer("imported_at", { mode: "timestamp" }).notNull(),

    // ---------------------------------------------------------------------
    // MANUALLY-MANAGED — edited in Directus. A seed re-run must NEVER
    // include these columns in its upsert's SET clause.
    // ---------------------------------------------------------------------
    slug: text("slug").notNull().unique(), // not in the original field list — bySlug() needs it; seed sets an initial value from sourceTitle, Directus may override
    priceRub: integer("price_rub").notNull(),
    stock: integer("stock").notNull(),
    style: text("style", { enum: styleValues }).notNull().default("other"),
    styleConfidence: real("style_confidence"), // 0..1 — the seed LLM's guess certainty
    styleReviewed: integer("style_reviewed", { mode: "boolean" }).notNull().default(false),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    isFlagship: integer("is_flagship", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ownImages: text("own_images", { mode: "json" }).$type<string[]>(),
    ownTitle: text("own_title"),
    ownStory: text("own_story"),
    workshopId: integer("workshop_id").references(() => workshops.id),
    masterId: integer("master_id").references(() => masters.id),
  },
  (t) => [uniqueIndex("products_wb_account_article_unique").on(t.wbAccount, t.wbArticle)],
);
