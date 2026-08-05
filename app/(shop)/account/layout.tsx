import { CartProvider } from "../catalog/CartContext";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
