-- The single existing row was test data (confirmed empty otherwise) — cleared here since the new columns below are NOT NULL.
DELETE FROM "addresses";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "recipient_name";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "street";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "postal_code";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN "delivery_note";--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "cdek_pvz_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "cdek_pvz_city" text NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "cdek_pvz_address" text NOT NULL;
