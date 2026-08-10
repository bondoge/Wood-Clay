import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { products, users } from "@/db/schema";
import { SHIPPING_FLAT_RATE_RUB } from "@/lib/shipping";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

vi.mock("@/lib/mailer", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

const { createOrder, getOrdersForUser, linkOrderToUser } = await import("./orders");
const { addToCart } = await import("./cart");

async function insertUser() {
  const [row] = await db
    .insert(users)
    .values({ email: `user-${Math.random()}@example.com`, passwordHash: "irrelevant" })
    .returning();
  return row.id;
}

async function insertProduct(stock: number) {
  const [row] = await db
    .insert(products)
    .values({
      wbArticle: String(Math.random()),
      wbAccount: 1,
      wbTitle: "Игрушка",
      wbDescription: "Описание",
      wbImages: [],
      ownTitle: "Игрушка",
      ownDescription: "Описание",
      ownImages: [],
      productType: "Ёлочная игрушка",
      importedAt: new Date(),
      slug: `product-${Math.random()}`,
      priceRub: 1000,
      stock,
      published: true,
    })
    .returning();
  return row.id;
}

const contact = { name: "Проверка Тестова", phone: "+7 900 000-00-00", email: "guest@example.com" };
const delivery = { cdekPvzCode: "MSK123", cdekPvzCity: "Москва", cdekPvzAddress: "Тверская, 1" };

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("createOrder", () => {
  it("creates a guest order, decrements stock, and snapshots price/title onto order_items", async () => {
    const productId = await insertProduct(5);

    const result = await createOrder({
      userId: null,
      contact,
      delivery,
      items: [{ productId, quantity: 2 }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.userId).toBeNull();
    expect(result.order.subtotalRub).toBe(2000);
    expect(result.order.totalRub).toBe(2000 + SHIPPING_FLAT_RATE_RUB);
    expect(result.order.items).toEqual([
      expect.objectContaining({ productId, title: "Игрушка", quantity: 2, priceRub: 1000 }),
    ]);

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    expect(product.stock).toBe(3);
  });

  it("rejects and commits nothing when a quantity exceeds stock", async () => {
    const productId = await insertProduct(1);

    const result = await createOrder({
      userId: null,
      contact,
      delivery,
      items: [{ productId, quantity: 2 }],
    });

    expect(result).toEqual({ ok: false, error: "out_of_stock", productId });
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    expect(product.stock).toBe(1); // unchanged — nothing half-committed
  });

  it("rolls back an earlier item's stock decrement when a later item in the same order fails", async () => {
    const okProduct = await insertProduct(5);
    const shortProduct = await insertProduct(1);

    const result = await createOrder({
      userId: null,
      contact,
      delivery,
      items: [
        { productId: okProduct, quantity: 1 },
        { productId: shortProduct, quantity: 2 },
      ],
    });

    expect(result).toEqual({ ok: false, error: "out_of_stock", productId: shortProduct });
    const [ok] = await db.select().from(products).where(eq(products.id, okProduct));
    expect(ok.stock).toBe(5); // the whole transaction rolled back, not just the failing item
  });

  it("rejects checkout with an empty cart", async () => {
    const result = await createOrder({ userId: null, contact, delivery, items: [] });
    expect(result).toEqual({ ok: false, error: "empty_cart" });
  });

  it("for a logged-in user, reads the server cart (ignoring any client-submitted items) and clears it on success", async () => {
    const userId = await insertUser();
    const productId = await insertProduct(5);
    await addToCart(userId, productId, 3);

    const result = await createOrder({
      userId,
      contact,
      delivery,
      items: [{ productId: 999999, quantity: 50 }], // must be ignored — not the real cart
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.items).toEqual([expect.objectContaining({ productId, quantity: 3 })]);

    const orders = await getOrdersForUser(userId);
    expect(orders).toHaveLength(1);
  });

  it("under two concurrent checkouts for the last unit of one product, exactly one succeeds", async () => {
    const productId = await insertProduct(1);

    const [first, second] = await Promise.all([
      createOrder({ userId: null, contact, delivery, items: [{ productId, quantity: 1 }] }),
      createOrder({ userId: null, contact, delivery, items: [{ productId, quantity: 1 }] }),
    ]);

    const outcomes = [first, second];
    const successes = outcomes.filter((r) => r.ok);
    const failures = outcomes.filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ ok: false, error: "out_of_stock" });

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    expect(product.stock).toBe(0);
  });
});

describe("getOrdersForUser", () => {
  it("only ever returns the requesting user's own orders", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const productId = await insertProduct(5);
    await addToCart(userA, productId, 1);
    await createOrder({ userId: userA, contact, delivery, items: [] });

    expect(await getOrdersForUser(userA)).toHaveLength(1);
    expect(await getOrdersForUser(userB)).toHaveLength(0);
  });
});

describe("linkOrderToUser", () => {
  it("links a guest order to a new account only when the email matches and it's still unowned", async () => {
    const productId = await insertProduct(5);
    const result = await createOrder({
      userId: null,
      contact: { ...contact, email: "match@example.com" },
      delivery,
      items: [{ productId, quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const newUser = await insertUser();
    await linkOrderToUser(result.order.id, newUser, "someone-else@example.com");
    expect((await getOrdersForUser(newUser))).toHaveLength(0); // email mismatch — not linked

    await linkOrderToUser(result.order.id, newUser, "match@example.com");
    expect((await getOrdersForUser(newUser))).toHaveLength(1);

    const otherUser = await insertUser();
    await linkOrderToUser(result.order.id, otherUser, "match@example.com");
    expect((await getOrdersForUser(otherUser))).toHaveLength(0); // already owned — no re-link
  });
});
