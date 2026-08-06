import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
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

// The UI only ever manages one address per user, so this reads/writes the
// most recently touched row rather than exposing a general-purpose
// addresses-by-id API — there's no client-suppliable address id anywhere,
// which also means there's no id-based cross-user access surface to guard.
export async function getDefaultAddress(userId: string) {
  const [row] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.createdAt))
    .limit(1);
  return row ?? null;
}

export async function upsertDefaultAddress(
  userId: string,
  data: { city: string; recipientName: string; street: string; postalCode: string; deliveryNote?: string },
) {
  const existing = await getDefaultAddress(userId);

  if (existing) {
    const [row] = await db.update(addresses).set(data).where(eq(addresses.id, existing.id)).returning();
    return row;
  }

  const [row] = await db
    .insert(addresses)
    .values({ ...data, userId, isDefault: true })
    .returning();
  return row;
}
