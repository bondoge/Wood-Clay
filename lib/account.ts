import { and, desc, eq } from "drizzle-orm";
import { db, type Transaction } from "@/db/client";
import { addresses, users } from "@/db/schema";

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      phoneVerifiedAt: users.phoneVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user ?? null;
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string },
) {
  const [row] = await db
    .update(users)
    .set({
      ...data,
      // A changed phone number is unverified until proven otherwise —
      // reset regardless of whether the new value differs from the old one.
      ...(data.phone !== undefined ? { phoneVerifiedAt: null } : {}),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone });
  return row;
}

// Saved СДЭК pickup points (Phase 8). A user can have several; isDefault
// marks the one checkout pre-fills. id-scoped mutations below always
// re-check userId ownership in the same WHERE clause rather than trusting
// the caller — a client-suppliable address id is real cross-user access
// surface here, unlike the old single-row-per-user design this replaced.
export type PvzInput = { cdekPvzCode: string; cdekPvzCity: string; cdekPvzAddress: string };

export async function getAddressesForUser(userId: string) {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function getDefaultAddressForUser(userId: string) {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
    .limit(1);
  return row ?? null;
}

/**
 * Upserts by (userId, cdekPvzCode) so re-picking the same point never
 * duplicates. setDefault: true always forces default (clearing every other
 * row for this user in the same transaction, first); omitted only defaults
 * a brand-new first address — a later different pick stays non-default
 * unless the caller explicitly asks (checkout's "Сделать это основным
 * адресом?" confirmation).
 */
export async function saveAddress(userId: string, pvz: PvzInput, opts: { setDefault?: boolean } = {}) {
  return db.transaction(async (tx: Transaction) => {
    const [existing] = await tx
      .select()
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.cdekPvzCode, pvz.cdekPvzCode)));

    const [anyAddress] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .limit(1);
    const makeDefault = opts.setDefault ?? !anyAddress;

    if (makeDefault) {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }

    if (existing) {
      const [row] = await tx
        .update(addresses)
        .set({ ...pvz, isDefault: makeDefault || existing.isDefault })
        .where(eq(addresses.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await tx
      .insert(addresses)
      .values({ ...pvz, userId, isDefault: makeDefault })
      .returning();
    return row;
  });
}

export async function setDefaultAddress(userId: string, addressId: number): Promise<boolean> {
  return db.transaction(async (tx: Transaction) => {
    const [row] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
    if (!row) return false;

    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, addressId));
    return true;
  });
}

export async function deleteAddress(userId: string, addressId: number): Promise<boolean> {
  return db.transaction(async (tx: Transaction) => {
    const [deleted] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
    if (!deleted) return false;

    if (deleted.isDefault) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1);
      if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
    }
    return true;
  });
}
