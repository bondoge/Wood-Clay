import { CartProvider } from "../catalog/CartContext";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
