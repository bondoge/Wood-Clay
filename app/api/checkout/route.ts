import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createOrder } from "@/lib/orders";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99) }))
    .max(100),
  contact: z.object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(1).max(30),
    email: z.email().trim().toLowerCase(),
  }),
  delivery: z.object({
    city: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(400),
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

  return NextResponse.json({ ok: true, order: result.order }, { status: 201 });
}
