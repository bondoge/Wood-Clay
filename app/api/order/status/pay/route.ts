import { NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentForOrder, getOrderByReturnToken } from "@/lib/orders";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

// Lets the customer resume payment for an order they're already looking at
// on /order/status — token possession is the only authorization here, same
// as the read-only status page itself. createPaymentForOrder is idempotent,
// so this safely reuses an existing ЮKassa payment (e.g. the customer closed
// the payment tab without finishing) rather than creating a second one.
const schema = z.object({ token: z.string().min(1) });

const isRateLimited = createRateLimiter(60 * 60 * 1000, 20);

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const order = await getOrderByReturnToken(parsed.data.token);
  if (!order) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const result = await createPaymentForOrder(order.id, origin);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, confirmationUrl: result.confirmationUrl });
}
