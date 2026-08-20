DROP VIEW "public"."product_sales_summary";
--> statement-breakpoint
CREATE TABLE "product_sales_summary" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"units_sold" integer NOT NULL,
	"revenue_rub" integer NOT NULL,
	"refreshed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_sales_summary" ADD CONSTRAINT "product_sales_summary_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;