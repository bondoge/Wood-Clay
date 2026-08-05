PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wb_article` text NOT NULL,
	`wb_account` integer NOT NULL,
	`source_title` text NOT NULL,
	`source_description` text NOT NULL,
	`source_images` text NOT NULL,
	`product_type` text NOT NULL,
	`imported_at` integer NOT NULL,
	`slug` text NOT NULL,
	`price_rub` integer NOT NULL,
	`stock` integer NOT NULL,
	`style` text DEFAULT 'author' NOT NULL,
	`style_confidence` real,
	`style_reviewed` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`is_flagship` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`own_images` text,
	`own_title` text,
	`own_story` text,
	`workshop_id` integer,
	`master_id` integer,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`master_id`) REFERENCES `masters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "wb_article", "wb_account", "source_title", "source_description", "source_images", "product_type", "imported_at", "slug", "price_rub", "stock", "style", "style_confidence", "style_reviewed", "published", "is_flagship", "sort_order", "own_images", "own_title", "own_story", "workshop_id", "master_id") SELECT "id", "wb_article", "wb_account", "source_title", "source_description", "source_images", "product_type", "imported_at", "slug", "price_rub", "stock", "style", "style_confidence", "style_reviewed", "published", "is_flagship", "sort_order", "own_images", "own_title", "own_story", "workshop_id", "master_id" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_wb_account_article_unique` ON `products` (`wb_account`,`wb_article`);