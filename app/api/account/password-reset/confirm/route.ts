import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmPasswordReset } from "@/lib/password-reset";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const confirmSchema = z.object({
  email: z.email().trim().toLowerCase(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8, "Пароль должен содержать не менее 8 символов"),
});

const isRateLimited = createRateLimiter(60 * 60 * 1000, 20);

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const reset = await confirmPasswordReset(parsed.data.email, parsed.data.code, parsed.data.newPassword);
  if (!reset) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
