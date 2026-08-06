import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { upsertDefaultAddress } from "@/lib/account";

const addressSchema = z.object({
  city: z.string().trim().min(1),
  recipientName: z.string().trim().min(1),
  street: z.string().trim().min(1),
  postalCode: z.string().trim().min(1).optional(),
  deliveryNote: z.string().trim().optional(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const address = await upsertDefaultAddress(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, address });
}
