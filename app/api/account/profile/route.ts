import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateProfile } from "@/lib/account";
import { normalizeRuPhone } from "@/lib/phone";

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
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
    })
    .optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const profile = await updateProfile(session.user.id, parsed.data);
  return NextResponse.json({ ok: true, profile });
}
