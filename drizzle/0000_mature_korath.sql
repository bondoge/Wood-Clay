CREATE TABLE "masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"workshop_id" integer NOT NULL,
	"bio" text NOT NULL,
	"photo_alt" text,
	CONSTRAINT "masters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"wb_article" text NOT NULL,
	"wb_account" integer NOT NULL,
	"source_title" text NOT NULL,
	"source_description" text NOT NULL,
	"source_images" jsonb NOT NULL,
	"product_type" text NOT NULL,
	"imported_at" timestamp NOT NULL,
	"slug" text NOT NULL,
	"price_rub" integer NOT NULL,
	"stock" integer NOT NULL,
	"style" text DEFAULT 'author' NOT NULL,
	"style_confidence" real,
	"style_reviewed" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"is_flagship" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"own_images" jsonb,
	"own_title" text,
	"own_story" text,
	"workshop_id" integer,
	"master_id" integer,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"style" text NOT NULL,
	"location" text NOT NULL,
	"founded_year" integer,
	"story" text NOT NULL,
	"photo_alt" text,
	CONSTRAINT "workshops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "masters" ADD CONSTRAINT "masters_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_master_id_masters_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."masters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "products_wb_account_article_unique" ON "products" USING btree ("wb_account","wb_article");