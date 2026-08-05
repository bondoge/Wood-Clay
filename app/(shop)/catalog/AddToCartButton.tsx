"use client";

import { useCart } from "./CartContext";
import type { ProductView } from "./product-view";

export default function AddToCartButton({
  product,
  className = "",
  shortLabel = false,
}: {
  product: ProductView;
  className?: string;
  shortLabel?: boolean;
}) {
  const { addItem, lines } = useCart();
  const quantity = lines.find((line) => line.product.id === product.id)?.quantity ?? 0;

  return (
    <button className={className} type="button" onClick={() => addItem(product)}>
      {quantity > 0
        ? `В корзине · ${quantity}`
        : shortLabel
          ? "В корзину"
          : "Добавить в корзину"}
      <span aria-hidden="true">+</span>
    </button>
  );
}
