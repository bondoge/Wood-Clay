import { NextResponse } from "next/server";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { linkOrderToUser } from "@/lib/orders";

const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "Пароль должен содержать не менее 8 символов"),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  consent: z.literal(true),
  // Set only by the post-purchase account offer, right after a guest
  // checkout — never taken from a URL. linkOrderToUser itself re-checks the
  // email match and that the order is still unowned before touching it.
  linkOrderId: z.number().int().positive().optional(),
});

const isRateLimited = createRateLimiter(60 * 60 * 1000, 10);

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json({ ok: false, error: "too_many_requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const { email, password, firstName, lastName, phone, linkOrderId } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await argon2.hash(password);
  let userId: string;

  try {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        phone: phone ?? null,
      })
      .returning({ id: users.id });
    userId = created.id;
  } catch (err) {
    // Unique-violation race: two concurrent registrations for the same
    // email both pass the SELECT check above before either INSERTs.
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 });
    }
    throw err;
  }

  if (linkOrderId) await linkOrderToUser(linkOrderId, userId, email);

  return NextResponse.json({ ok: true }, { status: 201 });
}
