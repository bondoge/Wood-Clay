import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { products } from "@/db/schema";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const { decrementStock } = await import("./inventory");

async function insertProduct(stock: number) {
  const [row] = await db
    .insert(products)
    .values({
      wbArticle: String(Math.random()),
      wbAccount: 1,
      sourceTitle: "Игрушка",
      sourceDescription: "Описание",
      sourceImages: [],
      productType: "Ёлочная игрушка",
      importedAt: new Date(),
      slug: `product-${Math.random()}`,
      priceRub: 1000,
      stock,
    })
    .returning();
  return row.id;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("decrementStock", () => {
  it("decrements and returns true when stock covers the quantity exactly", async () => {
    const id = await insertProduct(5);
    const ok = await decrementStock(id, 5);
    expect(ok).toBe(true);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    expect(row.stock).toBe(0);
  });

  it("returns false and leaves stock unchanged when quantity exceeds stock", async () => {
    const id = await insertProduct(5);
    const ok = await decrementStock(id, 6);
    expect(ok).toBe(false);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    expect(row.stock).toBe(5);
  });

  it("returns false when stock is already zero", async () => {
    const id = await insertProduct(0);
    const ok = await decrementStock(id, 1);
    expect(ok).toBe(false);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    expect(row.stock).toBe(0);
  });

  it("under concurrent calls against stock=1, exactly one of two decrements succeeds", async () => {
    const id = await insertProduct(1);
    const [first, second] = await Promise.all([decrementStock(id, 1), decrementStock(id, 1)]);
    const successes = [first, second].filter(Boolean).length;
    expect(successes).toBe(1);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    expect(row.stock).toBe(0);
  });
});
