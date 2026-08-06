import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { products, users } from "@/db/schema";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const { getCart, addToCart, setItemQuantity, removeItem, clearCart, mergeGuestCart } = await import("./cart");

async function insertUser() {
  const [row] = await db
    .insert(users)
    .values({ email: `user-${Math.random()}@example.com`, passwordHash: "irrelevant" })
    .returning();
  return row.id;
}

async function insertProduct(stock: number, published = true) {
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
      published,
    })
    .returning();
  return row.id;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("cart", () => {
  it("clamps addToCart to live stock", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(3);

    const cart = await addToCart(userId, productId, 10);

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it("addToCart is additive across repeated calls, still clamped", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(5);

    await addToCart(userId, productId, 2);
    const cart = await addToCart(userId, productId, 2);

    expect(cart.lines[0].quantity).toBe(4);

    const clamped = await addToCart(userId, productId, 5);
    expect(clamped.lines[0].quantity).toBe(5);
  });

  it("setItemQuantity sets an absolute value clamped to [1, stock]", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(4);
    await addToCart(userId, productId, 1);

    const over = await setItemQuantity(userId, productId, 99);
    expect(over.lines[0].quantity).toBe(4);

    const under = await setItemQuantity(userId, productId, 0);
    expect(under.lines[0].quantity).toBe(1);
  });

  it("removeItem removes only the targeted line", async () => {
    const userId = await insertUser();
    const keep = await insertProduct(5);
    const drop = await insertProduct(5);
    await addToCart(userId, keep, 1);
    await addToCart(userId, drop, 1);

    const cart = await removeItem(userId, drop);

    expect(cart.lines.map((l) => l.product.id)).toEqual([keep]);
  });

  it("clearCart empties only the targeted user's cart", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const productId = await insertProduct(5);
    await addToCart(userA, productId, 1);
    await addToCart(userB, productId, 1);

    await clearCart(userA);

    expect((await getCart(userA)).lines).toHaveLength(0);
    expect((await getCart(userB)).lines).toHaveLength(1);
  });

  it("carts are isolated between users", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const productA = await insertProduct(5);
    const productB = await insertProduct(5);
    await addToCart(userA, productA, 1);
    await addToCart(userB, productB, 1);

    expect((await getCart(userA)).lines.map((l) => l.product.id)).toEqual([productA]);
    expect((await getCart(userB)).lines.map((l) => l.product.id)).toEqual([productB]);
  });

  it("mergeGuestCart adds guest quantities on top of the existing server cart, clamped to stock", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(5);
    await addToCart(userId, productId, 2);

    const merged = await mergeGuestCart(userId, [{ productId, quantity: 2 }]);
    expect(merged.lines[0].quantity).toBe(4);

    const clamped = await mergeGuestCart(userId, [{ productId, quantity: 10 }]);
    expect(clamped.lines[0].quantity).toBe(5);
  });

  it("excludes lines whose product is no longer published", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(5);
    await addToCart(userId, productId, 1);

    await db.update(products).set({ published: false }).where(eq(products.id, productId));

    expect((await getCart(userId)).lines).toHaveLength(0);
  });
});
