import { pgTable, text, integer, serial, boolean, real, timestamp, jsonb, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

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

export const workshops = pgTable("workshops", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["own", "partner"] }).notNull(),
  style: text("style", { enum: styleValues }).notNull(),
  location: text("location").notNull(),
  foundedYear: integer("founded_year"),
  story: text("story").notNull(),
  photoAlt: text("photo_alt"),
});

export const masters = pgTable("masters", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  workshopId: integer("workshop_id")
    .notNull()
    .references(() => workshops.id),
  bio: text("bio").notNull(),
  photoAlt: text("photo_alt"),
});

export const products = pgTable(
  "products",
  {
    // Stable surrogate key — NOT the WB article, so a product keeps its
    // identity across re-imports even if it's ever re-inserted.
    id: serial("id").primaryKey(),

    // ---------------------------------------------------------------------
    // WB-SYNCED — written once by the seed script from the Wildberries API.
    // Nothing else ever writes these; a re-run only overwrites this group.
    // ---------------------------------------------------------------------
    wbArticle: text("wb_article").notNull(),
    wbAccount: integer("wb_account").notNull(), // 1 | 2
    sourceTitle: text("source_title").notNull(),
    sourceDescription: text("source_description").notNull(),
    sourceImages: jsonb("source_images").$type<string[]>().notNull(),
    productType: text("product_type").notNull(), // raw WB category, as returned by the API
    importedAt: timestamp("imported_at", { mode: "date" }).notNull(),

    // ---------------------------------------------------------------------
    // MANUALLY-MANAGED — edited in Directus. A seed re-run must NEVER
    // include these columns in its upsert's SET clause.
    // ---------------------------------------------------------------------
    slug: text("slug").notNull().unique(), // not in the original field list — bySlug() needs it; seed sets an initial value from sourceTitle, Directus may override
    priceRub: integer("price_rub").notNull(),
    stock: integer("stock").notNull(),
    style: text("style", { enum: styleValues }).notNull().default("author"),
    styleConfidence: real("style_confidence"), // 0..1 — the seed LLM's guess certainty
    styleReviewed: boolean("style_reviewed").notNull().default(false),
    published: boolean("published").notNull().default(false),
    isFlagship: boolean("is_flagship").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ownImages: jsonb("own_images").$type<string[]>(),
    ownTitle: text("own_title"),
    ownStory: text("own_story"),
    workshopId: integer("workshop_id").references(() => workshops.id),
    masterId: integer("master_id").references(() => masters.id),
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
  postalCode: text("postal_code").notNull(),
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
