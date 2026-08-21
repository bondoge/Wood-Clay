import { CartProvider } from "../catalog/CartContext";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
