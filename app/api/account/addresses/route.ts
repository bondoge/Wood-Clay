import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { saveAddress } from "@/lib/account";

const pvzSchema = z.object({
  cdekPvzCode: z.string().trim().min(1),
  cdekPvzCity: z.string().trim().min(1),
  cdekPvzAddress: z.string().trim().min(1),
  setDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pvzSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { setDefault, ...pvz } = parsed.data;
  const address = await saveAddress(session.user.id, pvz, { setDefault });
  return NextResponse.json({ ok: true, address });
}
