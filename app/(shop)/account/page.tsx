import type { Metadata } from "next";
import AccountClient from "./AccountClient";
import "../catalog/catalog.css";
import "./account.css";

export const metadata: Metadata = {
  title: "Личный кабинет — Wood&Clay",
  description: "Заказы, корзина, адреса и личные данные покупателя Wood&Clay.",
};

export default function AccountPage() {
  return <AccountClient />;
}
