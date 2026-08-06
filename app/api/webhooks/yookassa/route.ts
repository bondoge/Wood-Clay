import { NextResponse } from "next/server";
import { z } from "zod";
import { getPayment } from "@/lib/yookassa";
import { getOrderByYookassaPaymentId, markOrderPaid, cancelOrder } from "@/lib/orders";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

// Just enough shape to find which payment this notification is about — the
// rest of the body (including its own status) is never trusted. See the
// re-fetch below.
const notificationSchema = z.object({
  object: z.object({ id: z.string().min(1) }),
});

// Generous — this endpoint is called by ЮKassa, not end users, but every
// public POST route in this app is rate-limited by IP as a baseline.
const isRateLimited = createRateLimiter(60 * 60 * 1000, 200);

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = notificationSchema.safeParse(body);
  if (!parsed.success) {
    // Can't act on this notification and never will be able to — 200 so
    // ЮKassa doesn't keep retrying something permanently unparseable.
    return NextResponse.json({ ok: true });
  }

  // THE SOURCE OF TRUTH: an authenticated re-fetch of the payment from
  // ЮKassa's own API, never the notification body's `object.status`. A
  // forged POST to this endpoint can at most point at a real payment id —
  // it can't fabricate what ЮKassa itself reports that payment's status to
  // be, since that requires our secret key.
  let payment;
  try {
    payment = await getPayment(parsed.data.object.id);
  } catch (err) {
    console.error(`webhooks/yookassa: getPayment(${parsed.data.object.id}) failed:`, err);
    return NextResponse.json({ ok: false }, { status: 500 }); // ask ЮKassa to retry
  }

  const order = await getOrderByYookassaPaymentId(payment.id);
  if (!order) {
    console.error(`webhooks/yookassa: no order found for payment ${payment.id}`);
    return NextResponse.json({ ok: true }); // nothing to retry into
  }

  if (payment.status === "succeeded") {
    // markOrderPaid/cancelOrder only transition from pending_payment, so a
    // redelivered notification for an already-resolved order is a no-op —
    // no double email, no double stock return.
    await markOrderPaid(order.id);
  } else if (payment.status === "canceled") {
    await cancelOrder(order.id);
  }
  // pending / waiting_for_capture: nothing to do yet.

  return NextResponse.json({ ok: true });
}
