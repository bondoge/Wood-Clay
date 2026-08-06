import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startEmailVerification } from "@/lib/verification";
import { createRateLimiter } from "@/lib/rate-limit";

const isRateLimited = createRateLimiter(10 * 60 * 1000, 5);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.channel !== "email") {
    return NextResponse.json({ ok: false, error: "unsupported_channel" }, { status: 400 });
  }

  if (isRateLimited(session.user.id)) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  await startEmailVerification(session.user.id, session.user.email);
  return NextResponse.json({ ok: true });
}
