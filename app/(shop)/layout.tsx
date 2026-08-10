import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

// Scoped here, not the true root layout: auth()'s cookie read forces every
// page under a layout that calls it into dynamic rendering, and the static
// legal pages (oferta, privacy, ...) that sit directly on the root layout
// need to stay static. The home page (app/page.tsx) is already dynamic for
// unrelated reasons (its own catalog read) and reads its own session
// independently, with its own SessionProvider/CartProvider — see the
// comment there.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
