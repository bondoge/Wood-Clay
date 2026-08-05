import type { Metadata } from "next";
import { countPublished } from "@/lib/catalog";
import CartPageClient from "./CartPageClient";
import "../catalog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Корзина — Wood&Clay",
  description: "Выбранные фарфоровые изделия Wood&Clay.",
};

export default async function CartPage() {
  const totalProductCount = await countPublished();
  return <CartPageClient totalProductCount={totalProductCount} />;
}
