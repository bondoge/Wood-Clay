import { CartProvider } from "../catalog/CartContext";

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
