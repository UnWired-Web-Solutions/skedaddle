ALTER TABLE `gbp_territory_monthly` MODIFY COLUMN `value` int;--> statement-breakpoint
ALTER TABLE `gbp_territory_monthly` MODIFY COLUMN `value` int NULL;
ALTER TABLE `gbp_territory_monthly` MODIFY COLUMN `coverageStatus` enum('complete','partial','unavailable') NOT NULL;
