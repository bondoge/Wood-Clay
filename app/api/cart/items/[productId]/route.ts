import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { removeItem, setItemQuantity } from "@/lib/cart";

const quantitySchema = z.object({ quantity: z.number().int().min(0).max(99) });

type RouteParams = { params: Promise<{ productId: string }> };

function parseProductId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const productId = parseProductId((await params).productId);
  const body = await request.json().catch(() => null);
  const parsed = quantitySchema.safeParse(body);
  if (!productId || !parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const cart =
    parsed.data.quantity === 0
      ? await removeItem(session.user.id, productId)
      : await setItemQuantity(session.user.id, productId, parsed.data.quantity);
  return NextResponse.json({ ok: true, cart });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const productId = parseProductId((await params).productId);
  if (!productId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const cart = await removeItem(session.user.id, productId);
  return NextResponse.json({ ok: true, cart });
}
