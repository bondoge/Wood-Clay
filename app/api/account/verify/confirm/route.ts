import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { confirmEmailVerification } from "@/lib/verification";

const confirmSchema = z.object({
  channel: z.literal("email"),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const verified = await confirmEmailVerification(session.user.id, parsed.data.code);
  if (!verified) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
