import { describe, expect, it } from "vitest";
import { masterSelectSchema, productSelectSchema, workshopSelectSchema } from "./validators";

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const validWorkshop = {
  id: 1,
  slug: "gzhel-atelye",
  name: "Мастерская «Гжельский фарфор»",
  kind: "own" as const,
  style: "gzhel" as const,
  location: "посёлок Гжель",
  foundedYear: 1998,
  story: "Собственная мастерская дома, работает с 1998 года.",
  photoAlt: null,
};

const validMaster = {
  id: 1,
  slug: "irina-k",
  name: "Ирина К.",
  workshopId: 1,
  bio: "Расписывает фарфор больше пятнадцати лет.",
  photoAlt: null,
};

const validProduct = {
  id: 1,
  wbArticle: "123456789",
  wbAccount: 1,
  sourceTitle: "Ёлочная игрушка Гжель",
  sourceDescription: "Ёлочная игрушка, роспись гжель.",
  sourceImages: ["/import/123456789/1.jpg"],
  productType: "Ёлочная игрушка",
  importedAt: new Date(),
  slug: "elochnaya-igrushka-gzhel",
  priceRub: 2500,
  stock: 12,
  style: "gzhel" as const,
  styleConfidence: 0.92,
  styleReviewed: true,
  published: true,
  isFlagship: false,
  sortOrder: 0,
  ownImages: null,
  ownTitle: null,
  ownStory: null,
  workshopId: 1,
  masterId: 1,
};

describe("workshopSelectSchema", () => {
  it("accepts a valid workshop", () => {
    expect(workshopSelectSchema.safeParse(validWorkshop).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    expect(workshopSelectSchema.safeParse(omit(validWorkshop, "story")).success).toBe(false);
  });

  it("rejects an invalid kind enum value", () => {
    expect(workshopSelectSchema.safeParse({ ...validWorkshop, kind: "franchise" }).success).toBe(
      false,
    );
  });
});

describe("masterSelectSchema", () => {
  it("accepts a valid master", () => {
    expect(masterSelectSchema.safeParse(validMaster).success).toBe(true);
  });

  it("rejects a missing workshopId", () => {
    expect(masterSelectSchema.safeParse(omit(validMaster, "workshopId")).success).toBe(false);
  });
});

describe("productSelectSchema", () => {
  it("accepts a valid product", () => {
    expect(productSelectSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rejects an invalid style enum value", () => {
    expect(productSelectSchema.safeParse({ ...validProduct, style: "palekh" }).success).toBe(
      false,
    );
  });

  it("rejects a non-array sourceImages", () => {
    expect(
      productSelectSchema.safeParse({ ...validProduct, sourceImages: "not-an-array" }).success,
    ).toBe(false);
  });

  it("rejects a missing priceRub", () => {
    expect(productSelectSchema.safeParse(omit(validProduct, "priceRub")).success).toBe(false);
  });
});
