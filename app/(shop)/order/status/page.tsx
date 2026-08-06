import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderByReturnToken } from "@/lib/orders";
import { CatalogFooter, CatalogHeader } from "../../catalog/catalog-components";
import OrderStatusClient from "./OrderStatusClient";
import "../../catalog/catalog.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Статус заказа — Wood&Clay",
};

// Reads current order state from the DB and nothing else — this page never
// writes orders.status. Only the payment webhook (app/api/webhooks/yookassa)
// is allowed to do that; the customer landing here after paying is a
// courtesy read, not a confirmation of anything on its own.
export default async function OrderStatusPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) notFound();

  const order = await getOrderByReturnToken(token);
  if (!order) notFound();

  return (
    <main className="catalog-page cart-page">
      <CatalogHeader />
      <OrderStatusClient order={order} token={token} />
      <CatalogFooter />
    </main>
  );
}
