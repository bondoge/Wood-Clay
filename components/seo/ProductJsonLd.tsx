import type { Product } from "@/db/validators";

const BASE_URL = "https://woodclay.ru";

// UN/CEFACT common codes, the convention schema.org's own examples use for
// QuantitativeValue.unitCode.
const CENTIMETER_UNIT_CODE = "CMT";
const GRAM_UNIT_CODE = "GRM";

/**
 * Product + Offer markup for a single product page. Every field reads
 * straight off the DB row — nothing hardcoded except `material` (see
 * below) and the fixed RUB currency (the schema has no separate currency
 * column; every price in this catalogue is already RUB).
 */
export function ProductJsonLd({ product }: { product: Product }) {
  const url = `${BASE_URL}/catalog/${product.slug}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.ownTitle,
    // Must equal the visible description — both this and the product page
    // read the same own_description column (db/schema.ts), so they can't
    // drift apart.
    description: product.ownDescription,
    image: product.ownImages,
    sku: product.wbArticle,
    // No material column exists in the schema — "Фарфор" is the same
    // literal the product page itself renders (hardcoded there too, see
    // app/(shop)/catalog/[slug]/page.tsx). Every product in this catalogue
    // is porcelain today, so this isn't incorrect, just not sourced from a
    // per-product field.
    material: "Фарфор",
    ...(product.lengthCm != null && {
      depth: { "@type": "QuantitativeValue", value: product.lengthCm, unitCode: CENTIMETER_UNIT_CODE },
    }),
    ...(product.widthCm != null && {
      width: { "@type": "QuantitativeValue", value: product.widthCm, unitCode: CENTIMETER_UNIT_CODE },
    }),
    ...(product.heightCm != null && {
      height: { "@type": "QuantitativeValue", value: product.heightCm, unitCode: CENTIMETER_UNIT_CODE },
    }),
    ...(product.weightG != null && {
      weight: { "@type": "QuantitativeValue", value: product.weightG, unitCode: GRAM_UNIT_CODE },
    }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "RUB",
      price: product.priceRub,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
