ALTER TABLE "orders" ADD COLUMN "yookassa_payment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "return_token" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_yookassa_payment_id_unique" UNIQUE("yookassa_payment_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_return_token_unique" UNIQUE("return_token");