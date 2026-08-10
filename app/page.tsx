import { listPublished } from "@/lib/catalog";
import { computeCategories, computeCollectionTiles, computeStyles } from "./(shop)/catalog/collections";
import { toProductView } from "./(shop)/catalog/product-view";
import HomeClient from "./HomeClient";
import "./(shop)/catalog/catalog.css";

// Same reasoning as the catalog page's own `dynamic = "force-dynamic"`:
// the collections block below mirrors the catalog's live counts/images, so
// it must never be baked into the static build (the Docker build also runs
// with placeholder DB creds — see Dockerfile — so a statically prerendered
// "/" would fail at build time).
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = (await listPublished()).map(toProductView);
  const styles = computeStyles(products);
  const categories = computeCategories(products);
  const collectionTiles = computeCollectionTiles(styles, categories, products);

  return <HomeClient collectionTiles={collectionTiles} />;
}
