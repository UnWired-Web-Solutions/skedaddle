CREATE TABLE IF NOT EXISTS `ga4_territory_monthly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`sessions` int NOT NULL DEFAULT 0,
	`activeUsers` int NOT NULL DEFAULT 0,
	`priorityPageSessions` int NOT NULL DEFAULT 0,
	`propertiesExpected` int NOT NULL DEFAULT 0,
	`propertiesSucceeded` int NOT NULL DEFAULT 0,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ga4_territory_monthly_id` PRIMARY KEY(`id`),
	UNIQUE KEY `ga4_territory_monthly_period_idx` (`territoryId`,`year`,`month`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ga4_territory_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`pagePath` text NOT NULL,
	`pagePathHash` varchar(64) NOT NULL,
	`pageType` varchar(32) NOT NULL,
	`sessions` int NOT NULL DEFAULT 0,
	`activeUsers` int NOT NULL DEFAULT 0,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ga4_territory_pages_id` PRIMARY KEY(`id`),
	KEY `ga4_territory_pages_period_type_idx` (`territoryId`,`year`,`month`,`pageType`),
	UNIQUE KEY `ga4_territory_pages_period_path_idx` (`territoryId`,`year`,`month`,`pagePathHash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ga4_import_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`status` enum('complete','partial','failed') NOT NULL,
	`propertiesExpected` int NOT NULL DEFAULT 0,
	`propertiesSucceeded` int NOT NULL DEFAULT 0,
	`failedPropertiesJson` text,
	`errorMessage` text,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ga4_import_runs_id` PRIMARY KEY(`id`),
	KEY `ga4_import_runs_territory_period_idx` (`territoryId`,`year`,`month`,`importedAt`)
);
