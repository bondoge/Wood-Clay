import { randomInt, createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, verificationCodes } from "@/db/schema";
import { sendVerificationEmail } from "@/lib/mailer";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function startEmailVerification(userId: string, email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(verificationCodes).values({
    userId,
    channel: "email",
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  await sendVerificationEmail(email, code);
}

// Only the most recently requested code counts — requesting a new one makes
// any earlier code moot, which is also the simplest way to let "resend"
// work without a separate invalidation step.
export async function confirmEmailVerification(userId: string, code: string): Promise<boolean> {
  const [latest] = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.channel, "email")))
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

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, userId));
  return true;
}
