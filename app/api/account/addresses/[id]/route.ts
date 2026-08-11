import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteAddress, setDefaultAddress } from "@/lib/account";

const patchSchema = z.object({ isDefault: z.literal(true) });

type RouteParams = { params: Promise<{ id: string }> };

function parseAddressId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const addressId = parseAddressId((await params).id);
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!addressId || !parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const ok = await setDefaultAddress(session.user.id, addressId);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const addressId = parseAddressId((await params).id);
  if (!addressId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const ok = await deleteAddress(session.user.id, addressId);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
