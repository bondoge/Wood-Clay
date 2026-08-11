import { randomInt } from "crypto";
import * as argon2 from "argon2";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, verificationCodes } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { hashCode } from "@/lib/verification";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

// Keyed by email, not a session — the whole point is the user is logged
// out. Silent on an unknown email so the caller's response never reveals
// whether an account exists.
export async function startPasswordReset(email: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!user) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(verificationCodes).values({
    userId: user.id,
    channel: "password_reset",
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  await sendPasswordResetEmail(email, code);
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<boolean> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!user) return false;

  const [latest] = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, user.id), eq(verificationCodes.channel, "password_reset")))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);

  if (!latest) return false;
  if (latest.attempts >= MAX_ATTEMPTS) return false;
  if (latest.expiresAt.getTime() < Date.now()) return false;

  await db
    .update(verificationCodes)
    .set({ attempts: latest.attempts + 1 })
    .where(eq(verificationCodes.id, latest.id));

  if (latest.codeHash !== hashCode(code)) return false;

  const passwordHash = await argon2.hash(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  // Burn the code immediately — unlike email verification, replaying this
  // one would let a second reset go through inside the same 10-minute window.
  await db.update(verificationCodes).set({ expiresAt: new Date(0) }).where(eq(verificationCodes.id, latest.id));
  return true;
}
