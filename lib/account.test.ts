import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { addresses, users } from "@/db/schema";

vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const { getProfile, updateProfile, getDefaultAddress, upsertDefaultAddress } = await import("./account");

async function insertUser() {
  const [row] = await db
    .insert(users)
    .values({ email: `user-${Math.random()}@example.com`, passwordHash: "irrelevant" })
    .returning();
  return row.id;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("account access control — user A and user B never see each other's data", () => {
  it("getProfile only ever returns the requested user's own row", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    await updateProfile(userA, { firstName: "Алиса" });
    await updateProfile(userB, { firstName: "Борис" });

    expect((await getProfile(userA))?.firstName).toBe("Алиса");
    expect((await getProfile(userB))?.firstName).toBe("Борис");
  });

  it("updateProfile for user B never touches user A's row", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    await updateProfile(userA, { firstName: "Алиса" });

    await updateProfile(userB, { firstName: "Злоумышленник" });

    expect((await getProfile(userA))?.firstName).toBe("Алиса");
  });

  it("each user's default address is isolated from the other's", async () => {
    const userA = await insertUser();
    const userB = await insertUser();

    await upsertDefaultAddress(userA, { city: "Москва", recipientName: "A", street: "Улица А" });
    await upsertDefaultAddress(userB, { city: "Казань", recipientName: "B", street: "Улица Б" });

    expect((await getDefaultAddress(userA))?.city).toBe("Москва");
    expect((await getDefaultAddress(userB))?.city).toBe("Казань");

    // Updating B's address must never affect A's row.
    await upsertDefaultAddress(userB, { city: "Новый город", recipientName: "B2", street: "Улица В" });
    expect((await getDefaultAddress(userA))?.city).toBe("Москва");
  });

  it("an address row is always scoped to the user who owns it, never surfaced for another", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const addressA = await upsertDefaultAddress(userA, { city: "Сочи", recipientName: "A", street: "Улица" });

    const rawRow = await db.select().from(addresses).where(eq(addresses.id, addressA.id));
    expect(rawRow[0].userId).toBe(userA);
    expect(rawRow[0].userId).not.toBe(userB);

    // User B has no address yet — getDefaultAddress(userB) must never
    // surface user A's row just because it's the only one in the table.
    expect(await getDefaultAddress(userB)).toBeNull();
  });
});
