import { describe, expect, it } from "vitest";
import { productSelectSchema } from "./validators";

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const validProduct = {
  id: 1,
  wbArticle: "123456789",
  wbAccount: 1,
  wbTitle: "Ёлочная игрушка Гжель",
  wbDescription: "Ёлочная игрушка, роспись гжель.",
  wbImages: ["/import/123456789/1.jpg"],
  productType: "Ёлочная игрушка",
  importedAt: new Date(),
  slug: "elochnaya-igrushka-gzhel",
  priceRub: 2500,
  stock: 12,
  style: "gzhel" as const,
  published: true,
  ownImages: ["/import/123456789/1.jpg"],
  ownTitle: "Ёлочная игрушка Гжель",
  ownDescription: "Ёлочная игрушка, роспись гжель.",
};

describe("productSelectSchema", () => {
  it("accepts a valid product", () => {
    expect(productSelectSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rejects an invalid style enum value", () => {
    expect(productSelectSchema.safeParse({ ...validProduct, style: "palekh" }).success).toBe(
      false,
    );
  });

  it("rejects a non-array wbImages", () => {
    expect(
      productSelectSchema.safeParse({ ...validProduct, wbImages: "not-an-array" }).success,
    ).toBe(false);
  });

  it("rejects a missing priceRub", () => {
    expect(productSelectSchema.safeParse(omit(validProduct, "priceRub")).success).toBe(false);
  });
});
