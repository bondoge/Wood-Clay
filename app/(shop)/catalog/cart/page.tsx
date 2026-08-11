import type { Metadata } from "next";
import { auth } from "@/auth";
import { countPublished } from "@/lib/catalog";
import { getDefaultAddressForUser, getProfile } from "@/lib/account";
import CartPageClient from "./CartPageClient";
import "../catalog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Корзина — Wood&Clay",
  description: "Выбранные фарфоровые изделия Wood&Clay.",
};

export default async function CartPage() {
  const [totalProductCount, session] = await Promise.all([countPublished(), auth()]);
  const profile = session?.user?.id ? await getProfile(session.user.id) : null;
  const defaultAddress = session?.user?.id ? await getDefaultAddressForUser(session.user.id) : null;

  // Guest checkout stays guest checkout — these are only ever used as
  // pre-fill defaults for a logged-in visitor, never required.
  const checkoutDefaults = profile
    ? {
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        phone: profile.phone ?? "",
        email: profile.email,
      }
    : null;

  // name/workTime are display-only niceties CdekPvzPicker already falls
  // back gracefully without (see its summary view) — the addresses table
  // doesn't store them, same as orders.cdek_pvz_* doesn't either.
  const defaultPvz = defaultAddress
    ? { code: defaultAddress.cdekPvzCode, city: defaultAddress.cdekPvzCity, address: defaultAddress.cdekPvzAddress, name: "", workTime: "" }
    : null;

  return <CartPageClient totalProductCount={totalProductCount} checkoutDefaults={checkoutDefaults} defaultPvz={defaultPvz} />;
}
