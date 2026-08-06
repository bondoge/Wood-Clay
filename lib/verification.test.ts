import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { users, verificationCodes } from "@/db/schema";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const sendVerificationEmail = vi.fn(async (_to: string, _code: string) => {});
vi.mock("@/lib/mailer", () => ({
  sendVerificationEmail: (to: string, code: string) => sendVerificationEmail(to, code),
}));

const { startEmailVerification, confirmEmailVerification } = await import("./verification");

async function insertUser() {
  const [row] = await db
    .insert(users)
    .values({ email: `user-${Math.random()}@example.com`, passwordHash: "irrelevant" })
    .returning();
  return row.id;
}

function lastSentCode(): string {
  const call = sendVerificationEmail.mock.calls.at(-1);
  if (!call) throw new Error("sendVerificationEmail was never called");
  return call[1];
}

function wrongGuessFor(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("email verification", () => {
  it("sends a 6-digit code and confirms with it", async () => {
    const userId = await insertUser();
    await startEmailVerification(userId, "user@example.com");
    const code = lastSentCode();
    expect(code).toMatch(/^\d{6}$/);

    const ok = await confirmEmailVerification(userId, code);
    expect(ok).toBe(true);

    const [row] = await db.select().from(users).where(eq(users.id, userId));
    expect(row.emailVerified).not.toBeNull();
  });

  it("rejects a wrong code and does not verify", async () => {
    const userId = await insertUser();
    await startEmailVerification(userId, "user@example.com");
    const wrong = wrongGuessFor(lastSentCode());

    const ok = await confirmEmailVerification(userId, wrong);
    expect(ok).toBe(false);
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    expect(row.emailVerified).toBeNull();
  });

  it("locks out after the max number of attempts, even with the correct code", async () => {
    const userId = await insertUser();
    await startEmailVerification(userId, "user@example.com");
    const code = lastSentCode();
    const wrong = wrongGuessFor(code);

    for (let i = 0; i < 5; i++) {
      await confirmEmailVerification(userId, wrong);
    }
    const ok = await confirmEmailVerification(userId, code);
    expect(ok).toBe(false);
  });

  it("rejects an expired code", async () => {
    const userId = await insertUser();
    await startEmailVerification(userId, "user@example.com");
    const code = lastSentCode();
    await db
      .update(verificationCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verificationCodes.userId, userId));

    const ok = await confirmEmailVerification(userId, code);
    expect(ok).toBe(false);
  });

  it("only the most recently requested code is valid — a stale first code is rejected", async () => {
    const userId = await insertUser();
    await startEmailVerification(userId, "user@example.com");
    const firstCode = lastSentCode();
    await startEmailVerification(userId, "user@example.com");
    const secondCode = lastSentCode();
    expect(firstCode).not.toBe(secondCode);

    expect(await confirmEmailVerification(userId, firstCode)).toBe(false);
    expect(await confirmEmailVerification(userId, secondCode)).toBe(true);
  });
});
