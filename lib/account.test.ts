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

const { getProfile, updateProfile, getDefaultAddressForUser, saveAddress, setDefaultAddress, deleteAddress } =
  await import("./account");

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

  it("each user's default pickup point is isolated from the other's", async () => {
    const userA = await insertUser();
    const userB = await insertUser();

    await saveAddress(userA, { cdekPvzCode: "MSK1", cdekPvzCity: "Москва", cdekPvzAddress: "Улица А" });
    await saveAddress(userB, { cdekPvzCode: "KZN1", cdekPvzCity: "Казань", cdekPvzAddress: "Улица Б" });

    expect((await getDefaultAddressForUser(userA))?.cdekPvzCity).toBe("Москва");
    expect((await getDefaultAddressForUser(userB))?.cdekPvzCity).toBe("Казань");

    // Adding and defaulting a second address for B must never affect A's.
    await saveAddress(userB, { cdekPvzCode: "SPB1", cdekPvzCity: "Санкт-Петербург", cdekPvzAddress: "Улица В" }, { setDefault: true });
    expect((await getDefaultAddressForUser(userA))?.cdekPvzCity).toBe("Москва");
  });

  it("an address row is always scoped to the user who owns it, never surfaced for another", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const addressA = await saveAddress(userA, { cdekPvzCode: "SOCHI1", cdekPvzCity: "Сочи", cdekPvzAddress: "Улица" });

    const rawRow = await db.select().from(addresses).where(eq(addresses.id, addressA.id));
    expect(rawRow[0].userId).toBe(userA);
    expect(rawRow[0].userId).not.toBe(userB);

    // User B has no address yet — getDefaultAddressForUser(userB) must
    // never surface user A's row just because it's the only one in the table.
    expect(await getDefaultAddressForUser(userB)).toBeNull();
  });

  it("setDefaultAddress for user B can never mark user A's address as default", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const addressA = await saveAddress(userA, { cdekPvzCode: "A1", cdekPvzCity: "Москва", cdekPvzAddress: "Улица" });

    expect(await setDefaultAddress(userB, addressA.id)).toBe(false);
    expect((await getDefaultAddressForUser(userA))?.id).toBe(addressA.id);
  });

  it("deleteAddress for user B can never delete user A's address", async () => {
    const userA = await insertUser();
    const userB = await insertUser();
    const addressA = await saveAddress(userA, { cdekPvzCode: "A1", cdekPvzCity: "Москва", cdekPvzAddress: "Улица" });

    expect(await deleteAddress(userB, addressA.id)).toBe(false);
    expect((await getDefaultAddressForUser(userA))?.id).toBe(addressA.id);
  });

  it("saveAddress upserts by (userId, cdekPvzCode) instead of duplicating", async () => {
    const userA = await insertUser();
    await saveAddress(userA, { cdekPvzCode: "A1", cdekPvzCity: "Москва", cdekPvzAddress: "Улица старая" });
    await saveAddress(userA, { cdekPvzCode: "A1", cdekPvzCity: "Москва", cdekPvzAddress: "Улица новая" });

    const rows = await db.select().from(addresses).where(eq(addresses.userId, userA));
    expect(rows).toHaveLength(1);
    expect(rows[0].cdekPvzAddress).toBe("Улица новая");
  });
});
