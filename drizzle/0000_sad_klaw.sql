CREATE TABLE `masters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`workshop_id` integer NOT NULL,
	`bio` text NOT NULL,
	`photo_alt` text,
	FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `masters_slug_unique` ON `masters` (`slug`);--> statement-breakpoint
CREATE TABLE `products` (
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
	`style` text DEFAULT 'other' NOT NULL,
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
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_wb_account_article_unique` ON `products` (`wb_account`,`wb_article`);--> statement-breakpoint
CREATE TABLE `workshops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`style` text NOT NULL,
	`location` text NOT NULL,
	`founded_year` integer,
	`story` text NOT NULL,
	`photo_alt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workshops_slug_unique` ON `workshops` (`slug`);