"use client";

import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import type { ProductView } from "./product-view";

// Ensures the product is in the cart before jumping to checkout — adds it
// only if it isn't there yet, so repeated clicks don't inflate the quantity
// beyond what the shopper actually chose.
export default function CheckoutNowButton({ product, className = "" }: { product: ProductView; className?: string }) {
  const { lines, addItem } = useCart();
  const router = useRouter();
  const alreadyInCart = lines.some((line) => line.product.id === product.id);

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        if (!alreadyInCart) addItem(product);
        router.push("/catalog/cart#checkout");
      }}
    >
      Перейти к оформлению <span aria-hidden="true">→</span>
    </button>
  );
}
