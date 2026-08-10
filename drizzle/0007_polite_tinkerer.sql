ALTER TABLE "masters" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workshops" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "masters" CASCADE;--> statement-breakpoint
DROP TABLE "workshops" CASCADE;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "wb_title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "wb_description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "wb_images" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "own_images" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "own_title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "own_description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "source_title";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "source_description";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "source_images";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "style_reviewed";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_flagship";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "own_story";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "workshop_id";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "master_id";