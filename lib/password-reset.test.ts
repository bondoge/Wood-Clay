import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const sendPasswordResetEmail = vi.fn();
vi.mock("@/lib/mailer", () => ({ sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args) }));

const { startPasswordReset, confirmPasswordReset } = await import("./password-reset");

async function insertUser(email: string) {
  const [row] = await db.insert(users).values({ email, passwordHash: "irrelevant" }).returning();
  return row.id;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

function lastSentCode(): string {
  const call = sendPasswordResetEmail.mock.calls.at(-1);
  return call?.[1] as string;
}

describe("password reset", () => {
  it("resets the password on a correct code and lets the user log in with it", async () => {
    const email = `reset-${Math.random()}@example.com`;
    await insertUser(email);

    await startPasswordReset(email);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(email, expect.stringMatching(/^\d{6}$/));
    const code = lastSentCode();

    const ok = await confirmPasswordReset(email, code, "BrandNewPass123");
    expect(ok).toBe(true);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    const argon2 = await import("argon2");
    expect(await argon2.verify(user.passwordHash, "BrandNewPass123")).toBe(true);
  });

  it("never reveals whether an email is registered — silent no-op, no email sent", async () => {
    sendPasswordResetEmail.mockClear();
    await startPasswordReset(`unknown-${Math.random()}@example.com`);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("rejects a wrong code without changing the password", async () => {
    const email = `reset-${Math.random()}@example.com`;
    const userId = await insertUser(email);
    await startPasswordReset(email);

    const ok = await confirmPasswordReset(email, "000000", "ShouldNotApply123");
    expect(ok).toBe(false);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user.id).toBe(userId);
    expect(user.passwordHash).toBe("irrelevant");
  });

  it("rejects confirm for an email with no pending reset", async () => {
    const ok = await confirmPasswordReset(`never-requested-${Math.random()}@example.com`, "123456", "Whatever123");
    expect(ok).toBe(false);
  });

  it("burns the code after a successful reset — it cannot be replayed", async () => {
    const email = `reset-${Math.random()}@example.com`;
    await insertUser(email);
    await startPasswordReset(email);
    const code = lastSentCode();

    expect(await confirmPasswordReset(email, code, "FirstNewPass123")).toBe(true);
    expect(await confirmPasswordReset(email, code, "SecondNewPass123")).toBe(false);
  });

  it("caps repeated wrong attempts at 5", async () => {
    const email = `reset-${Math.random()}@example.com`;
    await insertUser(email);
    await startPasswordReset(email);
    const code = lastSentCode();

    for (let i = 0; i < 5; i++) {
      expect(await confirmPasswordReset(email, "999999", "Nope12345678")).toBe(false);
    }
    // The 6th attempt is denied by the attempts cap even with the right code.
    expect(await confirmPasswordReset(email, code, "TooLatePass123")).toBe(false);
  });
});
