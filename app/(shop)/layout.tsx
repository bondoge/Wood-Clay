import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

// Scoped here, not the true root layout: app/page.tsx (the home page) has
// its own header and never touches CatalogHeader/session state, and
// auth()'s cookie read forces every page under a layout that calls it into
// dynamic rendering — the home page's LCP photograph needs to stay static.
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
