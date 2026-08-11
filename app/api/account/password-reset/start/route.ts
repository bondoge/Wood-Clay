import { NextResponse } from "next/server";
import { z } from "zod";
import { startPasswordReset } from "@/lib/password-reset";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const startSchema = z.object({ email: z.email().trim().toLowerCase() });

const isRateLimitedByIp = createRateLimiter(60 * 60 * 1000, 10);
const isRateLimitedByEmail = createRateLimiter(60 * 60 * 1000, 3);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  if (isRateLimitedByIp(getClientIp(request)) || isRateLimitedByEmail(parsed.data.email)) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  await startPasswordReset(parsed.data.email);
  // Always ok — never reveals whether the email is registered.
  return NextResponse.json({ ok: true });
}
