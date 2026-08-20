import { pgTable, text, integer, serial, boolean, timestamp, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

/**
 * The catalogue lives in server-hosted PostgreSQL (Phase 1 — previously a
 * SQLite file outside this repo), shared by three systems: a seed project
 * that pulls content and prices from the Wildberries API (not this repo), a
 * Directus admin (not this repo), and this site, which only reads.
 *
 * Every `products` column below is commented with its ownership group.
 * This is the whole point of the schema: a seed re-run upserts a row by
 * (wbAccount, wbArticle) and must only ever SET the WB-SYNCED columns —
 * never the MANUALLY-MANAGED ones, or it would clobber a human's edit made
 * in Directus since the last import. That upsert logic lives in the seed
 * project, not here, but this file is the contract it has to honour.
 */

export const styleValues = ["gzhel", "khokhloma", "author"] as const;

export const products = pgTable(
  "products",
  {
    // Stable surrogate key — NOT the WB article, so a product keeps its
    // identity across re-imports even if it's ever re-inserted.
    id: serial("id").primaryKey(),

    // ---------------------------------------------------------------------
    // WB-SYNCED — written once by the seed script from the Wildberries API.
    // Nothing else ever writes these; a re-run only overwrites this group.
    // Each has an own_* counterpart below with the identical suffix.
    // ---------------------------------------------------------------------
    wbArticle: text("wb_article").notNull(),
    wbAccount: integer("wb_account").notNull(), // 1 | 2 | 3 — store 3 added 2026-08-20, no catalog-seed presence
    wbTitle: text("wb_title").notNull(),
    wbDescription: text("wb_description").notNull(),
    wbImages: jsonb("wb_images").$type<string[]>().notNull(),
    productType: text("product_type").notNull(), // raw WB category, as returned by the API
    importedAt: timestamp("imported_at", { mode: "date" }).notNull(),

    // ---------------------------------------------------------------------
    // MANUALLY-MANAGED — edited in Directus. A seed re-run must NEVER
    // include these columns in its upsert's SET clause.
    // ---------------------------------------------------------------------
    slug: text("slug").notNull().unique(), // not in the original field list — bySlug() needs it; seed sets an initial value from wbTitle, Directus may override
    priceRub: integer("price_rub").notNull(),
    stock: integer("stock").notNull(),
    style: text("style", { enum: styleValues }).notNull().default("author"),
    published: boolean("published").notNull().default(false),
    // Curator-set highlight flag ("Топ-30" toggle in Directus) — no site
    // behaviour reads this yet, purely for the admin's own quick-marking use.
    isTop30: boolean("is_top30").notNull().default(false),

    // ---------------------------------------------------------------------
    // WB-SOURCED (dimensions) — not written by the regular catalog-seed
    // upsert (upsert.ts's SET clause never touches these), populated instead
    // by a standalone one-off/rerunnable script,
    // scripts/backfill-wb-dimensions.mjs (npm run backfill:wb-dimensions),
    // matched on the same (wbAccount, wbArticle) key. Nullable: WB's
    // content/v2/get/cards/list only returns one combined "dimensions"
    // figure per card — length/width/height/weight *with packaging*, no
    // separate bare-product size — and not every card has it filled in on
    // WB's side, so a product can legitimately have none of these. No
    // own_* curator-editable counterpart exists for these (unlike
    // title/description) — there's nothing for a human to meaningfully
    // override here, WB is the sole source.
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    weightG: integer("weight_g"), // grams, not kg — WB's weightBrutto is kg to 3dp, i.e. whole grams
    // The site reads only these, never wb_* — always populated (backfilled
    // 2026-08-10 for every existing row; the seed script is expected to
    // populate both wb_* and own_* on every future import too, so this is
    // never null in practice). wb_* stays around purely so a re-sync has
    // something to diff against without clobbering a curator's own_* edit.
    ownTitle: text("own_title").notNull(),
    ownDescription: text("own_description").notNull(),
    ownImages: jsonb("own_images").$type<string[]>().notNull(),
  },
  (t) => [uniqueIndex("products_wb_account_article_unique").on(t.wbAccount, t.wbArticle)],
);

/**
 * Customer accounts (Phase 4). `users`/`accounts`/`sessions`/`verificationTokens`
 * follow Auth.js's own Drizzle-adapter schema shape (id/email/emailVerified/
 * image on `users`; the other three are boilerplate the adapter's types
 * expect even though `accounts` stays empty until an OAuth provider, if ever,
 * is added — this site only uses the Credentials provider). `emailVerified`
 * doubles as our own email-verification flag; there's no separate column.
 * Everything past that (passwordHash, name/phone fields) is ours.
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  phoneVerifiedAt: timestamp("phone_verified_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// A saved СДЭК pickup point (ПВЗ) — same shape as the orders.cdekPvz*
// columns below, since this is literally "a pickup point the customer
// picked before, worth reusing." A user can have several; isDefault marks
// the one that pre-fills checkout.
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cdekPvzCode: text("cdek_pvz_code").notNull(),
  cdekPvzCity: text("cdek_pvz_city").notNull(),
  cdekPvzAddress: text("cdek_pvz_address").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Our own phone/email verification-code flow — distinct from Auth.js's
// verificationTokens above, which it reserves for its own email-magic-link
// provider (not used here). codeHash is sha256, not argon2: the protection
// here is the expiry + attempts cap, not hash cost — it's a 6-digit code,
// not a password.
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  channel: text("channel", { enum: ["email", "phone", "password_reset"] }).notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Cart and orders (Phase 5). A logged-in user's cart persists here; a
 * guest's cart lives in the browser only (see CartContext) — there is no
 * server-side row for a guest cart at all.
 */
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_items_cart_product_unique").on(t.cartId, t.productId)],
);

export const orderStatusValues = ["pending_payment", "paid", "cancelled", "fulfilled"] as const;

// An order is always self-contained (contact info copied directly onto the
// row) so a guest checkout — the default, frictionless path — never needs a
// user row. userId is nullable and set only when the buyer was logged in at
// checkout, or later via the post-purchase account offer.
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status", { enum: orderStatusValues }).notNull().default("pending_payment"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),
  // Phase 5's provisional free-text capture — no longer populated by
  // checkout (Phase 7 replaced it with the structured СДЭК fields below),
  // kept in the schema for a possible future non-ПВЗ courier delivery mode.
  deliveryCity: text("delivery_city"),
  deliveryAddress: text("delivery_address"),
  deliveryNote: text("delivery_note"),
  // The СДЭК pickup point (ПВЗ) chosen via the widget (Phase 7).
  // cdekPvzCode is what matters for manually creating the shipment in the
  // СДЭК cabinet; city/address are for display (личный кабинет, Directus,
  // confirmation email).
  cdekPvzCode: text("cdek_pvz_code"),
  cdekPvzCity: text("cdek_pvz_city"),
  cdekPvzAddress: text("cdek_pvz_address"),
  subtotalRub: integer("subtotal_rub").notNull(),
  shippingCostRub: integer("shipping_cost_rub"), // set in Phase 7
  totalRub: integer("total_rub").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),

  // Payment (Phase 6). yookassaPaymentId also doubles as a creation claim —
  // set to a placeholder before the ЮKassa API call, then to the real
  // payment id on success, so a concurrent/retried request can't create a
  // second payment for the same order. returnToken is an unguessable id
  // used only by the customer-return page (see lib/orders.ts) — deliberately
  // not the order's own sequential id, which a guest has no session to be
  // checked against.
  yookassaPaymentId: text("yookassa_payment_id").unique(),
  paidAt: timestamp("paid_at", { mode: "date" }),
  returnToken: text("return_token").unique(),
});

// Snapshotted at order time — title/slug/price are copied, not just a live
// FK, so an order stays fully readable even if the product is later edited
// or removed from the catalogue.
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productTitle: text("product_title").notNull(),
  productSlug: text("product_slug").notNull(),
  // A single-element array, not a plain string — so Directus's
  // first-image-thumbnail display (built for the products.own_images/
  // wb_images shape) renders it in the order_items list with no new
  // extension needed. Snapshotted at order time, same reasoning as
  // productTitle/productSlug above.
  productImage: jsonb("product_image").$type<string[]>(),
  priceRub: integer("price_rub").notNull(),
  quantity: integer("quantity").notNull(),
});

/**
 * Read-only (from the app's perspective), for Directus Insights
 * (business-analytics dashboards over our own order data — separate from
 * Яндекс.Метрика, which tracks visitor behaviour, not money). One row per
 * product, pre-aggregated: Directus's Insights panels can do single-collection
 * aggregation (count/sum/avg by time bucket) but have no "group by an
 * arbitrary field" panel type, so "top products by units/revenue" can't be
 * built as a live join+aggregation in the panel UI.
 *
 * This is a plain table, not a Postgres view — Directus does not support
 * database views (or materialized views) as collections at all (confirmed
 * against a live test: a tracked view/matview 404s in the Data Studio no
 * matter how the schema cache is refreshed). So the grouping this needs has
 * to happen ahead of time, into a real table, refreshed periodically rather
 * than computed live on read. `scripts/refresh-sales-summary.mjs` runs the
 * refresh (`npm run refresh:sales-summary`, needs the SSH-tunnel PGHOST/etc,
 * same as db:migrate) — on the server, the same SQL runs every 15 minutes
 * from root's crontab (minute step of 15, `docker exec -i
 * woodandclay-postgres psql ... < /opt/woodclay/refresh-sales-summary.sql`,
 * alongside the existing nightly backup.sh entry), independent of app deploys.
 *
 * productId is deliberately NOT a references() FK to products — Directus
 * auto-detects a real FK as a relation and requires GraphQL sub-selection on
 * it (`product_id { ... }` instead of a plain scalar), which broke every
 * panel on the dashboard at once: Insights batches all of a dashboard's
 * panels into a single GraphQL request, so one panel requesting product_id
 * as a bare scalar 400'd the whole batch, silently zeroing out panels that
 * had nothing to do with this table. This table is a flat denormalized
 * snapshot (title is already copied in) with no relational use for Directus,
 * so there's nothing lost by leaving it unconstrained here.
 *
 * "Paid" here means status IN ('paid', 'fulfilled') — fulfilled is what a
 * paid order becomes once shipped (see orders.status), not a separate sale;
 * filtering on literal 'paid' alone would silently drop revenue for every
 * order marked shipped.
 */
export const productSalesSummary = pgTable("product_sales_summary", {
  productId: integer("product_id").primaryKey(),
  title: text("title").notNull(),
  unitsSold: integer("units_sold").notNull(),
  revenueRub: integer("revenue_rub").notNull(),
  refreshedAt: timestamp("refreshed_at", { mode: "date" }).notNull().defaultNow(),
});
