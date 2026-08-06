import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultAddress, getProfile } from "@/lib/account";
import { getOrdersForUser } from "@/lib/orders";
import AccountClient from "./AccountClient";
import "../catalog/catalog.css";
import "./account.css";

export const metadata: Metadata = {
  title: "Личный кабинет — Wood&Clay",
  description: "Заказы, корзина, адреса и личные данные покупателя Wood&Clay.",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/account/login");
  }

  const profile = await getProfile(session.user.id);
  if (!profile) {
    // The session references a user that no longer exists — treat as signed out.
    redirect("/account/login");
  }

  const address = await getDefaultAddress(session.user.id);
  const orders = await getOrdersForUser(session.user.id);

  return <AccountClient profile={profile} address={address} orders={orders} />;
}
