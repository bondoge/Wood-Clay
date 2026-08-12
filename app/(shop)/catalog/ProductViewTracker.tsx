"use client";

import { useEffect } from "react";
import { trackProductView } from "@/lib/ecommerce";
import type { ProductView } from "./product-view";

export default function ProductViewTracker({ product }: { product: ProductView }) {
  useEffect(() => {
    trackProductView(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
