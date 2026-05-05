CREATE TABLE `providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug_zh` text NOT NULL,
	`slug_en` text NOT NULL,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`rating` real DEFAULT 0,
	`logo_key` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_slug_zh_unique` ON `providers` (`slug_zh`);--> statement-breakpoint
CREATE UNIQUE INDEX `providers_slug_en_unique` ON `providers` (`slug_en`);--> statement-breakpoint
CREATE TABLE `providers_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_id` integer NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`desc` text,
	`meta_title` text,
	`meta_desc` text,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_lang_idx` ON `providers_content` (`provider_id`,`lang`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);