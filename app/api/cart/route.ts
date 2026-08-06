import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCart, clearCart } from "@/lib/cart";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cart = await getCart(session.user.id);
  return NextResponse.json({ ok: true, cart });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await clearCart(session.user.id);
  return NextResponse.json({ ok: true, cart: await getCart(session.user.id) });
}
