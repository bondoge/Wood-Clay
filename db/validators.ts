import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { masters, products, styleValues, workshops } from "./schema";

export const styleSchema = z.enum(styleValues);
export type Style = z.infer<typeof styleSchema>;

export const workshopSelectSchema = createSelectSchema(workshops);
export type Workshop = z.infer<typeof workshopSelectSchema>;

export const masterSelectSchema = createSelectSchema(masters);
export type Master = z.infer<typeof masterSelectSchema>;

// JSON-mode columns need an explicit shape — drizzle-zod can't infer the
// array element type of a `text(..., { mode: "json" })` column on its own.
export const productSelectSchema = createSelectSchema(products, {
  sourceImages: z.array(z.string()),
  ownImages: z.array(z.string()).nullable(),
});
export type Product = z.infer<typeof productSelectSchema>;
