import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, products } from "@/db/schema";
import { decrementStock } from "@/lib/inventory";
import { getCart, clearCart } from "@/lib/cart";
import { sendOrderConfirmationEmail } from "@/lib/mailer";

export type OrderItemSummary = {
  productId: number | null;
  title: string;
  slug: string;
  priceRub: number;
  quantity: number;
};

export type OrderSummary = {
  id: number;
  userId: string | null;
  status: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryNote: string | null;
  subtotalRub: number;
  shippingCostRub: number | null;
  totalRub: number;
  createdAt: Date;
  items: OrderItemSummary[];
};

export type CreateOrderInput = {
  userId: string | null;
  contact: { name: string; phone: string; email: string };
  delivery: { city: string; address: string; note?: string };
  // Only used for a guest checkout (userId === null) — there's no server
  // cart to read for a guest. For a logged-in user this is ignored; their
  // persisted cart_items are the authoritative source, re-read fresh here.
  items: { productId: number; quantity: number }[];
};

export type CreateOrderResult =
  | { ok: true; order: OrderSummary }
  | { ok: false; error: "empty_cart" }
  | { ok: false; error: "unavailable" | "out_of_stock"; productId: number };

class OrderCreationError extends Error {
  constructor(
    public code: "unavailable" | "out_of_stock",
    public productId: number,
  ) {
    super(code);
  }
}

/**
 * The whole order — stock re-check, decrement, order + order_items insert,
 * and (for a logged-in buyer) the cart clear — happens in one
 * db.transaction(). decrementStock is passed `tx` so its atomic
 * check-and-set UPDATE commits or rolls back together with everything else:
 * if any item is out of stock, the entire order is rolled back, not just
 * skipped.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const items = input.userId
    ? (await getCart(input.userId)).lines.map((line) => ({ productId: line.product.id, quantity: line.quantity }))
    : input.items;

  if (items.length === 0) {
    return { ok: false, error: "empty_cart" };
  }

  try {
    const order = await db.transaction(async (tx) => {
      const orderLines: OrderItemSummary[] = [];

      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.published, true)));
        if (!product) throw new OrderCreationError("unavailable", item.productId);

        const decremented = await decrementStock(item.productId, item.quantity, tx);
        if (!decremented) throw new OrderCreationError("out_of_stock", item.productId);

        orderLines.push({
          productId: product.id,
          title: product.ownTitle ?? product.sourceTitle,
          slug: product.slug,
          priceRub: product.priceRub,
          quantity: item.quantity,
        });
      }

      const subtotalRub = orderLines.reduce((sum, line) => sum + line.priceRub * line.quantity, 0);

      const [orderRow] = await tx
        .insert(orders)
        .values({
          userId: input.userId,
          contactName: input.contact.name,
          contactPhone: input.contact.phone,
          contactEmail: input.contact.email,
          deliveryCity: input.delivery.city,
          deliveryAddress: input.delivery.address,
          deliveryNote: input.delivery.note ?? null,
          subtotalRub,
          totalRub: subtotalRub,
        })
        .returning();

      await tx.insert(orderItems).values(
        orderLines.map((line) => ({
          orderId: orderRow.id,
          productId: line.productId,
          productTitle: line.title,
          productSlug: line.slug,
          priceRub: line.priceRub,
          quantity: line.quantity,
        })),
      );

      if (input.userId) await clearCart(input.userId, tx);

      return { ...orderRow, items: orderLines };
    });

    // Fired after commit, deliberately not inside the transaction and not
    // allowed to fail the request — the order already exists at this point;
    // a flaky mail server must not make a successful purchase look failed.
    sendOrderConfirmationEmail(order).catch((err) => {
      console.error(`lib/orders: confirmation email for order ${order.id} failed:`, err);
    });

    return { ok: true, order };
  } catch (err) {
    if (err instanceof OrderCreationError) {
      return { ok: false, error: err.code, productId: err.productId };
    }
    throw err;
  }
}

export async function getOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const orderRows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((row) => row.id);
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  const itemsByOrder = new Map<number, OrderItemSummary[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({ productId: row.productId, title: row.productTitle, slug: row.productSlug, priceRub: row.priceRub, quantity: row.quantity });
    itemsByOrder.set(row.orderId, list);
  }
  return orderRows.map((row) => ({ ...row, items: itemsByOrder.get(row.id) ?? [] }));
}

// Used by the post-purchase account offer: links exactly one order (by id)
// to a newly created user, and only if the email on the order matches the
// email being registered and the order is still unowned — never a blanket
// "claim every order under this email" backfill, which would be a much
// larger, unintended disclosure.
export async function linkOrderToUser(orderId: number, userId: string, email: string): Promise<void> {
  await db
    .update(orders)
    .set({ userId })
    .where(and(eq(orders.id, orderId), eq(orders.contactEmail, email), isNull(orders.userId)));
}
