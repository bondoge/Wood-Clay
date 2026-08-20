// One-off (but safely rerunnable) backfill: pulls dimensions/weight from the
// Wildberries Content API and writes them onto matching rows in `products`.
//
// Scope is deliberately narrow — this UPDATEs ONLY length_cm/width_cm/
// height_cm/weight_g (see db/schema.ts), matched by the existing
// (wb_account, wb_article) unique key. It never touches any other column,
// so manually-curated fields (style, published, is_top30, price_rub, stock,
// slug, own_*, ...) are never written here, no matter what.
//
// WB's content/v2/get/cards/list returns exactly one `dimensions` figure per
// card — length/width/height (cm) + weightBrutto (kg), explicitly documented
// by WB as "with packaging" — there's no separate bare-product-size field to
// pull. A card with all-zero (or missing) dimensions is left alone (existing
// value, NULL on a first run) rather than overwritten with zeros.
//
// Uses the same WB_CONTENT_KEY_1/2 as the (separate) catalog-seed project —
// copied into this repo's .env, not moved — and the same
// PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD as db:migrate/refresh-sales-summary
// (point them at the SSH tunnel to the server's Postgres).
//
//   npm run backfill:wb-dimensions
import { Pool } from "pg";

const REQUIRED_VARS = [
  "PGHOST",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "WB_CONTENT_KEY_1",
  "WB_CONTENT_KEY_2",
];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`${missing.join(", ")} not set — see .env.example.`);
}

const CONTENT_API_URL = "https://content-api.wildberries.ru/content/v2/get/cards/list";
const PAGE_SIZE = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same token-bucket-aware throttling as catalog-seed/src/wbClient.ts: trust
// WB's X-Ratelimit-* response headers rather than a fixed backoff.
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

const client = createThrottledClient(650);

async function fetchAllCards(apiKey) {
  const cards = [];
  let cursor = { limit: PAGE_SIZE };

  for (;;) {
    const res = await client.request(CONTENT_API_URL, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { cursor, filter: { withPhoto: -1 } } }),
    });
    if (!res.ok) {
      throw new Error(`content-api ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    cards.push(...data.cards);

    if (data.cards.length === 0 || data.cursor.total < cursor.limit) {
      return cards;
    }
    cursor = { limit: PAGE_SIZE, updatedAt: data.cursor.updatedAt, nmID: data.cursor.nmID };
  }
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const client_ = await pool.connect();
try {
  let updated = 0;
  let skippedNoDimensions = 0;
  let unmatched = 0;

  for (const [account, apiKey] of [
    [1, process.env.WB_CONTENT_KEY_1],
    [2, process.env.WB_CONTENT_KEY_2],
  ]) {
    console.log(`[account ${account}] fetching cards...`);
    const cards = await fetchAllCards(apiKey);
    console.log(`[account ${account}] fetched ${cards.length} card(s).`);

    for (const card of cards) {
      const d = card.dimensions;
      const lengthCm = d?.length ?? 0;
      const widthCm = d?.width ?? 0;
      const heightCm = d?.height ?? 0;
      const weightG = d?.weightBrutto ? Math.round(d.weightBrutto * 1000) : 0;

      if (lengthCm === 0 && widthCm === 0 && heightCm === 0 && weightG === 0) {
        skippedNoDimensions++;
        continue;
      }

      const { rowCount } = await client_.query(
        `UPDATE products
         SET length_cm = $1, width_cm = $2, height_cm = $3, weight_g = $4
         WHERE wb_account = $5 AND wb_article = $6`,
        [lengthCm || null, widthCm || null, heightCm || null, weightG || null, account, String(card.nmID)],
      );

      if (rowCount === 0) {
        unmatched++;
      } else {
        updated++;
      }
    }
  }

  console.log(
    `\nDone. ${updated} product(s) updated, ${skippedNoDimensions} card(s) had no dimensions on WB's ` +
      `side (left untouched), ${unmatched} card(s) had no matching product row (not yet imported, or ` +
      `imported under a different account).`,
  );
} finally {
  client_.release();
  await pool.end();
}
