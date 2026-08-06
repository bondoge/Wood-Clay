import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { mergeGuestCart } from "@/lib/cart";

const mergeSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(99) }))
    .max(100),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const cart = await mergeGuestCart(session.user.id, parsed.data.items);
  return NextResponse.json({ ok: true, cart });
}
