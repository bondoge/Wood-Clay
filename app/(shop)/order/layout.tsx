import { CartProvider } from "../catalog/CartContext";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
