import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addToCart } from "@/lib/cart";

const addSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const cart = await addToCart(session.user.id, parsed.data.productId, parsed.data.quantity ?? 1);
  return NextResponse.json({ ok: true, cart });
}
