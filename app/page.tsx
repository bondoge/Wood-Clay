import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { listPublished } from "@/lib/catalog";
import { CartProvider } from "./(shop)/catalog/CartContext";
import { computeCategories, computeCollectionTiles, computeStyles } from "./(shop)/catalog/collections";
import { toProductView } from "./(shop)/catalog/product-view";
import HomeClient from "./HomeClient";
import "./(shop)/catalog/catalog.css";

// Same reasoning as the catalog page's own `dynamic = "force-dynamic"`:
// the collections block below mirrors the catalog's live counts/images, so
// it must never be baked into the static build (the Docker build also runs
// with placeholder DB creds — see Dockerfile — so a statically prerendered
// "/" would fail at build time). Since "/" already pays that cost, reading
// the session here too (for the header's account button) is free — unlike
// app/(shop)/layout.tsx, which deliberately keeps auth() out of its tree so
// the truly static legal pages under it aren't forced dynamic.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, products] = await Promise.all([
    auth(),
    listPublished().then((rows) => rows.map(toProductView)),
  ]);
  const styles = computeStyles(products);
  const categories = computeCategories(products);
  const collectionTiles = computeCollectionTiles(styles, categories, products);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        <HomeClient collectionTiles={collectionTiles} />
      </CartProvider>
    </SessionProvider>
  );
}
