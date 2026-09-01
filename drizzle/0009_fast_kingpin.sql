CREATE TABLE `salesforce_workbook_aggregates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importRunId` int NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`sourceTerritoryLabel` varchar(128) NOT NULL,
	`periodYear` int NOT NULL,
	`periodMonth` int NOT NULL,
	`statusLabel` varchar(128) NOT NULL,
	`speciesLabel` varchar(128) NOT NULL,
	`cityLabel` varchar(128) NOT NULL,
	`currencyCode` enum('CAD','USD') NOT NULL,
	`recordCount` int NOT NULL DEFAULT 0,
	`invoiceValueCount` int NOT NULL DEFAULT 0,
	`invoicePreTaxAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `salesforce_workbook_aggregates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesforce_workbook_import_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`triggerType` enum('scheduled','manual') NOT NULL,
	`status` enum('running','complete','failed','skipped') NOT NULL,
	`sourceFingerprint` varchar(64),
	`sourceRowCount` int NOT NULL DEFAULT 0,
	`rowsProcessed` int NOT NULL DEFAULT 0,
	`rowsRejected` int NOT NULL DEFAULT 0,
	`blankIdCount` int NOT NULL DEFAULT 0,
	`duplicateIdCount` int NOT NULL DEFAULT 0,
	`maxSourceModifiedAt` varchar(40),
	`headerJson` json,
	`territoryCountsJson` longtext,
	`statusCountsJson` longtext,
	`unknownTerritoriesJson` longtext,
	`validationWarningsJson` longtext,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`activatedAt` timestamp,
	CONSTRAINT `salesforce_workbook_import_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesforce_workbook_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workbookId` varchar(128) NOT NULL,
	`workbookTitle` varchar(255) NOT NULL,
	`sheetName` varchar(128) NOT NULL,
	`sourceRange` varchar(128) NOT NULL,
	`status` enum('ready','paused','disabled') NOT NULL DEFAULT 'ready',
	`scheduleCronTaskUid` varchar(65),
	`scheduleCron` varchar(64),
	`lastSuccessfulRunId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salesforce_workbook_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `sf_workbook_sources_workbook_id_unique` UNIQUE(`workbookId`)
);
--> statement-breakpoint
CREATE INDEX `sf_workbook_aggregates_run_territory_period_idx` ON `salesforce_workbook_aggregates` (`importRunId`,`territoryId`,`periodYear`,`periodMonth`);--> statement-breakpoint
CREATE INDEX `sf_workbook_runs_source_status_started_idx` ON `salesforce_workbook_import_runs` (`sourceId`,`status`,`startedAt`);--> statement-breakpoint
CREATE INDEX `sf_workbook_runs_fingerprint_idx` ON `salesforce_workbook_import_runs` (`sourceId`,`sourceFingerprint`);--> statement-breakpoint
CREATE INDEX `sf_workbook_sources_schedule_task_idx` ON `salesforce_workbook_sources` (`scheduleCronTaskUid`);
