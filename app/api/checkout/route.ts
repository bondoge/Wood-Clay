import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createOrder, createPaymentForOrder } from "@/lib/orders";
import { getProfile, updateProfile } from "@/lib/account";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { normalizeRuPhone } from "@/lib/phone";

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99) }))
    .max(100),
  contact: z.object({
    name: z.string().trim().min(1).max(200),
    phone: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .transform((value, ctx) => {
        const normalized = normalizeRuPhone(value);
        if (!normalized) {
          ctx.addIssue({ code: "custom", message: "invalid_phone" });
          return z.NEVER;
        }
        return normalized;
      }),
    email: z.email().trim().toLowerCase(),
  }),
  delivery: z.object({
    cdekPvzCode: z.string().trim().min(1).max(50),
    cdekPvzCity: z.string().trim().min(1).max(200),
    cdekPvzAddress: z.string().trim().min(1).max(400),
    note: z.string().trim().max(1000).optional(),
  }),
  consent: z.literal(true),
});

const isRateLimited = createRateLimiter(60 * 60 * 1000, 20);

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const session = await auth();

  const result = await createOrder({
    userId: session?.user?.id ?? null,
    contact: parsed.data.contact,
    delivery: parsed.data.delivery,
    items: parsed.data.items,
  });

  if (!result.ok) {
    const status = result.error === "empty_cart" ? 400 : 409;
    return NextResponse.json(
      { ok: false, error: result.error, productId: "productId" in result ? result.productId : undefined },
      { status },
    );
  }

  // Keep the account's phone in sync with what the customer actually typed
  // at checkout — same idea as CdekPvzPicker's live address save, just
  // triggered on submit instead of on pick since there's no equivalent
  // "explicit selection" moment for a text field. Never touches email
  // (that's the login identity — a deliberate account-settings change, not
  // a checkout side effect) or name (checkout collects one combined field;
  // splitting it into firstName/lastName here would risk mangling an
  // existing profile's name for no real benefit).
  const userId = session?.user?.id;
  if (userId) {
    const profile = await getProfile(userId);
    if (profile && profile.phone !== parsed.data.contact.phone) {
      await updateProfile(userId, { phone: parsed.data.contact.phone }).catch((err) => {
        console.error(`checkout: failed to sync phone to profile for user ${userId}:`, err);
      });
    }
  }

  // The order exists (pending_payment, stock already held) regardless of
  // what happens next — payment creation failing here never loses it. The
  // client gets returnToken back so it can still send the customer to
  // /order/status, which offers its own retry into createPaymentForOrder.
  const origin = new URL(request.url).origin;
  const payment = await createPaymentForOrder(result.order.id, origin);
  if (!payment.ok) {
    return NextResponse.json({ ok: false, error: "payment_failed", returnToken: payment.returnToken }, { status: 502 });
  }

  return NextResponse.json({ ok: true, confirmationUrl: payment.confirmationUrl }, { status: 201 });
}
