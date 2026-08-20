// Imports products that exist on Wildberries but not yet in our `products`
// table — INSERT-only, never touches an existing row (no upsert/ON CONFLICT
// at all). Covers all three WB store accounts (1, 2, 3 — see db/schema.ts's
// comment on wbAccount).
//
// NOT catalog-seed's own pipeline: that project's db.ts points at a stale
// local SQLite file (data/catalog.db) seeded from the very first Postgres
// migration, not the real server Postgres this site actually reads — so
// running it would write nowhere useful. This script talks to the real DB
// directly (same PGHOST/etc as db:migrate) and ports just the pieces of
// catalog-seed's logic a brand-new row actually needs: classify.ts (style),
// slug.ts (slug), wbCards/wbPrices/wbStock.ts (content+price+stock), and
// images.ts/s3.ts (photo mirroring to our own S3 bucket, same key layout).
//
// New rows: published=false (curator reviews in Directus, same as every
// import), is_top30=false, own_* mirrors wb_* initially (same convention as
// every existing row per db/schema.ts's comment).
//
//   npm run import:new-wb-products -- --dry-run   (preview only, no writes)
//   npm run import:new-wb-products
import { Pool } from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const REQUIRED_VARS = [
  "PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD",
  "WB_CONTENT_KEY_1", "WB_CONTENT_KEY_2", "WB_CONTENT_KEY_3",
  "WB_PRICES_KEY_1", "WB_PRICES_KEY_2", "WB_PRICES_KEY_3",
  "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_REGION", "S3_PUBLIC_BASE_URL",
];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`${missing.join(", ")} not set — see .env.example.`);
}

const DRY_RUN = process.argv.includes("--dry-run");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- throttled HTTP, same token-bucket-header approach as
// catalog-seed/src/wbClient.ts and scripts/backfill-wb-dimensions.mjs -------
function createThrottledClient(minIntervalMs) {
  let nextAllowedAt = 0;
  async function request(url, init, maxRetries = 5) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const wait = nextAllowedAt - Date.now();
      if (wait > 0) await sleep(wait);
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
      const remaining = res.headers.get("X-Ratelimit-Remaining");
      const reset = res.headers.get("X-Ratelimit-Reset");
      const retry = res.headers.get("X-Ratelimit-Retry");
      if (res.status === 429) {
        const waitMs = (retry ? Number(retry) : minIntervalMs / 1000) * 1000 + 500;
        console.warn(`429 from ${url}, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        nextAllowedAt = Date.now() + waitMs;
        continue;
      }
      nextAllowedAt =
        remaining !== null && Number(remaining) <= 0 && reset !== null
          ? Date.now() + Number(reset) * 1000 + 500
          : Date.now() + minIntervalMs;
      return res;
    }
    throw new Error(`Exceeded max retries for ${url}`);
  }
  return { request };
}

const contentClient = createThrottledClient(650); // 100 req/min
const pricesClient = createThrottledClient(900); // 10 req/6s + headroom
const marketplaceClient = createThrottledClient(200); // 300 req/min

// --- content-api: cards (same shape as backfill-wb-dimensions.mjs) --------
const CONTENT_API_URL = "https://content-api.wildberries.ru/content/v2/get/cards/list";

async function fetchAllCards(apiKey) {
  const cards = [];
  let cursor = { limit: 100 };
  for (;;) {
    const res = await contentClient.request(CONTENT_API_URL, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { cursor, filter: { withPhoto: -1 } } }),
    });
    if (!res.ok) throw new Error(`content-api ${res.status}: ${await res.text()}`);
    const data = await res.json();
    cards.push(...data.cards);
    if (data.cards.length === 0 || data.cursor.total < cursor.limit) return cards;
    cursor = { limit: 100, updatedAt: data.cursor.updatedAt, nmID: data.cursor.nmID };
  }
}

// --- discounts-prices-api: current price (catalog-seed/src/wbPrices.ts) ---
async function fetchPrices(apiKey) {
  const prices = new Map();
  let offset = 0;
  for (;;) {
    const res = await pricesClient.request(
      `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=1000&offset=${offset}`,
      { method: "GET", headers: { Authorization: apiKey } },
    );
    if (!res.ok) throw new Error(`discounts-prices-api ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.error) throw new Error(`discounts-prices-api error: ${data.errorText}`);
    for (const good of data.data.listGoods) {
      const price = good.sizes[0]?.discountedPrice;
      if (price !== undefined) prices.set(good.nmID, price);
    }
    if (data.data.listGoods.length < 1000) return prices;
    offset += 1000;
  }
}

// --- marketplace-api: stock, scoped to just the given cards
// (catalog-seed/src/wbStock.ts) ---------------------------------------------
async function marketplaceAssertOk(res, label) {
  if (res.status === 409) {
    throw new Error(`marketplace-api ${label} returned 409 (costs 10x rate budget, not retrying)`);
  }
  if (!res.ok) throw new Error(`marketplace-api ${label} ${res.status}: ${await res.text()}`);
}

async function fetchStock(apiKey, cards) {
  const allSkus = [...new Set(cards.flatMap((c) => c.sizes.flatMap((s) => s.skus)))];
  if (allSkus.length === 0) return new Map();

  const whRes = await marketplaceClient.request("https://marketplace-api.wildberries.ru/api/v3/warehouses", {
    method: "GET",
    headers: { Authorization: apiKey },
  });
  await marketplaceAssertOk(whRes, "warehouses");
  const warehouses = await whRes.json();

  const skuTotals = new Map();
  for (const wh of warehouses) {
    for (let i = 0; i < allSkus.length; i += 1000) {
      const skuChunk = allSkus.slice(i, i + 1000);
      const res = await marketplaceClient.request(
        `https://marketplace-api.wildberries.ru/api/v3/stocks/${wh.id}`,
        {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ skus: skuChunk }),
        },
      );
      await marketplaceAssertOk(res, `stocks/${wh.id}`);
      const data = await res.json();
      for (const { sku, amount } of data.stocks) {
        skuTotals.set(sku, (skuTotals.get(sku) ?? 0) + amount);
      }
    }
  }

  const stockByNmId = new Map();
  for (const card of cards) {
    const total = card.sizes.flatMap((s) => s.skus).reduce((sum, sku) => sum + (skuTotals.get(sku) ?? 0), 0);
    stockByNmId.set(card.nmID, total);
  }
  return stockByNmId;
}

// --- style classification (catalog-seed/src/classify.ts) -------------------
const KEYWORDS = {
  gzhel: [/гжель/i, /кобальт/i, /син[ьи]-?бел/i],
  khokhloma: [/хохлом/i, /золот/i, /огненн/i],
};
const VENDOR_CODE_PREFIX = { х: "khokhloma", гж: "gzhel", ж: "author" };

function matchKeywords(text) {
  const matches = Object.keys(KEYWORDS).filter((style) => KEYWORDS[style].some((re) => re.test(text)));
  return matches.length === 1 ? matches[0] : null;
}

function classify({ vendorCode, productType, title, description }) {
  const prefix = vendorCode.split("/")[0]?.toLowerCase();
  if (VENDOR_CODE_PREFIX[prefix]) return VENDOR_CODE_PREFIX[prefix];
  const byType = matchKeywords(productType);
  if (byType) return byType;
  const byText = matchKeywords(`${title} ${description}`);
  if (byText) return byText;
  return "author";
}

// --- slug (catalog-seed/src/slug.ts) ---------------------------------------
const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};
function slugify(text) {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
function slugFromTitle(title, wbArticle) {
  return slugify(title) || `product-${wbArticle}`;
}

// --- images: mirror to our S3 bucket (catalog-seed/src/images.ts + s3.ts) --
const s3 = new S3Client({
  endpoint: `https://${process.env.S3_ENDPOINT}`,
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY },
});

async function uploadObject(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${process.env.S3_PUBLIC_BASE_URL}/${key}`;
}

async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`fetch ${url} -> non-image content-type "${contentType}"`);
  return Buffer.from(await res.arrayBuffer());
}

async function processPhoto(wbAccount, wbArticle, photoIndex, photo) {
  let sourceBuffer;
  try {
    sourceBuffer = await fetchImageBuffer(photo.big);
  } catch {
    sourceBuffer = await fetchImageBuffer(photo.c516x688);
  }

  const keyPrefix = `products/${wbAccount}/${wbArticle}/${photoIndex}`;
  const thumbBuffer = await sharp(sourceBuffer).resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true }).avif({ quality: 70 }).toBuffer();
  const mediumBuffer = await sharp(sourceBuffer).resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).avif({ quality: 80 }).toBuffer();
  let largeBuffer;
  try {
    largeBuffer = await sharp(sourceBuffer).avif({ quality: 90 }).toBuffer();
  } catch {
    largeBuffer = sourceBuffer;
  }

  await uploadObject(`${keyPrefix}-thumb.avif`, thumbBuffer, "image/avif");
  const mediumUrl = await uploadObject(`${keyPrefix}-medium.avif`, mediumBuffer, "image/avif");
  await uploadObject(`${keyPrefix}-large.avif`, largeBuffer, "image/avif");
  return mediumUrl;
}

// --- main --------------------------------------------------------------
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const existingRows = await pool.query("SELECT wb_account, wb_article, slug FROM products");
const existingKeys = new Set(existingRows.rows.map((r) => `${r.wb_account}:${r.wb_article}`));
const existingSlugs = new Set(existingRows.rows.map((r) => r.slug));
console.log(`Existing products in DB: ${existingKeys.size}${DRY_RUN ? " (DRY RUN — no writes will happen)" : ""}`);

const ACCOUNTS = [
  { account: 1, contentKey: process.env.WB_CONTENT_KEY_1, pricesKey: process.env.WB_PRICES_KEY_1 },
  { account: 2, contentKey: process.env.WB_CONTENT_KEY_2, pricesKey: process.env.WB_PRICES_KEY_2 },
  { account: 3, contentKey: process.env.WB_CONTENT_KEY_3, pricesKey: process.env.WB_PRICES_KEY_3 },
];

let totalInserted = 0;

for (const { account, contentKey, pricesKey } of ACCOUNTS) {
  console.log(`\n[account ${account}] fetching cards...`);
  const cards = await fetchAllCards(contentKey);
  const newCards = cards.filter((c) => !existingKeys.has(`${account}:${c.nmID}`));
  console.log(`[account ${account}] ${cards.length} cards on WB, ${newCards.length} new.`);
  if (newCards.length === 0) continue;

  console.log(`[account ${account}] fetching prices...`);
  const prices = await fetchPrices(pricesKey);
  console.log(`[account ${account}] fetching stock for ${newCards.length} new card(s)...`);
  const stock = await fetchStock(pricesKey, newCards);

  for (const card of newCards) {
    const wbArticle = String(card.nmID);
    const title = card.title ?? "";
    const description = card.description ?? "";
    const productType = card.subjectName ?? "";
    const style = classify({ vendorCode: card.vendorCode, productType, title, description });

    let slug = slugFromTitle(title, wbArticle);
    if (existingSlugs.has(slug)) slug = `${slug}-${wbArticle}`;
    existingSlugs.add(slug);

    const priceRub = prices.get(card.nmID) ?? 0;
    const stockAmount = stock.get(card.nmID) ?? 0;
    if (!prices.has(card.nmID)) console.warn(`[account ${account}] nmID ${card.nmID}: no price found, defaulting to 0`);

    const d = card.dimensions;
    const lengthCm = d?.length || null;
    const widthCm = d?.width || null;
    const heightCm = d?.height || null;
    const weightG = d?.weightBrutto ? Math.round(d.weightBrutto * 1000) : null;

    console.log(
      `[account ${account}] NEW nmID=${card.nmID} slug=${slug} style=${style} price=${priceRub} stock=${stockAmount} ` +
        `dims=${lengthCm}x${widthCm}x${heightCm}cm/${weightG}g photos=${(card.photos ?? []).length} title="${title}"`,
    );

    if (DRY_RUN) continue;

    const images = [];
    for (let i = 0; i < (card.photos ?? []).length; i++) {
      const url = await processPhoto(account, wbArticle, i, card.photos[i]);
      images.push(url);
    }

    await pool.query(
      `INSERT INTO products (
         wb_article, wb_account, wb_title, wb_description, wb_images, product_type, imported_at,
         slug, price_rub, stock, style, published, is_top30,
         own_title, own_description, own_images,
         length_cm, width_cm, height_cm, weight_g
       ) VALUES ($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,$10,false,false,$11,$12,$13,$14,$15,$16,$17)`,
      [
        wbArticle, account, title, description, JSON.stringify(images), productType,
        slug, priceRub, stockAmount, style,
        title, description, JSON.stringify(images),
        lengthCm, widthCm, heightCm, weightG,
      ],
    );
    totalInserted++;
  }
}

console.log(DRY_RUN ? `\nDry run complete — ${totalInserted === 0 ? "no rows written" : "should not happen"}.` : `\nDone. ${totalInserted} product(s) inserted.`);
await pool.end();
