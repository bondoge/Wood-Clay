import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { products, styleValues } from "./schema";

export const styleSchema = z.enum(styleValues);
export type Style = z.infer<typeof styleSchema>;

// jsonb columns need an explicit shape — drizzle-zod can't infer the array
// element type of a `jsonb(...)` column on its own.
export const productSelectSchema = createSelectSchema(products, {
  wbImages: z.array(z.string()),
  ownImages: z.array(z.string()),
});
export type Product = z.infer<typeof productSelectSchema>;
