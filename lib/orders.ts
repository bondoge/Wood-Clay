import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, products } from "@/db/schema";
import { decrementStock, incrementStock } from "@/lib/inventory";
import { getCart, clearCart } from "@/lib/cart";
import { sendOrderConfirmationEmail, sendPaymentReceivedEmail } from "@/lib/mailer";
import { createPayment, getPayment } from "@/lib/yookassa";
import { SHIPPING_FLAT_RATE_RUB } from "@/lib/shipping";

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
  cdekPvzCode: string | null;
  cdekPvzCity: string | null;
  cdekPvzAddress: string | null;
  subtotalRub: number;
  shippingCostRub: number | null;
  totalRub: number;
  createdAt: Date;
  items: OrderItemSummary[];
};

export type CreateOrderInput = {
  userId: string | null;
  contact: { name: string; phone: string; email: string };
  delivery: { cdekPvzCode: string; cdekPvzCity: string; cdekPvzAddress: string; note?: string };
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
          cdekPvzCode: input.delivery.cdekPvzCode,
          cdekPvzCity: input.delivery.cdekPvzCity,
          cdekPvzAddress: input.delivery.cdekPvzAddress,
          deliveryNote: input.delivery.note ?? null,
          subtotalRub,
          shippingCostRub: SHIPPING_FLAT_RATE_RUB,
          totalRub: subtotalRub + SHIPPING_FLAT_RATE_RUB,
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

function toItemSummary(row: typeof orderItems.$inferSelect): OrderItemSummary {
  return { productId: row.productId, title: row.productTitle, slug: row.productSlug, priceRub: row.priceRub, quantity: row.quantity };
}

export async function getOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const orderRows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((row) => row.id);
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  const itemsByOrder = new Map<number, OrderItemSummary[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push(toItemSummary(row));
    itemsByOrder.set(row.orderId, list);
  }
  return orderRows.map((row) => ({ ...row, items: itemsByOrder.get(row.id) ?? [] }));
}

export async function getOrderByYookassaPaymentId(paymentId: string): Promise<{ id: number } | undefined> {
  return (await db.select({ id: orders.id }).from(orders).where(eq(orders.yookassaPaymentId, paymentId)))[0];
}

// Used only by the customer-return page (app/(shop)/order/status) — looked
// up by the unguessable returnToken, never by the order's own sequential id,
// which a guest has no session to be checked against. Read-only: this page
// never writes order status, that's the webhook's job alone.
export async function getOrderByReturnToken(token: string): Promise<OrderSummary | undefined> {
  const [row] = await db.select().from(orders).where(eq(orders.returnToken, token));
  if (!row) return undefined;
  const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, row.id));
  return { ...row, items: itemRows.map(toItemSummary) };
}

/**
 * Transitions pending_payment -> paid and sends the "payment received" email
 * — but only when this call is the one that actually performs the
 * transition. The guarded UPDATE is the idempotency check: a redelivered
 * webhook for an already-paid order updates 0 rows, so it can't re-send the
 * email or touch anything twice.
 */
export async function markOrderPaid(orderId: number): Promise<boolean> {
  const [row] = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
    .returning();
  if (!row) return false;

  sendPaymentReceivedEmail(row).catch((err) => {
    console.error(`lib/orders: payment-received email for order ${orderId} failed:`, err);
  });
  return true;
}

/**
 * Transitions pending_payment -> cancelled and returns the stock that order
 * held, in one transaction — same idempotency guard as markOrderPaid (a
 * redelivered "cancelled" webhook, or a webhook arriving after the order was
 * already paid, updates 0 rows and returns nothing).
 */
export async function cancelOrder(orderId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "cancelled" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (!row) return false;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId) await incrementStock(item.productId, item.quantity, tx);
    }
    return true;
  });
}

export type CreatePaymentResult =
  | { ok: true; confirmationUrl: string }
  | {
      ok: false;
      error: "not_found" | "already_resolved" | "creation_in_progress" | "provider_error";
      // Present whenever the order got far enough to have one — lets a
      // caller (the checkout route, or a later retry from the return page)
      // point the customer at /order/status even when this call failed.
      returnToken?: string;
    };

// A payment id that's a fake, unmistakable placeholder — real ЮKassa payment
// ids never contain a colon — used to claim an order for payment creation
// before the ЮKassa API call happens, so a concurrent/retried request can't
// create a second payment for the same order (see reuseExistingPayment).
function isClaim(paymentId: string): boolean {
  return paymentId.startsWith("pending:");
}

// Shared by both the "already has a payment id" path and the "lost the claim
// race to another request" path: re-fetch the real payment's current
// confirmation URL from ЮKassa rather than trusting anything stored locally.
async function reuseExistingPayment(paymentId: string, returnToken: string | null): Promise<CreatePaymentResult> {
  try {
    const payment = await getPayment(paymentId);
    if (payment.confirmationUrl) return { ok: true, confirmationUrl: payment.confirmationUrl };
    return { ok: false, error: "already_resolved", returnToken: returnToken ?? undefined };
  } catch (err) {
    console.error(`lib/orders: re-fetching payment ${paymentId} failed:`, err);
    return { ok: false, error: "provider_error", returnToken: returnToken ?? undefined };
  }
}

/**
 * Creates a ЮKassa payment for a pending_payment order and returns the URL
 * to redirect the customer to. Idempotent: a retry (double-click, the
 * checkout route retrying after a transient failure, or the customer coming
 * back to /order/status to resume an abandoned payment) reuses the same
 * payment instead of creating a second one. The order is claimed with a
 * fake, unique placeholder id *before* the network call — outside a
 * db.transaction(), since holding a transaction open across an external
 * HTTP call would hold row locks for the duration of that call — then
 * overwritten with the real payment id on success, or cleared on failure so
 * a later retry can claim again.
 */
export async function createPaymentForOrder(orderId: number, returnUrlBase: string): Promise<CreatePaymentResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { ok: false, error: "not_found" };
  if (order.status !== "pending_payment") return { ok: false, error: "already_resolved", returnToken: order.returnToken ?? undefined };
  if (order.yookassaPaymentId) {
    if (isClaim(order.yookassaPaymentId)) return { ok: false, error: "creation_in_progress", returnToken: order.returnToken ?? undefined };
    return reuseExistingPayment(order.yookassaPaymentId, order.returnToken);
  }

  const returnToken = crypto.randomUUID();
  const claim = `pending:${crypto.randomUUID()}`;
  const claimed = await db
    .update(orders)
    .set({ yookassaPaymentId: claim, returnToken })
    .where(and(eq(orders.id, orderId), isNull(orders.yookassaPaymentId), eq(orders.status, "pending_payment")))
    .returning({ id: orders.id });

  if (claimed.length === 0) {
    // Lost the claim race to a concurrent request for the same order.
    const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (current?.yookassaPaymentId && !isClaim(current.yookassaPaymentId)) {
      return reuseExistingPayment(current.yookassaPaymentId, current.returnToken);
    }
    return { ok: false, error: "creation_in_progress", returnToken: current?.returnToken ?? undefined };
  }

  try {
    const payment = await createPayment({
      amountRub: order.totalRub,
      orderId,
      returnUrl: `${returnUrlBase}/order/status?token=${returnToken}`,
      idempotenceKey: claim,
    });
    if (!payment.confirmationUrl) throw new Error("ЮKassa response missing confirmation_url");

    await db.update(orders).set({ yookassaPaymentId: payment.id }).where(eq(orders.id, orderId));
    return { ok: true, confirmationUrl: payment.confirmationUrl };
  } catch (err) {
    console.error(`lib/orders: createPayment failed for order ${orderId}:`, err);
    await db.update(orders).set({ yookassaPaymentId: null }).where(eq(orders.id, orderId));
    return { ok: false, error: "provider_error", returnToken };
  }
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
