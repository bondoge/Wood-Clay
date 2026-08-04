// One-time maintenance: publish every product that has stock, per explicit
// instruction — bridges the gap while Directus curation is still in
// progress. Purely additive: never un-publishes a row.
//   node --env-file=.env scripts/publish-in-stock-products.mjs
import { gt, eq, and, count } from "drizzle-orm";
import { db } from "../db/client.ts";
import { products } from "../db/schema.ts";

async function main() {
  const result = await db
    .update(products)
    .set({ published: true })
    .where(and(gt(products.stock, 0), eq(products.published, false)));

  console.log(`Newly published: ${result.rowsAffected} row(s).`);

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.published, true));
  console.log(`Total published now: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
