import type { Metadata } from "next";
import { auth } from "@/auth";
import { countPublished } from "@/lib/catalog";
import { getProfile } from "@/lib/account";
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

  // Guest checkout stays guest checkout — these are only ever used as
  // pre-fill defaults for a logged-in visitor, never required.
  const checkoutDefaults = profile
    ? {
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        phone: profile.phone ?? "",
        email: profile.email,
      }
    : null;

  return <CartPageClient totalProductCount={totalProductCount} checkoutDefaults={checkoutDefaults} />;
}
