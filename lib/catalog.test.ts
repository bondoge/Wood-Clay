import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { masters, products, workshops } from "@/db/schema";

// Everything the mock needs is self-contained inside the factory (vitest
// hoists vi.mock calls above regular imports, so outer-scope variables
// can't be relied on here) — an in-memory pglite (embedded Postgres, WASM)
// DB standing in for the real catalogue, wired through the exact same
// schema, so the Postgres-dialect migrations in ./drizzle actually apply.
vi.mock("@/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});

const { listPublished, byStyle, flagships, bySlug } = await import("./catalog");

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [workshop] = await db
    .insert(workshops)
    .values({
      slug: "gzhel-atelye",
      name: "Мастерская «Гжельский фарфор»",
      kind: "own",
      style: "gzhel",
      location: "посёлок Гжель",
      story: "Собственная мастерская дома.",
    })
    .returning();

  const [master] = await db
    .insert(masters)
    .values({
      slug: "irina-k",
      name: "Ирина К.",
      workshopId: workshop.id,
      bio: "Расписывает фарфор больше пятнадцати лет.",
    })
    .returning();

  const baseProduct = {
    sourceImages: [] as string[],
    productType: "Ёлочная игрушка",
    importedAt: new Date(),
    priceRub: 1000,
    stock: 5,
    workshopId: workshop.id,
    masterId: master.id,
  };

  await db.insert(products).values([
    {
      ...baseProduct,
      wbArticle: "1",
      wbAccount: 1,
      sourceTitle: "Игрушка гжель",
      sourceDescription: "Описание",
      slug: "gzhel-published",
      style: "gzhel",
      published: true,
      isFlagship: false,
      sortOrder: 2,
    },
    {
      ...baseProduct,
      wbArticle: "2",
      wbAccount: 1,
      sourceTitle: "Игрушка хохлома, флагман",
      sourceDescription: "Описание",
      slug: "khokhloma-flagship",
      style: "khokhloma",
      published: true,
      isFlagship: true,
      sortOrder: 1,
    },
    {
      ...baseProduct,
      wbArticle: "3",
      wbAccount: 1,
      sourceTitle: "Неопубликованная игрушка",
      sourceDescription: "Описание",
      slug: "not-published",
      style: "gzhel",
      published: false,
      isFlagship: false,
    },
    {
      ...baseProduct,
      wbArticle: "4",
      wbAccount: 2,
      // Deliberately malformed: an out-of-enum style value. SQLite's own
      // NOT NULL/UNIQUE constraints are enforced at insert time, but the
      // enum itself is only a TypeScript/zod-level constraint — nothing
      // stops a bad value from landing in the column (e.g. a WB API quirk,
      // or a row written before a style was assigned). Cast bypasses the
      // compile-time check on purpose, to simulate exactly that.
      sourceTitle: "Битая строка",
      sourceDescription: "Описание",
      slug: "malformed-row",
      style: "not-a-real-style" as unknown as (typeof products.$inferInsert)["style"],
      published: true,
    },
  ]);
});

describe("listPublished", () => {
  it("excludes unpublished rows", async () => {
    const rows = await listPublished();
    expect(rows.some((p) => p.slug === "not-published")).toBe(false);
  });

  it("skips a malformed row instead of throwing, and still returns the valid ones", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = await listPublished();
    expect(rows.some((p) => p.slug === "malformed-row")).toBe(false);
    expect(rows.some((p) => p.slug === "gzhel-published")).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("byStyle", () => {
  it("filters by style and published", async () => {
    const rows = await byStyle("khokhloma");
    expect(rows.map((p) => p.slug)).toContain("khokhloma-flagship");
    expect(rows.every((p) => p.style === "khokhloma")).toBe(true);
  });
});

describe("flagships", () => {
  it("returns only is_flagship rows, ordered by sortOrder", async () => {
    const rows = await flagships();
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe("khokhloma-flagship");
  });
});

describe("bySlug", () => {
  it("returns the published row", async () => {
    const row = await bySlug("gzhel-published");
    expect(row?.slug).toBe("gzhel-published");
  });

  it("returns null for an unpublished slug", async () => {
    expect(await bySlug("not-published")).toBeNull();
  });

  it("returns null for a missing slug", async () => {
    expect(await bySlug("does-not-exist")).toBeNull();
  });

  it("throws on a malformed row instead of silently skipping it", async () => {
    await expect(bySlug("malformed-row")).rejects.toThrow();
  });
});
