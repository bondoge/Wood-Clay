import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";
import "../catalog.css";

export const metadata: Metadata = {
  title: "Корзина — Wood&Clay",
  description: "Выбранные фарфоровые изделия Wood&Clay.",
};

export default function CartPage() {
  return <CartPageClient />;
}
