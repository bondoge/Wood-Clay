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
    wbAccount: integer("wb_account").notNull(), // 1 | 2
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

// Ours, not Auth.js's — for later checkout/СДЭК. Maps to the address form
// fields already in AccountClient.tsx.
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  recipientName: text("recipient_name").notNull(),
  street: text("street").notNull(),
  postalCode: text("postal_code"),
  deliveryNote: text("delivery_note"),
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
  channel: text("channel", { enum: ["email", "phone"] }).notNull(),
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
